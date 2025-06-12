"""
ML Model model for trained models management
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ModelStatus(enum.Enum):
    """Model status enumeration."""
    CREATED = "created"
    TRAINING = "training"
    TRAINED = "trained"
    DEPLOYED = "deployed"
    FAILED = "failed"
    ARCHIVED = "archived"


class ModelAlgorithm(enum.Enum):
    """Model algorithm enumeration."""
    ARIMA = "arima"
    SARIMA = "sarima"
    PROPHET = "prophet"
    LSTM = "lstm"
    GRU = "gru"
    RANDOM_FOREST = "random_forest"
    XGBOOST = "xgboost"
    LINEAR_REGRESSION = "linear_regression"
    SVR = "svr"
    TRANSFORMER = "transformer"
    CUSTOM = "custom"


class Model(Base):
    """
    Model for managing trained ML models.

    Attributes:
        id: Primary key
        name: Model display name
        description: Model description
        algorithm: ML algorithm used
        status: Current model status
        version: Model version
        model_path: Path to serialized model file
        hyperparameters: Training hyperparameters
        training_metrics: Training performance metrics
        validation_metrics: Validation performance metrics
        test_metrics: Test performance metrics
        feature_importance: Feature importance scores
        training_duration: Training time in seconds
        model_size: Model file size in bytes
        pipeline_id: Foreign key to pipeline
        owner_id: Foreign key to user
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "models"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Basic information
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    algorithm = Column(Enum(ModelAlgorithm), nullable=False, index=True)
    status = Column(Enum(ModelStatus), default=ModelStatus.CREATED, nullable=False, index=True)
    version = Column(String(20), default="1.0.0", nullable=False)

    # Model files and metadata
    model_path = Column(String(500), nullable=True)
    model_size = Column(Integer, nullable=True)  # Size in bytes

    # Training configuration and results
    hyperparameters = Column(JSON, nullable=True)
    training_metrics = Column(JSON, nullable=True)
    validation_metrics = Column(JSON, nullable=True)
    test_metrics = Column(JSON, nullable=True)
    feature_importance = Column(JSON, nullable=True)
    training_duration = Column(Float, nullable=True)  # Duration in seconds

    # Foreign keys
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    pipeline = relationship("Pipeline", back_populates="models")
    owner = relationship("User", back_populates="models")
    predictions = relationship("Prediction", back_populates="model", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Model(id={self.id}, name='{self.name}', algorithm='{self.algorithm.value}', status='{self.status.value}')>"