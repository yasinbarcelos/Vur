"""
Dataset schemas for API validation
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.dataset import DatasetStatus, DatasetType


class DatasetBase(BaseModel):
    """Base dataset schema."""
    name: str = Field(..., min_length=1, max_length=200, description="Dataset name")
    description: Optional[str] = Field(None, max_length=1000, description="Dataset description")
    dataset_type: DatasetType = Field(default=DatasetType.TIME_SERIES, description="Dataset type")


class DatasetCreate(DatasetBase):
    """Schema for creating a new dataset."""
    filename: str = Field(..., description="Original filename")
    file_path: str = Field(..., description="Path to stored file")
    file_size: Optional[int] = Field(None, description="File size in bytes")


class DatasetUpdate(BaseModel):
    """Schema for updating dataset information."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Dataset name")
    description: Optional[str] = Field(None, max_length=1000, description="Dataset description")
    dataset_type: Optional[DatasetType] = Field(None, description="Dataset type")
    status: Optional[DatasetStatus] = Field(None, description="Dataset status")
    columns_info: Optional[Dict[str, Any]] = Field(None, description="Column metadata")
    row_count: Optional[int] = Field(None, description="Number of rows")
    validation_errors: Optional[Dict[str, Any]] = Field(None, description="Validation errors")
    dataset_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class DatasetResponse(DatasetBase):
    """Schema for dataset response."""
    id: int
    filename: str
    file_path: str
    file_size: Optional[int]
    status: DatasetStatus
    columns_info: Optional[Dict[str, Any]]
    row_count: Optional[int]
    validation_errors: Optional[Dict[str, Any]]
    dataset_metadata: Optional[Dict[str, Any]]
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class DatasetListResponse(BaseModel):
    """Schema for dataset list response."""
    datasets: List[DatasetResponse]
    total: int
    page: int
    size: int


class DatasetUploadResponse(BaseModel):
    """Schema for dataset upload response."""
    dataset_id: int
    filename: str
    file_size: int
    status: str
    message: str


class DatasetPreviewResponse(BaseModel):
    """Schema for dataset preview response."""
    columns: List[str]
    data: List[Dict[str, Any]]
    total_rows: int
    preview_rows: int
    data_types: Dict[str, str]
    statistics: Optional[Dict[str, Any]]


class DatasetValidationResponse(BaseModel):
    """Schema for dataset validation response."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]
    column_analysis: Dict[str, Any]
    time_series_info: Optional[Dict[str, Any]]


class DatasetStatusUpdate(BaseModel):
    """Schema for updating dataset status."""
    status: DatasetStatus = Field(..., description="New dataset status")
    message: Optional[str] = Field(None, description="Status update message")
