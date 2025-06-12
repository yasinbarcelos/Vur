"""
Prediction model
"""

from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func

from app.core.database import Base


class Prediction(Base):
    """Prediction model - placeholder for FASE 2."""
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, nullable=False)
    predicted_value = Column(Float, nullable=False)
    confidence_lower = Column(Float)
    confidence_upper = Column(Float)
    prediction_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 