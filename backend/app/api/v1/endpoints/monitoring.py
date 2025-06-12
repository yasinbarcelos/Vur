"""
Monitoring endpoints
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.schemas.monitoring import (
    MonitoringResponse,
    MonitoringListResponse,
    SystemStatusResponse,
    PipelineStatusResponse,
    ModelStatusResponse,
    HealthCheckResponse,
    MetricsResponse
)
from app.services.monitoring_service import MonitoringService
from app.services.auth_service import AuthService
from app.models.user import User
from app.models.monitoring import MonitoringLevel, MonitoringCategory
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Perform system health check.

    Returns:
        System health status
    """
    health_data = MonitoringService.get_health_check()
    return HealthCheckResponse(**health_data)


@router.get("/system", response_model=SystemStatusResponse)
async def get_system_status(
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get comprehensive system status.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        System status information
    """
    # Get system metrics
    system_data = MonitoringService.get_system_status()

    # Get pipeline and model counts
    pipeline_statuses = await MonitoringService.get_pipeline_statuses(db)
    model_statuses = await MonitoringService.get_model_statuses(db)

    # Count recent errors (last 24 hours)
    from datetime import timedelta
    start_date = datetime.utcnow() - timedelta(hours=24)
    logs, _ = await MonitoringService.get_logs(
        db,
        level=MonitoringLevel.ERROR,
        start_date=start_date,
        limit=1000
    )

    return SystemStatusResponse(
        status=system_data['status'],
        uptime=system_data['uptime'],
        services=system_data['services'],
        database=system_data['database'],
        memory_usage=system_data['memory_usage'],
        disk_usage=system_data['disk_usage'],
        active_pipelines=len([p for p in pipeline_statuses if p['status'] in ['training', 'configuring']]),
        active_models=len([m for m in model_statuses if m['status'] == 'deployed']),
        recent_errors=len(logs)
    )


@router.get("/pipelines", response_model=List[PipelineStatusResponse])
async def get_pipeline_status(
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get pipeline monitoring status.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of pipeline statuses
    """
    pipeline_statuses = await MonitoringService.get_pipeline_statuses(db)
    return [PipelineStatusResponse(**status) for status in pipeline_statuses]


@router.get("/models", response_model=List[ModelStatusResponse])
async def get_model_status(
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get model monitoring status.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of model statuses
    """
    model_statuses = await MonitoringService.get_model_statuses(db)
    return [ModelStatusResponse(**status) for status in model_statuses]


@router.get("/logs", response_model=MonitoringListResponse)
async def get_logs(
    skip: int = Query(0, ge=0, description="Number of logs to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
    level: Optional[MonitoringLevel] = Query(None, description="Filter by log level"),
    category: Optional[MonitoringCategory] = Query(None, description="Filter by category"),
    service_name: Optional[str] = Query(None, description="Filter by service name"),
    start_date: Optional[datetime] = Query(None, description="Filter from date"),
    end_date: Optional[datetime] = Query(None, description="Filter to date"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get system logs with filtering.

    Args:
        skip: Number of logs to skip
        limit: Number of logs to return
        level: Filter by log level
        category: Filter by category
        service_name: Filter by service name
        start_date: Filter from date
        end_date: Filter to date
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of system logs with pagination info
    """
    logs, total = await MonitoringService.get_logs(
        db, skip, limit, level, category, service_name, start_date, end_date
    )

    return MonitoringListResponse(
        logs=logs,
        total=total,
        page=skip // limit + 1,
        size=len(logs)
    )