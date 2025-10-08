from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import uvicorn
import os
from fastapi.openapi.utils import get_openapi
from fastapi import Depends
from middlewares.auth_middleware import AttachUserMiddleware

from dotenv import load_dotenv


# Load environment variables
load_dotenv()

# Import our custom modules
from config.settings import Settings
from services.auth_service import AuthService
from services.supabase_service import SupabaseService
from routes import (
    auth_routes,
    user_routes,
    medical_history_routes,
    ocr_routes,
    drug_interaction_routes,
    ai_routes,
    qr_routes,
    reminder_routes,
    export_routes,
    family_routes,
    prescription_routes
)

# Initialize settings
settings = Settings()

# Create FastAPI instance
app = FastAPI(
    title="MediTrack API",
    description="Backend API for MediTrack medication safety platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AttachUserMiddleware)

# Security
security = HTTPBearer()

# Initialize services
auth_service = AuthService()
supabase_service = SupabaseService()

# Dependency for authentication
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        print(f"🔍 Authentication attempt - Token: {credentials.credentials[:20]}...")
        user = await auth_service.verify_token(credentials.credentials)
        print(f"✅ Authentication successful - User: {user.get('email', 'unknown')}")
        return user
    except Exception as e:
        print(f"❌ Authentication failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Optional dependency for routes that handle auth internally
async def get_current_user_optional(request: Request):
    """Optional authentication - allows routes to handle auth internally"""
    return None

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "MediTrack API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Check database connection
        db_status = await supabase_service.health_check()
        return {
            "status": "healthy",
            "database": "connected" if db_status else "disconnected",
            "services": {
                "supabase": db_status,
                "redis": True,  # Add actual Redis health check
                "gemini": True   # Add actual Gemini API health check
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )
    




# Include routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(user_routes.router, prefix="/api/users", tags=["Users"])
app.include_router(medical_history_routes.router, prefix="/api/medical-history", tags=["Medical History"])
app.include_router(ocr_routes.router, prefix="/api/ocr", tags=["OCR & Prescriptions"])
app.include_router(drug_interaction_routes.router, prefix="/api/interactions", tags=["Drug Interactions"])
app.include_router(ai_routes.router, prefix="/api/ai", tags=["AI Explanations"])
app.include_router(qr_routes.router, prefix="/api/qr", tags=["QR Sharing"])
app.include_router(reminder_routes.router, prefix="/api/reminders", tags=["Medication Reminders"])
app.include_router(export_routes.router, prefix="/api/export", tags=["Data Export"])
app.include_router(family_routes.router, prefix="/api/family", tags=["Family Management"])
app.include_router(prescription_routes.router, prefix="/api", tags=["Prescriptions"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    # Get default OpenAPI schema
    openapi_schema = get_openapi(
        title="MediTrack API",
        version="1.0.0",
        description="Backend API for MediTrack medication safety platform",
        routes=app.routes,
    )

    # Add BearerAuth for Swagger UI
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT token (without 'Bearer ' prefix)"
        }
    }





    # Apply security to all protected endpoints except auth and public ones
    public_paths = ["/", "/health", "/docs", "/openapi.json", "/redoc"]
    auth_paths = ["/api/auth/signin", "/api/auth/signup", "/api/auth/reset-password"]
    
    for path_name, path_info in openapi_schema["paths"].items():
        # Skip public endpoints
        if any(path_name == public_path for public_path in public_paths):
            continue
            
        # Skip auth endpoints  
        if any(path_name.startswith(auth_path) for auth_path in auth_paths):
            continue
            
        # Apply security to all other endpoints
        for method_name, method_info in path_info.items():
            if isinstance(method_info, dict) and "operationId" in method_info:
                method_info.setdefault("security", [{"BearerAuth": []}])

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi



if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )