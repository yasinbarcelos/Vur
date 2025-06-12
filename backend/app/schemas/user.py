"""
User schemas for API validation
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    bio: Optional[str] = Field(None, max_length=500, description="User biography")
    profile_picture: Optional[str] = Field(None, max_length=500, description="Profile picture URL")


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=100, description="Password")
    
    @validator("password")
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v)
        
        if not (has_upper and has_lower and has_digit):
            raise ValueError("Password must contain uppercase, lowercase, and digit characters")
            
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    email: Optional[EmailStr] = Field(None, description="User email address")
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Username")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    bio: Optional[str] = Field(None, max_length=500, description="User biography")
    profile_picture: Optional[str] = Field(None, max_length=500, description="Profile picture URL")


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class TokenData(BaseModel):
    """Schema for token data."""
    username: Optional[str] = None
    user_id: Optional[int] = None
