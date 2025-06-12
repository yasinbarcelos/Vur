"""
Pipeline model for ML pipeline management
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PipelineStatus(enum.Enum):
    """Pipeline status enumeration."""
    CREATED = "created"
    CONFIGURING = "configuring"
    TRAINING = "training"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class PipelineType(enum.Enum):
    """Pipeline type enumeration."""
    UNIVARIATE = "univariate"
    MULTIVARIATE = "multivariate"


class Pipeline(Base):
    """
    Pipeline model for managing ML pipelines.

    Attributes:
        id: Primary key
        name: Pipeline name
        description: Pipeline description
        pipeline_type: Type of pipeline (univariate/multivariate)
        status: Current pipeline status
        configuration: JSON configuration for the pipeline
        target_column: Target column for prediction
        date_column: Date/time column for time series
        features: List of feature columns
        algorithm: ML algorithm used
        hyperparameters: Algorithm hyperparameters
        metrics: Training/validation metrics
        owner_id: Foreign key to user
        dataset_id: Foreign key to dataset
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "pipelines"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Basic information
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    pipeline_type = Column(Enum(PipelineType), default=PipelineType.UNIVARIATE, nullable=False)
    status = Column(Enum(PipelineStatus), default=PipelineStatus.CREATED, nullable=False, index=True)

    # Configuration
    configuration = Column(JSON, nullable=True)
    target_column = Column(String(100), nullable=True)
    date_column = Column(String(100), nullable=True)
    features = Column(JSON, nullable=True)  # List of feature column names

    # ML Configuration
    algorithm = Column(String(50), nullable=True)
    hyperparameters = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)

    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="pipelines")
    dataset = relationship("Dataset", back_populates="pipelines")
    models = relationship("Model", back_populates="pipeline", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Pipeline(id={self.id}, name='{self.name}', status='{self.status.value}')>"