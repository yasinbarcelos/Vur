#!/usr/bin/env python3
"""
Database migration script
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

import structlog
from app.core.config import get_settings
from app.core.database import create_tables, drop_tables, check_database_connection

logger = structlog.get_logger(__name__)
settings = get_settings()


async def migrate_up():
    """Run database migrations (create tables)."""
    logger.info("Starting database migration...")
    
    # Check database connection
    if not await check_database_connection():
        logger.error("Database connection failed. Aborting migration.")
        return False
    
    try:
        await create_tables()
        logger.info("Database migration completed successfully")
        return True
    except Exception as e:
        logger.error("Database migration failed", error=str(e))
        return False


async def migrate_down():
    """Drop all database tables."""
    logger.warning("Dropping all database tables...")
    
    # Check database connection
    if not await check_database_connection():
        logger.error("Database connection failed. Aborting operation.")
        return False
    
    try:
        await drop_tables()
        logger.info("All database tables dropped successfully")
        return True
    except Exception as e:
        logger.error("Failed to drop database tables", error=str(e))
        return False


def main():
    """Main migration script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database migration script")
    parser.add_argument(
        "action",
        choices=["up", "down", "check"],
        help="Migration action to perform"
    )
    
    args = parser.parse_args()
    
    if args.action == "up":
        success = asyncio.run(migrate_up())
    elif args.action == "down":
        success = asyncio.run(migrate_down())
    elif args.action == "check":
        success = asyncio.run(check_database_connection())
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 