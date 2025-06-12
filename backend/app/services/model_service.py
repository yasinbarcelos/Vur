"""
Model service for business logic
"""

import os
import time
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.model import Model, ModelStatus, ModelAlgorithm
from app.models.pipeline import Pipeline
from app.schemas.model import ModelCreate, ModelUpdate, ModelTrainingRequest
import structlog

logger = structlog.get_logger(__name__)


class ModelService:
    """Service for model management."""
    
    @staticmethod
    async def create_model(
        db: AsyncSession, 
        model_data: ModelCreate, 
        owner_id: int
    ) -> Model:
        """
        Create a new model.
        
        Args:
            db: Database session
            model_data: Model creation data
            owner_id: Owner user ID
            
        Returns:
            Created model
        """
        db_model = Model(
            name=model_data.name,
            description=model_data.description,
            algorithm=model_data.algorithm,
            status=ModelStatus.CREATED,
            version=model_data.version,
            hyperparameters=model_data.hyperparameters,
            pipeline_id=model_data.pipeline_id,
            owner_id=owner_id
        )
        
        db.add(db_model)
        await db.commit()
        await db.refresh(db_model)
        
        logger.info("Model created successfully", model_id=db_model.id, name=db_model.name)
        return db_model
    
    @staticmethod
    async def get_model_by_id(db: AsyncSession, model_id: int) -> Optional[Model]:
        """Get model by ID."""
        result = await db.execute(
            select(Model)
            .options(selectinload(Model.owner), selectinload(Model.pipeline))
            .where(Model.id == model_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_models_by_owner(
        db: AsyncSession, 
        owner_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Model], int]:
        """
        Get models by owner with pagination.
        
        Returns:
            Tuple of (models, total_count)
        """
        # Get total count
        count_result = await db.execute(
            select(func.count(Model.id)).where(Model.owner_id == owner_id)
        )
        total = count_result.scalar()
        
        # Get models
        result = await db.execute(
            select(Model)
            .options(selectinload(Model.pipeline))
            .where(Model.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .order_by(Model.created_at.desc())
        )
        models = result.scalars().all()
        
        return models, total
    
    @staticmethod
    async def get_models_by_pipeline(
        db: AsyncSession, 
        pipeline_id: int, 
        owner_id: int
    ) -> List[Model]:
        """Get models by pipeline ID."""
        result = await db.execute(
            select(Model)
            .where(Model.pipeline_id == pipeline_id, Model.owner_id == owner_id)
            .order_by(Model.created_at.desc())
        )
        return result.scalars().all()
    
    @staticmethod
    async def update_model(
        db: AsyncSession, 
        model_id: int, 
        model_data: ModelUpdate,
        owner_id: int
    ) -> Optional[Model]:
        """
        Update model information.
        
        Args:
            db: Database session
            model_id: Model ID
            model_data: Update data
            owner_id: Owner user ID (for authorization)
            
        Returns:
            Updated model or None if not found/unauthorized
        """
        model = await ModelService.get_model_by_id(db, model_id)
        if not model or model.owner_id != owner_id:
            return None
        
        # Update fields
        update_data = model_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(model, field, value)
        
        model.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(model)
        
        logger.info("Model updated successfully", model_id=model.id)
        return model
    
    @staticmethod
    async def delete_model(
        db: AsyncSession, 
        model_id: int, 
        owner_id: int
    ) -> bool:
        """
        Delete a model.
        
        Args:
            db: Database session
            model_id: Model ID
            owner_id: Owner user ID (for authorization)
            
        Returns:
            True if deleted, False if not found/unauthorized
        """
        model = await ModelService.get_model_by_id(db, model_id)
        if not model or model.owner_id != owner_id:
            return False
        
        # Delete model file if exists
        if model.model_path and os.path.exists(model.model_path):
            try:
                os.remove(model.model_path)
            except Exception as e:
                logger.warning("Failed to delete model file", file_path=model.model_path, error=str(e))
        
        await db.delete(model)
        await db.commit()
        
        logger.info("Model deleted successfully", model_id=model_id)
        return True
    
    @staticmethod
    async def update_model_status(
        db: AsyncSession, 
        model_id: int, 
        status: ModelStatus,
        owner_id: int
    ) -> Optional[Model]:
        """
        Update model status.
        
        Args:
            db: Database session
            model_id: Model ID
            status: New status
            owner_id: Owner user ID (for authorization)
            
        Returns:
            Updated model or None if not found/unauthorized
        """
        model = await ModelService.get_model_by_id(db, model_id)
        if not model or model.owner_id != owner_id:
            return None
        
        old_status = model.status
        model.status = status
        model.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(model)
        
        logger.info(
            "Model status updated", 
            model_id=model.id, 
            old_status=old_status.value,
            new_status=status.value
        )
        return model
    
    @staticmethod
    async def start_training(
        db: AsyncSession,
        training_request: ModelTrainingRequest,
        owner_id: int
    ) -> Optional[Model]:
        """
        Start model training.
        
        Args:
            db: Database session
            training_request: Training configuration
            owner_id: Owner user ID
            
        Returns:
            Created model or None if pipeline not found/unauthorized
        """
        # Verify pipeline ownership
        pipeline_result = await db.execute(
            select(Pipeline).where(
                Pipeline.id == training_request.pipeline_id,
                Pipeline.owner_id == owner_id
            )
        )
        pipeline = pipeline_result.scalar_one_or_none()
        
        if not pipeline:
            return None
        
        # Create model for training
        model_data = ModelCreate(
            name=f"{pipeline.name} - {training_request.algorithm.value}",
            description=f"Model trained with {training_request.algorithm.value} algorithm",
            algorithm=training_request.algorithm,
            pipeline_id=training_request.pipeline_id,
            hyperparameters=training_request.hyperparameters
        )
        
        model = await ModelService.create_model(db, model_data, owner_id)
        
        # Update status to training
        await ModelService.update_model_status(db, model.id, ModelStatus.TRAINING, owner_id)
        
        # TODO: Implement actual training logic here
        # For now, we'll simulate training completion
        logger.info("Model training started", model_id=model.id, algorithm=training_request.algorithm.value)
        
        return model
    
    @staticmethod
    def simulate_training_completion(model: Model) -> Dict[str, Any]:
        """
        Simulate training completion with mock metrics.
        This would be replaced with actual ML training logic.
        
        Args:
            model: Model to simulate training for
            
        Returns:
            Mock training results
        """
        import random
        
        # Simulate training time
        training_duration = random.uniform(10, 300)  # 10 seconds to 5 minutes
        
        # Mock metrics based on algorithm
        if model.algorithm in [ModelAlgorithm.ARIMA, ModelAlgorithm.SARIMA]:
            metrics = {
                'mae': random.uniform(0.1, 2.0),
                'mse': random.uniform(0.5, 10.0),
                'rmse': random.uniform(0.7, 3.2),
                'mape': random.uniform(5.0, 25.0),
                'aic': random.uniform(100, 500),
                'bic': random.uniform(110, 520)
            }
        elif model.algorithm == ModelAlgorithm.PROPHET:
            metrics = {
                'mae': random.uniform(0.2, 1.8),
                'mse': random.uniform(0.8, 8.0),
                'rmse': random.uniform(0.9, 2.8),
                'mape': random.uniform(8.0, 20.0),
                'coverage': random.uniform(0.85, 0.95)
            }
        else:  # Neural networks and other algorithms
            metrics = {
                'mae': random.uniform(0.15, 1.5),
                'mse': random.uniform(0.6, 6.0),
                'rmse': random.uniform(0.8, 2.5),
                'mape': random.uniform(6.0, 18.0),
                'r2_score': random.uniform(0.7, 0.95),
                'loss': random.uniform(0.1, 1.0)
            }
        
        return {
            'training_metrics': metrics,
            'validation_metrics': {k: v * random.uniform(0.9, 1.1) for k, v in metrics.items()},
            'training_duration': training_duration,
            'model_size': random.randint(1024, 10485760)  # 1KB to 10MB
        }
