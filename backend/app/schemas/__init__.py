"""
Pydantic schemas for API validation
"""

from .user import UserCreate, UserUpdate, UserResponse, UserLogin, Token
from .pipeline import PipelineCreate, PipelineUpdate, PipelineResponse
from .dataset import (
    DatasetCreate,
    DatasetUpdate,
    DatasetResponse,
    DatasetAnalysisResponse,
    DatasetProcessingResponse,
    DatasetColumnsResponse,
    DatasetPreviewResponse,
    DatasetValidationResponse
)
from .model import ModelCreate, ModelUpdate, ModelResponse
from .prediction import (
    PredictionCreate,
    PredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    PredictionStatsResponse,
    RealTimePredictionRequest,
    RealTimePredictionResponse
)
from .monitoring import (
    MonitoringResponse,
    SystemStatusResponse,
    PipelineStatusResponse,
    ModelStatusResponse,
    HealthCheckResponse
)

__all__ = [
    # User schemas
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserLogin",
    "Token",

    # Pipeline schemas
    "PipelineCreate",
    "PipelineUpdate",
    "PipelineResponse",

    # Dataset schemas
    "DatasetCreate",
    "DatasetUpdate",
    "DatasetResponse",
    "DatasetAnalysisResponse",
    "DatasetProcessingResponse",
    "DatasetColumnsResponse",
    "DatasetPreviewResponse",
    "DatasetValidationResponse",

    # Model schemas
    "ModelCreate",
    "ModelUpdate",
    "ModelResponse",

    # Prediction schemas
    "PredictionCreate",
    "PredictionResponse",
    "BatchPredictionRequest",
    "BatchPredictionResponse",
    "PredictionStatsResponse",
    "RealTimePredictionRequest",
    "RealTimePredictionResponse",

    # Monitoring schemas
    "MonitoringResponse",
    "SystemStatusResponse",
    "PipelineStatusResponse",
    "ModelStatusResponse",
    "HealthCheckResponse",
]
