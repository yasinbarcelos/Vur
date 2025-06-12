"""
ML Model model
"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.core.database import Base


class Model(Base):
    """ML Model model - placeholder for FASE 2."""
    __tablename__ = "models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    status = Column(String, default="created")
    model_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 