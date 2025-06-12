-- VUR Database Initialization Script
-- This script is executed when the PostgreSQL container starts

-- Create database if it doesn't exist (handled by Docker environment variables)
-- CREATE DATABASE vur_db;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create initial schema (tables will be created by SQLAlchemy/Alembic)
-- This file serves as a placeholder for any initial database setup 