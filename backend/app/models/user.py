"""
User model for authentication and user management
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    """
    User model for system authentication and user management.

    Attributes:
        id: Primary key
        email: User email (unique)
        username: Username (unique)
        full_name: User's full name
        hashed_password: Bcrypt hashed password
        is_active: Whether user account is active
        is_superuser: Whether user has admin privileges
        profile_picture: URL/path to profile picture
        bio: User biography/description
        preferences: JSON field for user preferences
        last_login: Timestamp of last login
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "users"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Authentication fields
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # Profile information
    full_name = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    profile_picture = Column(String(500), nullable=True)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # Timestamps
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    pipelines = relationship("Pipeline", back_populates="owner", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    models = relationship("Model", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"