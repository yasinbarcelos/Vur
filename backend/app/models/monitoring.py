"""
Monitoring model
"""

from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func

from app.core.database import Base


class Monitoring(Base):
    """Monitoring model - placeholder for FASE 2."""
    __tablename__ = "monitoring"
    
    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    metrics = Column(JSON)
    message = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 