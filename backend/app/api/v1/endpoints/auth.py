"""
Authentication endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserLogin, Token
from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.models.user import User
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Register a new user.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        Created user information

    Raises:
        HTTPException: If registration fails
    """
    try:
        user = await UserService.create_user(db, user_data)
        logger.info("User registered successfully", user_id=user.id, username=user.username)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Login user and return JWT token.

    Args:
        login_data: Login credentials
        db: Database session

    Returns:
        JWT access token
    """
    return await AuthService.login(db, login_data)


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """
    Get current user profile.

    Args:
        current_user: Current authenticated user

    Returns:
        Current user information
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update user profile.

    Args:
        user_data: Updated user data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated user information

    Raises:
        HTTPException: If update fails
    """
    try:
        updated_user = await UserService.update_user(db, current_user.id, user_data)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        logger.info("User profile updated", user_id=updated_user.id)
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )