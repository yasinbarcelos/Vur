"""
Pipeline service for business logic
"""

from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.pipeline import Pipeline, PipelineStatus
from app.models.user import User
from app.schemas.pipeline import PipelineCreate, PipelineUpdate
import structlog

logger = structlog.get_logger(__name__)


class PipelineService:
    """Service for pipeline management."""
    
    @staticmethod
    async def create_pipeline(
        db: AsyncSession, 
        pipeline_data: PipelineCreate, 
        owner_id: int
    ) -> Pipeline:
        """
        Create a new pipeline.
        
        Args:
            db: Database session
            pipeline_data: Pipeline creation data
            owner_id: Owner user ID
            
        Returns:
            Created pipeline
        """
        db_pipeline = Pipeline(
            name=pipeline_data.name,
            description=pipeline_data.description,
            pipeline_type=pipeline_data.pipeline_type,
            status=PipelineStatus.CREATED,
            configuration=pipeline_data.configuration,
            target_column=pipeline_data.target_column,
            date_column=pipeline_data.date_column,
            features=pipeline_data.features,
            algorithm=pipeline_data.algorithm,
            hyperparameters=pipeline_data.hyperparameters,
            owner_id=owner_id,
            dataset_id=pipeline_data.dataset_id
        )
        
        db.add(db_pipeline)
        await db.commit()
        await db.refresh(db_pipeline)
        
        logger.info("Pipeline created successfully", pipeline_id=db_pipeline.id, name=db_pipeline.name)
        return db_pipeline
    
    @staticmethod
    async def get_pipeline_by_id(db: AsyncSession, pipeline_id: int) -> Optional[Pipeline]:
        """Get pipeline by ID."""
        result = await db.execute(
            select(Pipeline)
            .options(selectinload(Pipeline.owner), selectinload(Pipeline.dataset))
            .where(Pipeline.id == pipeline_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_pipelines_by_owner(
        db: AsyncSession, 
        owner_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Pipeline], int]:
        """
        Get pipelines by owner with pagination.
        
        Returns:
            Tuple of (pipelines, total_count)
        """
        # Get total count
        count_result = await db.execute(
            select(func.count(Pipeline.id)).where(Pipeline.owner_id == owner_id)
        )
        total = count_result.scalar()
        
        # Get pipelines
        result = await db.execute(
            select(Pipeline)
            .options(selectinload(Pipeline.dataset))
            .where(Pipeline.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .order_by(Pipeline.created_at.desc())
        )
        pipelines = result.scalars().all()
        
        return pipelines, total
    
    @staticmethod
    async def update_pipeline(
        db: AsyncSession, 
        pipeline_id: int, 
        pipeline_data: PipelineUpdate,
        owner_id: int
    ) -> Optional[Pipeline]:
        """
        Update pipeline information.
        
        Args:
            db: Database session
            pipeline_id: Pipeline ID
            pipeline_data: Update data
            owner_id: Owner user ID (for authorization)
            
        Returns:
            Updated pipeline or None if not found/unauthorized
        """
        pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)
        if not pipeline or pipeline.owner_id != owner_id:
            return None
        
        # Update fields
        update_data = pipeline_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(pipeline, field, value)
        
        pipeline.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(pipeline)
        
        logger.info("Pipeline updated successfully", pipeline_id=pipeline.id)
        return pipeline
    
    @staticmethod
    async def delete_pipeline(
        db: AsyncSession, 
        pipeline_id: int, 
        owner_id: int
    ) -> bool:
        """
        Delete a pipeline.
        
        Args:
            db: Database session
            pipeline_id: Pipeline ID
            owner_id: Owner user ID (for authorization)
            
        Returns:
            True if deleted, False if not found/unauthorized
        """
        pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)
        if not pipeline or pipeline.owner_id != owner_id:
            return False
        
        await db.delete(pipeline)
        await db.commit()
        
        logger.info("Pipeline deleted successfully", pipeline_id=pipeline_id)
        return True
    
    @staticmethod
    async def update_pipeline_status(
        db: AsyncSession, 
        pipeline_id: int, 
        status: PipelineStatus,
        owner_id: int
    ) -> Optional[Pipeline]:
        """
        Update pipeline status.
        
        Args:
            db: Database session
            pipeline_id: Pipeline ID
            status: New status
            owner_id: Owner user ID (for authorization)
            
        Returns:
            Updated pipeline or None if not found/unauthorized
        """
        pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)
        if not pipeline or pipeline.owner_id != owner_id:
            return None
        
        old_status = pipeline.status
        pipeline.status = status
        pipeline.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(pipeline)
        
        logger.info(
            "Pipeline status updated", 
            pipeline_id=pipeline.id, 
            old_status=old_status.value,
            new_status=status.value
        )
        return pipeline
    
    @staticmethod
    async def get_all_pipelines(
        db: AsyncSession, 
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Pipeline], int]:
        """
        Get all pipelines (admin only).
        
        Returns:
            Tuple of (pipelines, total_count)
        """
        # Get total count
        count_result = await db.execute(select(func.count(Pipeline.id)))
        total = count_result.scalar()
        
        # Get pipelines
        result = await db.execute(
            select(Pipeline)
            .options(selectinload(Pipeline.owner), selectinload(Pipeline.dataset))
            .offset(skip)
            .limit(limit)
            .order_by(Pipeline.created_at.desc())
        )
        pipelines = result.scalars().all()
        
        return pipelines, total
