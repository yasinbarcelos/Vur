"""
Application configuration using Pydantic Settings
"""

import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = Field(default="VUR Backend", description="Application name")
    VERSION: str = Field(default="1.0.0", description="Application version")
    ENVIRONMENT: str = Field(default="development", description="Environment")
    DEBUG: bool = Field(default=True, description="Debug mode")
    LOG_LEVEL: str = Field(default="INFO", description="Log level")
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql://vur_user:vur_password@localhost:5432/vur_db",
        description="Database URL"
    )
    DATABASE_ECHO: bool = Field(default=False, description="Echo SQL queries")
    
    # JWT Authentication
    SECRET_KEY: str = Field(
        default="your-super-secret-key-change-in-production",
        description="JWT secret key"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, 
        description="Access token expiration in minutes"
    )
    
    # CORS
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000",
        description="Allowed CORS origins (comma-separated)"
    )
    
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1"],
        description="Allowed hosts for production"
    )
    
    # File Upload
    MAX_FILE_SIZE: int = Field(
        default=10 * 1024 * 1024,  # 10MB
        description="Maximum file size in bytes"
    )
    UPLOAD_DIR: str = Field(
        default="uploads",
        description="Upload directory"
    )
    
    # ML Models
    MODELS_DIR: str = Field(
        default="models",
        description="Models directory"
    )
    
    # Redis (optional)
    REDIS_URL: Optional[str] = Field(
        default=None,
        description="Redis URL for caching"
    )
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(
        default=60,
        description="Rate limit per minute"
    )
    
    # ML Configuration
    MAX_TRAINING_TIME: int = Field(
        default=3600,  # 1 hour
        description="Maximum training time in seconds"
    )
    DEFAULT_TRAIN_TEST_SPLIT: float = Field(
        default=0.8,
        description="Default train/test split ratio"
    )
    DEFAULT_VALIDATION_SPLIT: float = Field(
        default=0.2,
        description="Default validation split ratio"
    )
    MAX_PREDICTION_HORIZON: int = Field(
        default=365,
        description="Maximum prediction horizon in days"
    )
    DEFAULT_CONFIDENCE_INTERVAL: float = Field(
        default=0.95,
        description="Default confidence interval"
    )
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        """Validate environment value."""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of: {allowed}")
        return v
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v):
        """Validate log level."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"Log level must be one of: {allowed}")
        return v.upper()
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as a list."""
        if isinstance(self.ALLOWED_ORIGINS, str):
            if not self.ALLOWED_ORIGINS.strip():
                return ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
        return self.ALLOWED_ORIGINS
    
    @validator("ALLOWED_HOSTS", pre=True)
    def parse_allowed_hosts(cls, v):
        """Parse allowed hosts from string or list."""
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT == "production"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings() 