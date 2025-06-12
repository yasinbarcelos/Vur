"""
Authentication service
"""

from datetime import timedelta
from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_token
from app.core.database import get_async_session
from app.services.user_service import UserService
from app.models.user import User
from app.schemas.user import Token, UserLogin
from app.core.config import get_settings
import structlog

logger = structlog.get_logger(__name__)
settings = get_settings()

# HTTP Bearer token scheme
security = HTTPBearer()


class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    async def login(db: AsyncSession, login_data: UserLogin) -> Token:
        """
        Authenticate user and return JWT token.
        
        Args:
            db: Database session
            login_data: Login credentials
            
        Returns:
            JWT token
            
        Raises:
            HTTPException: If authentication fails
        """
        # Authenticate user
        user = await UserService.authenticate_user(
            db, login_data.username, login_data.password
        )
        
        if not user:
            logger.warning("Failed login attempt", username=login_data.username)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        await UserService.update_last_login(db, user.id)
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id},
            expires_delta=access_token_expires
        )
        
        logger.info("User logged in successfully", user_id=user.id, username=user.username)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    @staticmethod
    async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(get_async_session)
    ) -> User:
        """
        Get current authenticated user from JWT token.
        
        Args:
            credentials: HTTP Bearer credentials
            db: Database session
            
        Returns:
            Current user
            
        Raises:
            HTTPException: If token is invalid or user not found
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        # Verify token
        token_data = verify_token(credentials.credentials)
        if token_data is None:
            raise credentials_exception
        
        username = token_data.get("sub")
        user_id = token_data.get("user_id")
        
        if username is None or user_id is None:
            raise credentials_exception
        
        # Get user from database
        user = await UserService.get_user_by_id(db, user_id)
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        return user
    
    @staticmethod
    async def get_current_active_user(
        current_user: User = Depends(get_current_user)
    ) -> User:
        """
        Get current active user.
        
        Args:
            current_user: Current user from token
            
        Returns:
            Active user
            
        Raises:
            HTTPException: If user is inactive
        """
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        return current_user
    
    @staticmethod
    async def get_current_superuser(
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        """
        Get current superuser.
        
        Args:
            current_user: Current active user
            
        Returns:
            Superuser
            
        Raises:
            HTTPException: If user is not a superuser
        """
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
