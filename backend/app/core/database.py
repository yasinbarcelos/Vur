"""
Database configuration and session management
"""

from typing import AsyncGenerator

import structlog
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

# Database URL conversion for async
if settings.DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = settings.DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://", 1
    )
elif settings.DATABASE_URL.startswith("sqlite://"):
    # Use aiosqlite for async SQLite operations
    ASYNC_DATABASE_URL = settings.DATABASE_URL.replace(
        "sqlite://", "sqlite+aiosqlite://", 1
    )
else:
    ASYNC_DATABASE_URL = settings.DATABASE_URL

# Create async engine
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Create sync engine for migrations
sync_engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Session makers
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

SessionLocal = sessionmaker(
    sync_engine,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get async database session.
    
    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_session():
    """
    Get sync database session for migrations.
    
    Returns:
        Session: Database session
    """
    session = SessionLocal()
    try:
        return session
    finally:
        session.close()


async def create_tables():
    """Create database tables."""
    try:
        async with async_engine.begin() as conn:
            # Import all models to ensure they are registered
            from app.models import user, pipeline, dataset, model, prediction, monitoring
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.warning("Could not create database tables - database may not be available", error=str(e))
        # Don't raise the exception to allow the app to start without database


async def drop_tables():
    """Drop all database tables."""
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            
        logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error("Failed to drop database tables", error=str(e))
        raise


async def check_database_connection():
    """Check database connection."""
    try:
        async with async_engine.begin() as conn:
            await conn.execute("SELECT 1")
        
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.warning("Database connection failed", error=str(e))
        return False 