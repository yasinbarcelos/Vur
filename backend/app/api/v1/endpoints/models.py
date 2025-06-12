"""
ML Model endpoints
"""

from typing import List
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.schemas.model import (
    ModelCreate,
    ModelUpdate,
    ModelResponse,
    ModelListResponse,
    ModelTrainingRequest,
    ModelTrainingResponse,
    ModelPredictionRequest,
    ModelPredictionResponse,
    ModelMetricsResponse
)
from app.services.model_service import ModelService
from app.services.auth_service import AuthService
from app.models.user import User
from app.models.model import ModelStatus
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=ModelListResponse)
async def list_models(
    skip: int = Query(0, ge=0, description="Number of models to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of models to return"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List user's models with pagination.

    Args:
        skip: Number of models to skip
        limit: Number of models to return
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of user's models with pagination info
    """
    models, total = await ModelService.get_models_by_owner(
        db, current_user.id, skip, limit
    )

    return ModelListResponse(
        models=models,
        total=total,
        page=skip // limit + 1,
        size=len(models)
    )


@router.post("/train", response_model=ModelTrainingResponse, status_code=status.HTTP_201_CREATED)
async def train_model(
    training_request: ModelTrainingRequest,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Train a new ML model.

    Args:
        training_request: Training configuration
        current_user: Current authenticated user
        db: Database session

    Returns:
        Training job information

    Raises:
        HTTPException: If training fails to start
    """
    model = await ModelService.start_training(db, training_request, current_user.id)

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found or access denied"
        )

    logger.info("Model training started via API", model_id=model.id, user_id=current_user.id)

    return ModelTrainingResponse(
        model_id=model.id,
        status="training",
        message="Model training started successfully",
        training_job_id=f"job_{model.id}_{int(model.created_at.timestamp())}"
    )


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get model details.

    Args:
        model_id: Model ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Model information

    Raises:
        HTTPException: If model not found or access denied
    """
    model = await ModelService.get_model_by_id(db, model_id)

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Check ownership (or admin access)
    if model.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return model


@router.get("/{model_id}/metrics", response_model=ModelMetricsResponse)
async def get_model_metrics(
    model_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get model performance metrics.

    Args:
        model_id: Model ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Model performance metrics

    Raises:
        HTTPException: If model not found or access denied
    """
    model = await ModelService.get_model_by_id(db, model_id)

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Check ownership (or admin access)
    if model.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return ModelMetricsResponse(
        model_id=model.id,
        training_metrics=model.training_metrics,
        validation_metrics=model.validation_metrics,
        test_metrics=model.test_metrics,
        feature_importance=model.feature_importance,
        training_duration=model.training_duration,
        model_size=model.model_size
    )


@router.post("/{model_id}/predict", response_model=ModelPredictionResponse)
async def make_prediction(
    model_id: int,
    prediction_request: ModelPredictionRequest,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Make prediction using trained model.

    Args:
        model_id: Model ID
        prediction_request: Prediction input data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Prediction results

    Raises:
        HTTPException: If model not found, access denied, or not trained
    """
    model = await ModelService.get_model_by_id(db, model_id)

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # Check ownership (or admin access)
    if model.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Check if model is trained
    if model.status != ModelStatus.TRAINED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model is not trained. Current status: {model.status.value}"
        )

    # TODO: Implement actual prediction logic
    # For now, return mock predictions
    import random
    from datetime import datetime, timedelta

    predictions = []
    confidence_intervals = [] if prediction_request.include_confidence else None

    for i in range(prediction_request.prediction_steps):
        pred_value = random.uniform(10, 100)
        predictions.append({
            'step': i + 1,
            'predicted_value': pred_value,
            'timestamp': (datetime.utcnow() + timedelta(days=i)).isoformat()
        })

        if prediction_request.include_confidence:
            confidence_intervals.append({
                'step': i + 1,
                'lower_bound': pred_value * 0.9,
                'upper_bound': pred_value * 1.1,
                'confidence_level': 0.95
            })

    logger.info("Prediction made via API", model_id=model.id, steps=prediction_request.prediction_steps)

    return ModelPredictionResponse(
        predictions=predictions,
        model_id=model.id,
        prediction_date=datetime.utcnow(),
        confidence_intervals=confidence_intervals,
        metadata={
            'algorithm': model.algorithm.value,
            'model_version': model.version,
            'input_features': list(prediction_request.input_data.keys())
        }
    )