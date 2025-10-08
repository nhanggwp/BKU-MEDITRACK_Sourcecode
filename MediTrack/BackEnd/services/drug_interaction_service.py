

import pandas as pd
from typing import List, Dict, Any
from config.settings import Settings
from services.supabase_service import SupabaseService
from services.ai_service import AIService
from collections import defaultdict

import google.generativeai as genai

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DrugInteractionService:
    def __init__(self):
        self.settings = Settings()
        self.supabase = SupabaseService()
        self.ai_service = AIService()

    async def check_drug_interactions(self, medications: List[str], user_id: str = None,  medical_history: Dict[str, Any] = None) -> Dict[str, Any]:
        # If user_id provided, fetch saved medications and merge with scanned list
        saved_meds = []
        try:
            if user_id:
                saved_meds = await self.supabase.get_user_saved_medications(user_id)
        except Exception as e:
            logger.warning(f"Unable to fetch saved medications for user {user_id}: {e}")

        # Merge meds: keep the order of scanned medications first, then append saved meds not already present
        merged_meds = []
        seen = set()
        for m in (medications or []):
            nm = m.strip()
            key = nm.lower()
            if key and key not in seen:
                seen.add(key)
                merged_meds.append(nm)

        for m in (saved_meds or []):
            nm = m.strip()
            key = nm.lower()
            if key and key not in seen:
                seen.add(key)
                merged_meds.append(nm)

        if len(merged_meds) < 2:
            return {
                "interactions": [],
                "risk_level": "low",
                "summary": "No interactions possible with fewer than two medications",
                "medications_checked": merged_meds,
                "medications_saved": saved_meds
            }
        interactions = await self._find_interactions(merged_meds)
        risk_level = self._assess_risk_level(interactions)
        summary = await self.summarize_interactions_with_gemini(interactions, medical_history)


        for i in interactions:
            i.pop("interaction_type", None)

        return {
            "interactions": interactions,
            "risk_level": risk_level,
            "summary": summary,
            "medications_checked": merged_meds,
            "medications_saved": saved_meds,
            "check_timestamp": pd.Timestamp.now().isoformat(),
            "source": "supabase_database"
        }
    




    async def _find_interactions(self, medications: List[str]) -> List[Dict[str, Any]]:
        interactions = []
        grouped_interactions = defaultdict(set)  # key -> set of descriptions
        normalized_meds = [self._normalize_drug_name(med) for med in medications]
        logger.info(f"Normalized medications: {normalized_meds}")

        for i in range(len(normalized_meds)):
            for j in range(i + 1, len(normalized_meds)):
                drug1 = normalized_meds[i]
                drug2 = normalized_meds[j]
                logger.info(f"Checking interactions for pair: {drug1} - {drug2}")

                try:
                    response = self.supabase.client.table("drug_interactions") \
                        .select("*") \
                        .or_(
                            f"and(drug1_name.eq.{drug1},drug2_name.eq.{drug2}),"
                            f"and(drug1_name.eq.{drug2},drug2_name.eq.{drug1})"
                        ) \
                        .execute()

                    supabase_interactions = response.data or []
                    logger.info(f"Found {len(supabase_interactions)} interactions for {drug1} - {drug2}")

                    if not supabase_interactions:
                        continue

                    max_score = max(i.get("frequency_score", 0) for i in supabase_interactions)
                    top_interactions = [i for i in supabase_interactions if i.get("frequency_score", 0) == max_score]

                    for interaction in top_interactions:
                        key = (
                            medications[i],
                            medications[j],
                            interaction.get("interaction_type", "Unknown"),
                            interaction.get("severity", "minor"),
                            interaction.get("frequency_score", 0),
                            interaction.get("side_effect", "Unknown")
                        )
                        description = interaction.get("description", "Potential interaction detected")
                        grouped_interactions[key].add(description)

                except Exception as e:
                    logger.error(f"Error querying interactions for {drug1} - {drug2}: {e}")
                    continue

        # Biến đổi grouped_interactions thành danh sách kết quả cuối
        for key, descriptions in grouped_interactions.items():
            drug1, drug2, interaction_type, severity, frequency_score, side_effect = key

            # Trích side effect từ mỗi description
            side_effects = set()
            for desc in descriptions:
                # Tìm phần sau dấu ":" cuối cùng
                if ":" in desc:
                    side_effects.add(desc.split(":")[-1].strip())
                else:
                    side_effects.add(desc.strip())

            # Gom lại mô tả duy nhất
            combined_description = f"Tương tác tiềm ẩn giữa {drug1} và {drug2}. " \
                                f"Các tác dụng phụ liên quan: {', '.join(sorted(side_effects))}"

            interactions.append({
                "drug1_name": drug1,
                "drug2_name": drug2,
                "interaction_type": interaction_type,
                "severity": severity,
                "description": combined_description,
                "frequency_score": frequency_score
            })

        logger.info(f"Total interactions found: {len(interactions)}")
        return interactions

    
    def _normalize_drug_name(self, drug_name: str) -> str:
        normalized = drug_name.lower().strip()
        normalized = normalized.split()[0] if ' ' in normalized else normalized
        suffixes = ['mg', 'mcg', 'ml', 'tablets', 'capsules', 'er', 'xl', 'sr']
        for suffix in suffixes:
            if normalized.endswith(suffix):
                normalized = normalized[:-len(suffix)].strip()
        return normalized

    def _assess_risk_level(self, interactions: List[Dict[str, Any]]) -> str:
        if not interactions:
            return "minor"

        severity_scores = {"minor": 1, "moderate": 2, "major": 3}
        max_severity = max([severity_scores.get(i.get("severity", "minor"), 1) for i in interactions])

        if max_severity >= 3:
            return "major"
        elif max_severity >= 2:
            return "moderate"
        else:
            return "minor"

    def _create_interaction_summary(self, interactions: List[Dict[str, Any]], medications: List[str]) -> str:
        if not interactions:
            return f"No significant interactions found among {len(medications)} medications."

        high_risk = [i for i in interactions if i.get("severity") == "major"]
        moderate_risk = [i for i in interactions if i.get("severity") == "moderate"]

        summary = f"Found {len(interactions)} interaction(s) among {len(medications)} medications. "

        if high_risk:
            summary += f"{len(high_risk)} major interaction(s) require immediate medical attention. "

        if moderate_risk:
            summary += f"{len(moderate_risk)} moderate interaction(s) should be discussed with your doctor."

        return summary

    async def summarize_interactions_with_gemini(
        self,
        interactions: List[Dict[str, Any]],
        medical_history: Dict[str, Any]
    ) -> str:
        if not interactions:
            return "Không phát hiện tương tác thuốc nào giữa các loại thuốc bạn đã nhập."

        prompt = """Bạn là một bác sĩ dinh dưỡng và dược sĩ thân thiện. 
    Hãy đọc danh sách các tương tác thuốc và tiền sử bệnh của bệnh nhân dưới đây để tạo một đoạn tóm tắt ngắn gọn (tối đa 4-5 câu) cho bệnh nhân không chuyên. 
    Trong đoạn tóm tắt, bạn phải:
    1. Giải thích tổng quát mức độ nguy hiểm và những ảnh hưởng có thể gặp từ các tương tác thuốc.
    2. Đưa ra hướng dẫn ăn uống hoặc thói quen sinh hoạt giúp bệnh nhân hồi phục nhanh hơn hoặc khỏe mạnh hơn khi dùng các thuốc này.
    3. Không liệt kê từng tương tác riêng lẻ, mà chỉ tổng hợp và nhấn mạnh các điểm quan trọng nhất.

    Dữ liệu gồm:

    **Tương tác thuốc**:
    """
        for i in interactions:
            prompt += (
                f"- {i['drug1_name']} và {i['drug2_name']}: "
                f"{i['interaction_type']} (mức độ: {i['severity']}). "
                f"Mô tả: {i['description']}\n"
            )

        # Xử lý medical_history mới
        mh_data = medical_history.get('medical_history', [])
        allergies_data = medical_history.get('allergies', [])

        if mh_data or allergies_data:
            prompt += "\n**Tiền sử bệnh nhân**:\n"
            if mh_data:
                for mh in mh_data:
                    prompt += f"- Bệnh: {mh.get('condition', 'Không rõ')} - {mh.get('notes', '')}\n"
            if allergies_data:
                prompt += f"- Dị ứng: {', '.join(allergies_data)}\n"

        prompt += "\nHãy đưa ra tóm tắt và lời khuyên dinh dưỡng phù hợp."

        try:
            explanation_result = await self.ai_service.generate_custom_explanation(
                medications=[],  # Empty since we're providing custom context
                custom_prompt=prompt,
                user_context=None
            )
            return explanation_result["explanation"].strip()
        except Exception as e:
            return f"Không thể tạo tóm tắt do lỗi: {e}"