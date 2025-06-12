"""
Pipeline schemas for API validation
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.pipeline import PipelineStatus, PipelineType


class PipelineBase(BaseModel):
    """Base pipeline schema."""
    name: str = Field(..., min_length=1, max_length=200, description="Pipeline name")
    description: Optional[str] = Field(None, max_length=1000, description="Pipeline description")
    pipeline_type: PipelineType = Field(default=PipelineType.UNIVARIATE, description="Pipeline type")
    target_column: Optional[str] = Field(None, max_length=100, description="Target column name")
    date_column: Optional[str] = Field(None, max_length=100, description="Date column name")
    features: Optional[List[str]] = Field(None, description="List of feature column names")
    algorithm: Optional[str] = Field(None, max_length=50, description="ML algorithm")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Algorithm hyperparameters")


class PipelineCreate(PipelineBase):
    """Schema for creating a new pipeline."""
    dataset_id: Optional[int] = Field(None, description="Associated dataset ID")
    configuration: Optional[Dict[str, Any]] = Field(None, description="Pipeline configuration")


class PipelineUpdate(BaseModel):
    """Schema for updating pipeline information."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Pipeline name")
    description: Optional[str] = Field(None, max_length=1000, description="Pipeline description")
    pipeline_type: Optional[PipelineType] = Field(None, description="Pipeline type")
    status: Optional[PipelineStatus] = Field(None, description="Pipeline status")
    target_column: Optional[str] = Field(None, max_length=100, description="Target column name")
    date_column: Optional[str] = Field(None, max_length=100, description="Date column name")
    features: Optional[List[str]] = Field(None, description="List of feature column names")
    algorithm: Optional[str] = Field(None, max_length=50, description="ML algorithm")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Algorithm hyperparameters")
    configuration: Optional[Dict[str, Any]] = Field(None, description="Pipeline configuration")
    metrics: Optional[Dict[str, Any]] = Field(None, description="Pipeline metrics")


class PipelineResponse(PipelineBase):
    """Schema for pipeline response."""
    id: int
    status: PipelineStatus
    configuration: Optional[Dict[str, Any]]
    metrics: Optional[Dict[str, Any]]
    owner_id: int
    dataset_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PipelineListResponse(BaseModel):
    """Schema for pipeline list response."""
    pipelines: List[PipelineResponse]
    total: int
    page: int
    size: int
    
    
class PipelineStatusUpdate(BaseModel):
    """Schema for updating pipeline status."""
    status: PipelineStatus = Field(..., description="New pipeline status")
    message: Optional[str] = Field(None, description="Status update message")
