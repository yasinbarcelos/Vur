"""
Dataset model for data management
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Enum, BigInteger, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class DatasetStatus(enum.Enum):
    """Dataset status enumeration."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    VALIDATED = "validated"
    ERROR = "error"
    ARCHIVED = "archived"


class DatasetType(enum.Enum):
    """Dataset type enumeration."""
    TIME_SERIES = "time_series"
    TABULAR = "tabular"
    OTHER = "other"


class Dataset(Base):
    """
    Dataset model for managing uploaded datasets.

    Attributes:
        id: Primary key
        name: Dataset display name
        description: Dataset description
        filename: Original filename
        file_path: Path to stored file
        file_size: File size in bytes
        dataset_type: Type of dataset
        status: Processing status
        columns_info: JSON with column metadata
        row_count: Number of rows in dataset
        validation_errors: JSON with validation errors if any
        dataset_metadata: Additional metadata
        owner_id: Foreign key to user
        created_at: Upload timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "datasets"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Basic information
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=True)

    # Dataset metadata
    dataset_type = Column(Enum(DatasetType), default=DatasetType.TIME_SERIES, nullable=False)
    status = Column(Enum(DatasetStatus), default=DatasetStatus.UPLOADED, nullable=False, index=True)
    columns_info = Column(JSON, nullable=True)  # Column names, types, statistics
    row_count = Column(Integer, nullable=True)
    validation_errors = Column(JSON, nullable=True)
    dataset_metadata = Column(JSON, nullable=True)

    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="datasets")
    pipelines = relationship("Pipeline", back_populates="dataset", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Dataset(id={self.id}, name='{self.name}', status='{self.status.value}')>"