from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Supabase Configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # Gemini AI Configuration
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "fallback-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Redis Configuration
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # QR Code Encryption
    qr_encryption_key: str = os.getenv("QR_ENCRYPTION_KEY", "default-32-char-key-change-this")
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # File Upload
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_file_types: list = [".jpg", ".jpeg", ".png", ".pdf"]
    
    # Cache Settings
    cache_expire_minutes: int = 60
    drug_interaction_cache_hours: int = 24
    
    # AI Settings
    max_ai_tokens: int = 1000
    ai_temperature: float = 0.7
    # Language Settings
    default_language: str = os.getenv("DEFAULT_LANGUAGE", "english")
    
    class Config:
        env_file = ".env"