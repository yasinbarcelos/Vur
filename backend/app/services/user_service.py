"""
User service for business logic
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
import structlog

logger = structlog.get_logger(__name__)


class UserService:
    """Service for user management."""
    
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        """
        Create a new user.
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            Created user
            
        Raises:
            ValueError: If user already exists
        """
        try:
            # Hash password
            hashed_password = get_password_hash(user_data.password)
            
            # Create user instance
            db_user = User(
                email=user_data.email,
                username=user_data.username,
                hashed_password=hashed_password,
                full_name=user_data.full_name,
                bio=user_data.bio,
                profile_picture=user_data.profile_picture,
                is_active=True,
                is_superuser=False
            )
            
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            
            logger.info("User created successfully", user_id=db_user.id, username=db_user.username)
            return db_user
            
        except IntegrityError as e:
            await db.rollback()
            if "email" in str(e):
                raise ValueError("Email already registered")
            elif "username" in str(e):
                raise ValueError("Username already taken")
            else:
                raise ValueError("User creation failed")
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email."""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """Get user by username."""
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_username_or_email(db: AsyncSession, identifier: str) -> Optional[User]:
        """Get user by username or email."""
        result = await db.execute(
            select(User).where(
                (User.username == identifier) | (User.email == identifier)
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_user(db: AsyncSession, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """
        Update user information.
        
        Args:
            db: Database session
            user_id: User ID
            user_data: Update data
            
        Returns:
            Updated user or None if not found
        """
        user = await UserService.get_user_by_id(db, user_id)
        if not user:
            return None
        
        # Update fields
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        try:
            await db.commit()
            await db.refresh(user)
            logger.info("User updated successfully", user_id=user.id)
            return user
        except IntegrityError:
            await db.rollback()
            raise ValueError("Update failed - email or username already exists")
    
    @staticmethod
    async def update_last_login(db: AsyncSession, user_id: int) -> None:
        """Update user's last login timestamp."""
        user = await UserService.get_user_by_id(db, user_id)
        if user:
            user.last_login = datetime.utcnow()
            await db.commit()
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
        """
        Authenticate user with username/email and password.
        
        Args:
            db: Database session
            username: Username or email
            password: Plain text password
            
        Returns:
            User if authentication successful, None otherwise
        """
        user = await UserService.get_user_by_username_or_email(db, username)
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
        
        return user
    
    @staticmethod
    async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
        """Get list of users with pagination."""
        result = await db.execute(
            select(User)
            .offset(skip)
            .limit(limit)
            .order_by(User.created_at.desc())
        )
        return result.scalars().all()
