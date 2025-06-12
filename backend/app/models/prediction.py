"""
Prediction model for storing ML predictions
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PredictionType(enum.Enum):
    """Prediction type enumeration."""
    SINGLE_STEP = "single_step"
    MULTI_STEP = "multi_step"
    BATCH = "batch"


class PredictionStatus(enum.Enum):
    """Prediction status enumeration."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class Prediction(Base):
    """
    Model for storing ML predictions and forecasts.

    Attributes:
        id: Primary key
        model_id: Foreign key to the model used
        prediction_type: Type of prediction (single/multi-step/batch)
        status: Prediction status
        predicted_value: Main predicted value
        confidence_lower: Lower confidence bound
        confidence_upper: Upper confidence bound
        prediction_date: Date/time for which prediction is made
        input_features: Input features used for prediction
        prediction_metadata: Additional prediction metadata
        error_message: Error message if prediction failed
        created_at: Prediction creation timestamp
    """
    __tablename__ = "predictions"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Prediction information
    prediction_type = Column(Enum(PredictionType), default=PredictionType.SINGLE_STEP, nullable=False)
    status = Column(Enum(PredictionStatus), default=PredictionStatus.PENDING, nullable=False, index=True)

    # Prediction values
    predicted_value = Column(Float, nullable=False)
    confidence_lower = Column(Float, nullable=True)
    confidence_upper = Column(Float, nullable=True)
    prediction_date = Column(DateTime(timezone=True), nullable=False, index=True)

    # Input and metadata
    input_features = Column(JSON, nullable=True)  # Features used for this prediction
    prediction_metadata = Column(JSON, nullable=True)  # Additional metadata
    error_message = Column(Text, nullable=True)  # Error message if failed

    # Foreign keys
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    model = relationship("Model", back_populates="predictions")

    def __repr__(self):
        return f"<Prediction(id={self.id}, model_id={self.model_id}, value={self.predicted_value}, date='{self.prediction_date}')>"