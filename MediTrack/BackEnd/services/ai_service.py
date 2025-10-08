import google.generativeai as genai
from typing import Dict, Any, List, Optional
import json
import logging
from config.settings import Settings

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.settings = Settings()
        genai.configure(api_key=self.settings.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    async def generate_risk_explanation(
        self, 
        medications: List[str], 
        interactions: List[Dict[str, Any]], 
        user_medical_history: List[Dict[str, Any]] = None,
        user_allergies: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate plain-language explanation of medication risks using Gemini AI"""
        
        # Build context
        context = self._build_medical_context(medications, interactions, user_medical_history, user_allergies)
        
        # Create prompt
        prompt = self._create_risk_explanation_prompt(context)
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=self.settings.ai_temperature,
                    max_output_tokens=self.settings.max_ai_tokens
                )
            )
            
            # Parse the response
            explanation = response.text
            
            return {
                "explanation": explanation,
                "format": "markdown",
                "medications_analyzed": medications,
                "interactions_found": len(interactions),
                "risk_level": self._assess_overall_risk(interactions),
                "prompt_used": prompt[:200] + "..." if len(prompt) > 200 else prompt,
                "tokens_used": len(explanation.split()) * 1.3  # Rough estimate
            }
            
        except Exception as e:
            logger.error(f"AI explanation generation failed: {str(e)}")
            raise Exception("AI explanation service temporarily unavailable")
    
    def _build_medical_context(
        self, 
        medications: List[str], 
        interactions: List[Dict[str, Any]], 
        medical_history: List[Dict[str, Any]] = None, 
        allergies: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Build medical context for AI prompt"""
        
        context = {
            "medications": medications,
            "total_medications": len(medications),
            "interactions": interactions,
            "interaction_count": len(interactions),
            "medical_conditions": [],
            "allergies": []
        }
        
        if medical_history:
            context["medical_conditions"] = [
                {
                    "condition": hist.get("conditions", {}).get("name", "Unknown"),
                    "severity": hist.get("conditions", {}).get("severity", "unknown")
                }
                for hist in medical_history
            ]
        
        if allergies:
            context["allergies"] = [
                {
                    "allergen": allergy.get("allergen", ""),
                    "severity": allergy.get("severity", "unknown"),
                    "reaction": allergy.get("reaction", "")
                }
                for allergy in allergies
            ]
        
        return context
    
    def _create_risk_explanation_prompt(self, context: Dict[str, Any]) -> str:
        """Create detailed prompt for risk explanation"""
        
        medications_list = ", ".join(context["medications"])
        
        prompt = f"""
You are a medical AI assistant specializing in medication safety. Please provide a clear, easy-to-understand explanation about the medications and their potential interactions.

**Patient Information:**
- Medications: {medications_list}
- Number of medications: {context['total_medications']}
"""
        
        if context["medical_conditions"]:
            conditions = ", ".join([cond["condition"] for cond in context["medical_conditions"]])
            prompt += f"- Medical conditions: {conditions}\n"
        
        if context["allergies"]:
            allergies = ", ".join([allergy["allergen"] for allergy in context["allergies"]])
            prompt += f"- Known allergies: {allergies}\n"
        
        prompt += f"\n**Drug Interactions Found:** {context['interaction_count']}\n"
        
        if context["interactions"]:
            prompt += "\nDetailed interactions:\n"
            for interaction in context["interactions"]:
                prompt += f"- {interaction.get('drug1_name', '')} + {interaction.get('drug2_name', '')}: {interaction.get('description', 'No description')}\n"
        
        prompt += """
Please provide:

1. **Overall Safety Assessment**: A brief summary of the medication combination's safety
2. **Key Interactions**: Explain the most important drug interactions in simple terms
3. **Potential Side Effects**: What symptoms to watch for
4. **Recommendations**: 
   - What to discuss with the doctor
   - Any timing considerations for taking medications
   - Warning signs that require immediate medical attention
5. **Allergy Considerations**: If any medications might conflict with known allergies

Please write in a caring, informative tone that a patient can easily understand. Use bullet points and clear headings. Avoid medical jargon where possible, but when technical terms are necessary, explain them briefly.

Remember to emphasize that this is informational only and not a substitute for professional medical advice.
"""
        
        return prompt
    
    def _assess_overall_risk(self, interactions: List[Dict[str, Any]]) -> str:
        """Assess overall risk level based on interactions"""
        if not interactions:
            return "minor"
        
        severity_scores = {
            "minor": 1,
            "moderate": 2, 
            "major": 3
        }
        
        max_severity = 0
        for interaction in interactions:
            severity = interaction.get("severity", "minor").lower()
            score = severity_scores.get(severity, 1)
            max_severity = max(max_severity, score)
        
        if max_severity >= 3:
            return "major"
        elif max_severity >= 2:
            return "moderate"
        else:
            return "minor"
    
    async def generate_medication_summary(self, medications: List[Dict[str, Any]]) -> str:
        """Generate a summary of medications for QR code sharing"""
        try:
            med_list = []
            for med in medications:
                name = med.get("medication_name", med.get("name", "Unknown"))
                dosage = med.get("dosage", "")
                frequency = med.get("frequency", "")
                
                med_str = name
                if dosage:
                    med_str += f" ({dosage})"
                if frequency:
                    med_str += f" - {frequency}"
                med_list.append(med_str)
            
            # Use AI to generate a well-formatted summary
            prompt = f"""
Create a concise, well-formatted summary of these medications for medical QR code sharing:

Medications:
{chr(10).join([f"- {med}" for med in med_list])}

Format the output as a clean, professional medical summary that includes:
1. Patient medication list header
2. Each medication with dosage and frequency if available
3. Date of generation
4. Note about verifying with healthcare provider

Keep it concise but medically appropriate.
"""
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            # Fallback to simple list if AI fails
            return "\n".join([f"• {med}" for med in med_list])
    
    async def analyze_prescription_text_enhanced(self, ocr_text: str) -> Dict[str, Any]:
        """Enhanced prescription analysis that extracts disease names and detailed medication info"""
        
        prompt = f"""
You are a medical AI assistant helping extract structured data from prescription texts.

The input below is a noisy OCR output from a scanned or photographed prescription. It may contain misspellings, missing punctuation, or formatting issues. Your task is to **recover the intended medical meaning** as accurately as possible.

---

**OCR Input**:
\"\"\"{ocr_text}\"\"\"

---

Please extract and return a JSON with this structure:

{{
  "disease_name": "Main disease/diagnosis being treated (e.g. Hypertension, Diabetes, Upper respiratory infection)",
  "medications": [
    {{
      "name": "Medication name",
      "dosage": "Dosage strength (e.g. 10mg, 500mg)",
      "frequency": "How often to take it (e.g. once a day, twice daily)",
      "duration": "For how long (e.g. 7 days, as needed)",
      "start_date": "Start date if mentioned (e.g. 25/07/2025)",
      "end_date": "End date if mentioned (e.g. 01/08/2025)",
      "instructions": "Any additional instructions (e.g. take before meal)"
    }}
  ],
  "prescription_date": "Date if present (e.g. 25/07/2025)",
  "doctor_info": {{
    "name": "Doctor's name if found",
    "clinic": "Clinic or hospital name if found"
  }},
  "confidence": "high / medium / low (based on clarity of input)"
}}

**Instructions**:
- Extract the disease/diagnosis name from diagnosis fields, condition mentions, or ICD codes
- Look for Vietnamese disease names as well (e.g. "Tăng huyết áp", "Đái tháo đường", "Cảm cúm")
- If multiple diseases mentioned, pick the primary one
- For medications, calculate end_date from start_date + duration if possible
- If data is not clearly present, set it to `null`
- Be cautious with assumptions. Don't hallucinate.
- Try to recover miswritten drug names if possible (e.g. "Paracelamol" → "Paracetamol")
- Trim any unnecessary explanation. Only return the JSON.
"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Try to parse as JSON
            try:
                # Handle markdown code blocks (```json...```)
                if response_text.startswith("```"):
                    # Extract JSON from markdown code block
                    lines = response_text.split('\n')
                    json_lines = []
                    in_json_block = False
                    
                    for line in lines:
                        if line.strip().startswith("```"):
                            if not in_json_block:
                                in_json_block = True
                            else:
                                break
                        elif in_json_block:
                            json_lines.append(line)
                    
                    if json_lines:
                        json_text = '\n'.join(json_lines)
                        return json.loads(json_text)
                
                # Try direct JSON parsing
                return json.loads(response_text)
                
            except json.JSONDecodeError:
                # If JSON parsing fails, return basic structure
                return {
                    "disease_name": None,
                    "medications": [],
                    "doctor_info": {"name": None, "clinic": None},
                    "prescription_date": None,
                    "confidence": "low",
                    "raw_response": response_text
                }
        except Exception as e:
            raise Exception(f"Prescription analysis failed: {str(e)}")

    # Keep original method for backward compatibility
    async def analyze_prescription_text(self, ocr_text: str) -> Dict[str, Any]:
        """Original prescription analysis method - calls enhanced version"""
        return await self.analyze_prescription_text_enhanced(ocr_text)
    
    async def generate_custom_explanation(
        self,
        medications: List[str],
        custom_prompt: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate AI explanation with custom prompt"""
        try:
            # Build context
            context = ""
            if user_context:
                context = self._build_user_context(user_context)
            
            # Build full prompt
            full_prompt = f"""
            {context}
            
            Medications: {', '.join(medications)}
            
            {custom_prompt}
            
            Please provide a clear, accurate, and helpful response.
            """
            
            response = self.model.generate_content(full_prompt)
            
            return {
                "explanation": response.text,  # Changed from "response" to "explanation" for consistency
                "medications_analyzed": medications,
                "custom_prompt": custom_prompt
            }
            
        except Exception as e:
            logger.error(f"Custom explanation generation failed: {str(e)}")
            raise Exception("Custom AI explanation service temporarily unavailable")
    
    def _build_user_context(self, user_context: Dict[str, Any]) -> str:
        """Build user context string"""
        context_parts = []
        
        if user_context.get("age"):
            context_parts.append(f"Patient age: {user_context['age']}")
        
        if user_context.get("conditions"):
            conditions = ", ".join(user_context["conditions"])
            context_parts.append(f"Medical conditions: {conditions}")
        
        if user_context.get("allergies"):
            allergies = ", ".join(user_context["allergies"])
            context_parts.append(f"Known allergies: {allergies}")
        
        return "\n".join(context_parts) if context_parts else ""
    
    async def extract_medication_names(self, text: str) -> List[str]:
        """Extract medication names from free text"""
        try:
            prompt = f"""
Extract medication names from the following text. Return only a JSON array of medication names, nothing else.

Text: {text}

Return format: ["medication1", "medication2", ...]
"""
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Try to parse as JSON array
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                # Fallback: extract lines that look like medication names
                lines = response_text.split('\n')
                medications = []
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('[') and not line.startswith(']'):
                        # Remove common prefixes and clean up
                        line = line.replace('- ', '').replace('• ', '').replace('"', '')
                        if line:
                            medications.append(line)
                return medications
                
        except Exception as e:
            print(f"Error extracting medication names: {e}")
            return []