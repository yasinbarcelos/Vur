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


class DatasetAnalysisRequest(BaseModel):
    """Schema for dataset analysis request."""
    dataset_id: int
    analyze_columns: Optional[List[str]] = Field(None, description="Specific columns to analyze")
    sample_size: Optional[int] = Field(1000, ge=100, le=10000, description="Sample size for analysis")
    detect_time_series: bool = Field(True, description="Whether to detect time series patterns")


class ColumnInfo(BaseModel):
    """Schema for column information."""
    name: str
    data_type: str
    null_count: int
    null_percentage: float
    unique_count: int
    is_numeric: bool
    is_potential_date: bool
    is_potential_target: bool
    statistics: Optional[Dict[str, Any]] = None
    sample_values: List[str]


class TimeSeriesInfo(BaseModel):
    """Schema for time series information."""
    date_column: Optional[str]
    frequency: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    total_periods: Optional[int]
    missing_periods: Optional[int]
    is_regular: bool
    seasonality_detected: Optional[Dict[str, Any]]


class DatasetAnalysisResponse(BaseModel):
    """Schema for comprehensive dataset analysis response."""
    dataset_id: int
    total_rows: int
    total_columns: int
    memory_usage_mb: float
    columns_info: List[ColumnInfo]
    time_series_info: Optional[TimeSeriesInfo]
    data_quality_score: float
    recommendations: List[str]
    warnings: List[str]
    errors: List[str]
    analysis_timestamp: datetime


class DatasetProcessingRequest(BaseModel):
    """Schema for dataset processing request."""
    dataset_id: int
    save_to_database: bool = Field(True, description="Whether to save processed data to database")
    chunk_size: int = Field(10000, ge=1000, le=100000, description="Chunk size for processing")


class DatasetProcessingResponse(BaseModel):
    """Schema for dataset processing response."""
    dataset_id: int
    processing_status: str
    rows_processed: int
    columns_processed: int
    processing_time_seconds: float
    database_table_name: Optional[str]
    errors: List[str]
    warnings: List[str]


class DatasetColumnsResponse(BaseModel):
    """Schema for dataset columns information."""
    dataset_id: int
    columns: List[ColumnInfo]
    suggested_date_column: Optional[str]
    suggested_target_columns: List[str]
    numeric_columns: List[str]
    categorical_columns: List[str]
    date_columns: List[str]
