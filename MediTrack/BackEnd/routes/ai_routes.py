from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
from services.supabase_service import SupabaseService
from services.ai_service import AIService
from services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()
supabase_service = SupabaseService()
ai_service = AIService()
auth_service = AuthService()

class AIExplanationRequest(BaseModel):
    medication_list: List[str]
    risk_factors: Optional[Dict[str, Any]] = None
    include_medical_history: bool = True
    format: str = "markdown"  # 'markdown', 'json', 'plain'

class CustomPromptRequest(BaseModel):
    medications: List[str]
    custom_prompt: str
    include_context: bool = True

async def get_current_user_id(request: Request) -> str:
    """Extract user ID from token"""
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    token = auth_header.replace("Bearer ", "")
    user = await auth_service.verify_token(token)
    
    # Set the authentication token for the supabase service
    supabase_service.set_auth_token(token)
    
    return user["id"]

@router.post("/explain")
async def generate_ai_explanation(request: Request, explanation_request: AIExplanationRequest):
    """Generate AI explanation for medication risks and interactions"""
    try:
        user_id = await get_current_user_id(request)
        
        # Get user context if requested
        user_context = {}
        if explanation_request.include_medical_history:
            medical_history = await supabase_service.get_medical_history(user_id)
            allergies = await supabase_service.get_allergies(user_id)
            user_context = {
                "medical_history": medical_history,
                "allergies": allergies
            }
        
        # Check if we already have a cached explanation
        cached_explanation = await supabase_service.get_cached_ai_explanation(
            user_id, 
            explanation_request.medication_list,
            explanation_request.risk_factors
        )
        
        if cached_explanation:
            return {
                "explanation": cached_explanation["explanation"],
                "format": cached_explanation["explanation_format"],
                "cached": True,
                "created_at": cached_explanation["created_at"]
            }
        
        # Get drug interactions for the medications first
        from services.drug_interaction_service import DrugInteractionService
        drug_service = DrugInteractionService()
        
        interactions_result = await drug_service.check_drug_interactions(
            medications=explanation_request.medication_list,
            user_id=user_id
        )
        
        interactions = interactions_result.get("interactions", [])
        
        # Generate new explanation
        explanation_result = await ai_service.generate_risk_explanation(
            medications=explanation_request.medication_list,
            interactions=interactions,
            user_medical_history=user_context.get("medical_history"),
            user_allergies=user_context.get("allergies")
        )
        
        # Save explanation for future reuse
        explanation_data = {
            "medication_list": explanation_request.medication_list,
            "risk_factors": explanation_request.risk_factors or {},
            "explanation": explanation_result["explanation"],
            "explanation_format": explanation_request.format,
            "prompt_used": explanation_result["prompt_used"],
            "tokens_used": explanation_result.get("tokens_used", 0)
        }
        
        saved_explanation = await supabase_service.save_ai_explanation(user_id, explanation_data)
        
        return {
            "explanation": explanation_result["explanation"],
            "format": explanation_result["format"],  # Use format from AI service response
            "risk_level": explanation_result.get("risk_level", "unknown"),
            "interactions_found": explanation_result.get("interactions_found", 0),
            "medications_analyzed": explanation_result.get("medications_analyzed", []),
            "prompt_used": explanation_result["prompt_used"],
            "tokens_used": explanation_result.get("tokens_used", 0),
            "cached": False,
            "explanation_id": saved_explanation["id"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI explanation generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="AI explanation service temporarily unavailable")

# Alias route for backward compatibility
@router.post("/explain-risks")
async def generate_ai_explanation_alias(request: Request, explanation_request: AIExplanationRequest):
    """Generate AI explanation for medication risks and interactions (alias)"""
    return await generate_ai_explanation(request, explanation_request)

@router.post("/custom-prompt")
async def generate_custom_explanation(request: Request, prompt_request: CustomPromptRequest):
    """Generate AI explanation with custom prompt"""
    try:
        user_id = await get_current_user_id(request)
        
        # Get user context if requested
        user_context = {}
        if prompt_request.include_context:
            medical_history = await supabase_service.get_medical_history(user_id)
            allergies = await supabase_service.get_allergies(user_id)
            user_context = {
                "medical_history": medical_history,
                "allergies": allergies
            }
        
        # Generate explanation with custom prompt
        explanation_result = await ai_service.generate_custom_explanation(
            medications=prompt_request.medications,
            custom_prompt=prompt_request.custom_prompt,
            user_context=user_context if prompt_request.include_context else None
        )
        
        return {
            "explanation": explanation_result["explanation"],
            "prompt_used": explanation_result["prompt_used"],
            "tokens_used": explanation_result.get("tokens_used", 0),
            "medications": prompt_request.medications
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Custom AI explanation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="AI explanation service temporarily unavailable")

@router.get("/history")
async def get_ai_explanation_history(request: Request, limit: int = 10, offset: int = 0):
    """Get user's AI explanation history"""
    try:
        user_id = await get_current_user_id(request)
        
        history = await supabase_service.get_ai_explanation_history(user_id, limit, offset)
        
        return {
            "history": history,
            "count": len(history)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/explanations/{explanation_id}")
async def get_ai_explanation(request: Request, explanation_id: str):
    """Get specific AI explanation"""
    try:
        user_id = await get_current_user_id(request)
        
        explanation = await supabase_service.get_ai_explanation_by_id(explanation_id)
        if not explanation or explanation["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="AI explanation not found")
        
        return {
            "explanation": explanation
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/explanations/{explanation_id}")
async def delete_ai_explanation(request: Request, explanation_id: str):
    """Delete AI explanation"""
    try:
        user_id = await get_current_user_id(request)
        
        explanation = await supabase_service.get_ai_explanation_by_id(explanation_id)
        if not explanation or explanation["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="AI explanation not found")
        
        await supabase_service.delete_ai_explanation(explanation_id)
        
        return {
            "message": "AI explanation deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize-profile")
async def summarize_user_profile(request: Request):
    """Generate comprehensive AI summary of user's medical profile"""
    try:
        user_id = await get_current_user_id(request)
        
        # Get complete user profile
        user_profile = await supabase_service.get_user_by_id(user_id)
        medical_history = await supabase_service.get_medical_history(user_id)
        allergies = await supabase_service.get_allergies(user_id)
        medication_schedules = await supabase_service.get_medication_schedules(user_id)
        
        # Generate comprehensive summary
        summary_result = await ai_service.generate_profile_summary(
            user_profile=user_profile,
            medical_history=medical_history,
            allergies=allergies,
            medication_schedules=medication_schedules
        )
        
        return {
            "summary": summary_result["summary"],
            "risk_assessment": summary_result["risk_assessment"],
            "recommendations": summary_result["recommendations"],
            "tokens_used": summary_result.get("tokens_used", 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
