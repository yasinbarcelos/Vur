"""
Pipeline endpoints
"""

from typing import List
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineUpdate,
    PipelineResponse,
    PipelineListResponse,
    PipelineStatusUpdate
)
from app.services.pipeline_service import PipelineService
from app.services.auth_service import AuthService
from app.models.user import User
from app.models.pipeline import PipelineStatus
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=PipelineListResponse)
async def list_pipelines(
    skip: int = Query(0, ge=0, description="Number of pipelines to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of pipelines to return"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List user's pipelines with pagination.

    Args:
        skip: Number of pipelines to skip
        limit: Number of pipelines to return
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of user's pipelines with pagination info
    """
    pipelines, total = await PipelineService.get_pipelines_by_owner(
        db, current_user.id, skip, limit
    )

    return PipelineListResponse(
        pipelines=pipelines,
        total=total,
        page=skip // limit + 1,
        size=len(pipelines)
    )


@router.post("/", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    pipeline_data: PipelineCreate,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new pipeline.

    Args:
        pipeline_data: Pipeline creation data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created pipeline information
    """
    pipeline = await PipelineService.create_pipeline(db, pipeline_data, current_user.id)
    logger.info("Pipeline created via API", pipeline_id=pipeline.id, user_id=current_user.id)
    return pipeline


@router.get("/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    pipeline_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get pipeline details.

    Args:
        pipeline_id: Pipeline ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Pipeline information

    Raises:
        HTTPException: If pipeline not found or access denied
    """
    pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found"
        )

    # Check ownership (or admin access)
    if pipeline.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return pipeline


@router.put("/{pipeline_id}", response_model=PipelineResponse)
async def update_pipeline(
    pipeline_id: int,
    pipeline_data: PipelineUpdate,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update pipeline.

    Args:
        pipeline_id: Pipeline ID
        pipeline_data: Updated pipeline data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated pipeline information

    Raises:
        HTTPException: If pipeline not found or access denied
    """
    pipeline = await PipelineService.update_pipeline(
        db, pipeline_id, pipeline_data, current_user.id
    )

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found or access denied"
        )

    logger.info("Pipeline updated via API", pipeline_id=pipeline.id, user_id=current_user.id)
    return pipeline


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline(
    pipeline_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Delete pipeline.

    Args:
        pipeline_id: Pipeline ID
        current_user: Current authenticated user
        db: Database session

    Raises:
        HTTPException: If pipeline not found or access denied
    """
    success = await PipelineService.delete_pipeline(db, pipeline_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found or access denied"
        )

    logger.info("Pipeline deleted via API", pipeline_id=pipeline_id, user_id=current_user.id)