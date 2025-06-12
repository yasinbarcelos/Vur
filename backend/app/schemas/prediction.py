"""
Prediction schemas for API validation
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.prediction import PredictionType, PredictionStatus


class PredictionBase(BaseModel):
    """Base prediction schema."""
    prediction_type: PredictionType = Field(default=PredictionType.SINGLE_STEP, description="Prediction type")
    predicted_value: float = Field(..., description="Predicted value")
    confidence_lower: Optional[float] = Field(None, description="Lower confidence bound")
    confidence_upper: Optional[float] = Field(None, description="Upper confidence bound")
    prediction_date: datetime = Field(..., description="Date/time for prediction")


class PredictionCreate(PredictionBase):
    """Schema for creating a new prediction."""
    model_id: int = Field(..., description="Model ID used for prediction")
    input_features: Optional[Dict[str, Any]] = Field(None, description="Input features")
    prediction_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class PredictionUpdate(BaseModel):
    """Schema for updating prediction information."""
    status: Optional[PredictionStatus] = Field(None, description="Prediction status")
    predicted_value: Optional[float] = Field(None, description="Predicted value")
    confidence_lower: Optional[float] = Field(None, description="Lower confidence bound")
    confidence_upper: Optional[float] = Field(None, description="Upper confidence bound")
    input_features: Optional[Dict[str, Any]] = Field(None, description="Input features")
    prediction_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class PredictionResponse(PredictionBase):
    """Schema for prediction response."""
    id: int
    status: PredictionStatus
    input_features: Optional[Dict[str, Any]]
    prediction_metadata: Optional[Dict[str, Any]]
    error_message: Optional[str]
    model_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class PredictionListResponse(BaseModel):
    """Schema for prediction list response."""
    predictions: List[PredictionResponse]
    total: int
    page: int
    size: int


class BatchPredictionRequest(BaseModel):
    """Schema for batch prediction request."""
    model_id: int = Field(..., description="Model ID to use for predictions")
    input_data: List[Dict[str, Any]] = Field(..., description="List of input data for predictions")
    prediction_dates: Optional[List[datetime]] = Field(None, description="Prediction dates")
    include_confidence: bool = Field(default=True, description="Include confidence intervals")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class BatchPredictionResponse(BaseModel):
    """Schema for batch prediction response."""
    predictions: List[PredictionResponse]
    model_id: int
    batch_id: str
    status: str
    total_predictions: int
    successful_predictions: int
    failed_predictions: int
    created_at: datetime


class PredictionStatsResponse(BaseModel):
    """Schema for prediction statistics response."""
    total_predictions: int
    predictions_today: int
    predictions_this_week: int
    predictions_this_month: int
    average_confidence: Optional[float]
    accuracy_metrics: Optional[Dict[str, float]]
    model_performance: Dict[int, Dict[str, Any]]  # model_id -> performance metrics


class RealTimePredictionRequest(BaseModel):
    """Schema for real-time prediction request."""
    model_id: int = Field(..., description="Model ID to use")
    features: Dict[str, Any] = Field(..., description="Input features")
    prediction_horizon: int = Field(default=1, ge=1, le=30, description="Number of time steps to predict")
    confidence_level: float = Field(default=0.95, ge=0.5, le=0.99, description="Confidence level")


class RealTimePredictionResponse(BaseModel):
    """Schema for real-time prediction response."""
    predictions: List[Dict[str, Any]]
    model_info: Dict[str, Any]
    prediction_metadata: Dict[str, Any]
    processing_time: float
    timestamp: datetime
