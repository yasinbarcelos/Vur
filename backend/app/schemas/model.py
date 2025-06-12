"""
Model schemas for API validation
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.model import ModelStatus, ModelAlgorithm


class ModelBase(BaseModel):
    """Base model schema."""
    name: str = Field(..., min_length=1, max_length=200, description="Model name")
    description: Optional[str] = Field(None, max_length=1000, description="Model description")
    algorithm: ModelAlgorithm = Field(..., description="ML algorithm")
    version: str = Field(default="1.0.0", max_length=20, description="Model version")


class ModelCreate(ModelBase):
    """Schema for creating a new model."""
    pipeline_id: int = Field(..., description="Associated pipeline ID")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Training hyperparameters")


class ModelUpdate(BaseModel):
    """Schema for updating model information."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Model name")
    description: Optional[str] = Field(None, max_length=1000, description="Model description")
    status: Optional[ModelStatus] = Field(None, description="Model status")
    version: Optional[str] = Field(None, max_length=20, description="Model version")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Training hyperparameters")
    training_metrics: Optional[Dict[str, Any]] = Field(None, description="Training metrics")
    validation_metrics: Optional[Dict[str, Any]] = Field(None, description="Validation metrics")
    test_metrics: Optional[Dict[str, Any]] = Field(None, description="Test metrics")
    feature_importance: Optional[Dict[str, Any]] = Field(None, description="Feature importance")
    training_duration: Optional[float] = Field(None, description="Training duration in seconds")


class ModelResponse(ModelBase):
    """Schema for model response."""
    id: int
    status: ModelStatus
    model_path: Optional[str]
    model_size: Optional[int]
    hyperparameters: Optional[Dict[str, Any]]
    training_metrics: Optional[Dict[str, Any]]
    validation_metrics: Optional[Dict[str, Any]]
    test_metrics: Optional[Dict[str, Any]]
    feature_importance: Optional[Dict[str, Any]]
    training_duration: Optional[float]
    pipeline_id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ModelListResponse(BaseModel):
    """Schema for model list response."""
    models: List[ModelResponse]
    total: int
    page: int
    size: int


class ModelTrainingRequest(BaseModel):
    """Schema for model training request."""
    pipeline_id: int = Field(..., description="Pipeline ID to train model for")
    algorithm: ModelAlgorithm = Field(..., description="ML algorithm to use")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Training hyperparameters")
    train_test_split: float = Field(default=0.8, ge=0.1, le=0.9, description="Train/test split ratio")
    validation_split: float = Field(default=0.2, ge=0.1, le=0.5, description="Validation split ratio")


class ModelTrainingResponse(BaseModel):
    """Schema for model training response."""
    model_id: int
    status: str
    message: str
    training_job_id: Optional[str] = None


class ModelPredictionRequest(BaseModel):
    """Schema for model prediction request."""
    input_data: Dict[str, Any] = Field(..., description="Input data for prediction")
    prediction_steps: int = Field(default=1, ge=1, le=100, description="Number of steps to predict")
    include_confidence: bool = Field(default=True, description="Include confidence intervals")


class ModelPredictionResponse(BaseModel):
    """Schema for model prediction response."""
    predictions: List[Dict[str, Any]]
    model_id: int
    prediction_date: datetime
    confidence_intervals: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None


class ModelMetricsResponse(BaseModel):
    """Schema for model metrics response."""
    model_id: int
    training_metrics: Optional[Dict[str, Any]]
    validation_metrics: Optional[Dict[str, Any]]
    test_metrics: Optional[Dict[str, Any]]
    feature_importance: Optional[Dict[str, Any]]
    training_duration: Optional[float]
    model_size: Optional[int]


class ModelStatusUpdate(BaseModel):
    """Schema for updating model status."""
    status: ModelStatus = Field(..., description="New model status")
    message: Optional[str] = Field(None, description="Status update message")
