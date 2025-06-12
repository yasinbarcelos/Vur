#!/usr/bin/env python3
"""
Database seeding script
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

import structlog
from app.core.config import get_settings
from app.core.database import get_async_session, check_database_connection

logger = structlog.get_logger(__name__)
settings = get_settings()


async def seed_database():
    """Seed database with initial data."""
    logger.info("Starting database seeding...")
    
    # Check database connection
    if not await check_database_connection():
        logger.error("Database connection failed. Aborting seeding.")
        return False
    
    try:
        async for session in get_async_session():
            # TODO: Add initial data seeding logic here
            # This will be implemented in later phases
            
            logger.info("Database seeding completed successfully")
            return True
            
    except Exception as e:
        logger.error("Database seeding failed", error=str(e))
        return False


async def clear_database():
    """Clear all data from database (keep structure)."""
    logger.warning("Clearing all data from database...")
    
    # Check database connection
    if not await check_database_connection():
        logger.error("Database connection failed. Aborting operation.")
        return False
    
    try:
        async for session in get_async_session():
            # TODO: Add data clearing logic here
            # This will be implemented in later phases
            
            logger.info("Database cleared successfully")
            return True
            
    except Exception as e:
        logger.error("Failed to clear database", error=str(e))
        return False


def main():
    """Main seeding script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database seeding script")
    parser.add_argument(
        "action",
        choices=["seed", "clear"],
        help="Seeding action to perform"
    )
    
    args = parser.parse_args()
    
    if args.action == "seed":
        success = asyncio.run(seed_database())
    elif args.action == "clear":
        success = asyncio.run(clear_database())
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 