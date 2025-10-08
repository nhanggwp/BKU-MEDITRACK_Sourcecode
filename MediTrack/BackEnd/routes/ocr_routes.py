from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List

from services.supabase_service import SupabaseService
from services.auth_service import AuthService
from services.ai_service import AIService
from services.ocr_service import OCRService

router = APIRouter()
supabase_service = SupabaseService()
auth_service = AuthService()
ai_service = AIService()
ocr_service = OCRService()

# ---------------------------- SCHEMAS ----------------------------

class OCRUploadRequest(BaseModel):
    raw_ocr_text: str
    confidence_score: float
    source_type: str  # 'printed', 'handwritten', 'mixed'
    original_image_url: Optional[str] = None

class ExtractedMedicineRequest(BaseModel):
    extracted_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    confidence_score: float
    medication_id: Optional[str] = None

class PrescriptionReviewRequest(BaseModel):
    ocr_upload_id: str
    medicines: List[ExtractedMedicineRequest]
    verified: bool = False

class PrescriptionAnalysisRequest(BaseModel):
    raw_ocr_text: str
    confidence_score: float
    source_type: str

class OCRBase64Request(BaseModel):
    image_base64: str

# ---------------------- AUTH UTILITY ----------------------

async def get_current_user_id(request: Request) -> str:
    user_id_header = request.headers.get("X-User-ID")
    if user_id_header:
        return user_id_header
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return "anonymous"
    try:
        token = auth_header.replace("Bearer ", "")
        user = await auth_service.verify_token(token)
        supabase_service.set_auth_token(token)
        return user["id"]
    except Exception as e:
        print(f"Auth error: {e}")
        return "anonymous"

# ---------------------------- ROUTES ----------------------------

@router.post("/upload")
async def upload_ocr_data(request: Request, ocr_data: OCRUploadRequest):
    try:
        user_id = await get_current_user_id(request)
        upload_data = {
            "user_id": user_id,
            "raw_ocr_text": ocr_data.raw_ocr_text,
            "confidence_score": ocr_data.confidence_score,
            "source_type": ocr_data.source_type,
            "original_image_url": ocr_data.original_image_url,
            "processed": False
        }
        result = await supabase_service.save_ocr_upload(user_id, upload_data)
        return {"message": "OCR data uploaded successfully", "upload_id": result["id"], "upload": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-prescription")
async def analyze_prescription_with_ai(request: Request, analysis_data: PrescriptionAnalysisRequest):
    try:
        user_id = await get_current_user_id(request)
        upload_data = {
            "user_id": user_id,
            "raw_ocr_text": analysis_data.raw_ocr_text,
            "confidence_score": analysis_data.confidence_score,
            "source_type": analysis_data.source_type,
            "processed": False
        }
        ocr_upload = await supabase_service.save_ocr_upload(user_id, upload_data)
        upload_id = ocr_upload["id"]
        ai_analysis = await ai_service.analyze_prescription_text_enhanced(analysis_data.raw_ocr_text)

        extracted_medicines = []
        if ai_analysis.get("medications"):
            for med in ai_analysis["medications"]:
                extracted_medicines.append({
                    "extracted_name": med.get("name", ""),
                    "dosage": med.get("dosage"),
                    "frequency": med.get("frequency"),
                    "duration": med.get("duration"),
                    "confidence_score": 0.8 if ai_analysis.get("confidence") == "high" else 0.6 if ai_analysis.get("confidence") == "medium" else 0.4,
                    "medication_id": None
                })

        saved_medicines = []
        if extracted_medicines:
            saved_medicines = await supabase_service.save_extracted_medicines(upload_id, extracted_medicines)
            await supabase_service.update_ocr_upload_status(upload_id, True)

        return {
            "message": "Prescription analyzed successfully",
            "upload_id": upload_id,
            "ai_analysis": ai_analysis,
            "extracted_medicines": saved_medicines,
            "medicines_count": len(saved_medicines)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-ocr")
async def process_ocr_alias(request: Request, analysis_data: PrescriptionAnalysisRequest):
    return await analyze_prescription_with_ai(request, analysis_data)

@router.post("/upload/{upload_id}/medicines")
async def save_extracted_medicines(request: Request, upload_id: str, medicines_data: List[ExtractedMedicineRequest]):
    try:
        user_id = await get_current_user_id(request)
        upload = await supabase_service.get_ocr_upload(upload_id)
        if not upload or upload["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="OCR upload not found")

        medicines = [medicine.dict() for medicine in medicines_data]
        result = await supabase_service.save_extracted_medicines(upload_id, medicines)
        await supabase_service.update_ocr_upload_status(upload_id, True)

        return {"message": "Extracted medicines saved successfully", "medicines": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/uploads")
async def get_ocr_uploads(request: Request, limit: int = 10, offset: int = 0):
    try:
        user_id = await get_current_user_id(request)
        uploads = await supabase_service.get_ocr_uploads(user_id, limit, offset)
        return {"uploads": uploads, "count": len(uploads)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/uploads/{upload_id}")
async def get_ocr_upload(request: Request, upload_id: str):
    try:
        user_id = await get_current_user_id(request)
        upload = await supabase_service.get_ocr_upload_with_medicines(upload_id)
        if not upload or upload["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="OCR upload not found")
        return {"upload": upload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/uploads/{upload_id}/review")
async def review_prescription(request: Request, upload_id: str, review_data: PrescriptionReviewRequest):
    try:
        user_id = await get_current_user_id(request)
        upload = await supabase_service.get_ocr_upload(upload_id)
        if not upload or upload["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="OCR upload not found")

        medicines = [medicine.dict() for medicine in review_data.medicines]
        await supabase_service.update_extracted_medicines(upload_id, medicines)

        if review_data.verified:
            await supabase_service.verify_prescription(upload_id)

        return {"message": "Prescription review updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/uploads/{upload_id}")
async def delete_ocr_upload(request: Request, upload_id: str):
    try:
        user_id = await get_current_user_id(request)
        upload = await supabase_service.get_ocr_upload(upload_id)
        if not upload or upload["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="OCR upload not found")

        await supabase_service.delete_ocr_upload(upload_id)
        return {"message": "OCR upload deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recognize")
async def recognize_text(data: OCRBase64Request):
    try:
        result = await ocr_service.recognize_text(data.image_base64)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))