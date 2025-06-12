"""
Monitoring schemas for API validation
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.monitoring import MonitoringLevel, MonitoringCategory


class MonitoringBase(BaseModel):
    """Base monitoring schema."""
    service_name: str = Field(..., max_length=100, description="Service name")
    category: MonitoringCategory = Field(..., description="Monitoring category")
    level: MonitoringLevel = Field(..., description="Log level")
    status: str = Field(..., max_length=50, description="Status")
    message: str = Field(..., description="Log message")


class MonitoringCreate(MonitoringBase):
    """Schema for creating monitoring entry."""
    metrics: Optional[Dict[str, Any]] = Field(None, description="Performance metrics")
    monitoring_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    duration: Optional[float] = Field(None, description="Operation duration in seconds")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Error details")


class MonitoringResponse(MonitoringBase):
    """Schema for monitoring response."""
    id: int
    metrics: Optional[Dict[str, Any]]
    monitoring_metadata: Optional[Dict[str, Any]]
    duration: Optional[float]
    error_details: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True


class MonitoringListResponse(BaseModel):
    """Schema for monitoring list response."""
    logs: List[MonitoringResponse]
    total: int
    page: int
    size: int


class SystemStatusResponse(BaseModel):
    """Schema for system status response."""
    status: str
    uptime: float
    services: Dict[str, Dict[str, Any]]
    database: Dict[str, Any]
    memory_usage: Dict[str, Any]
    disk_usage: Dict[str, Any]
    active_pipelines: int
    active_models: int
    recent_errors: int


class PipelineStatusResponse(BaseModel):
    """Schema for pipeline status monitoring."""
    pipeline_id: int
    pipeline_name: str
    status: str
    last_updated: datetime
    progress: Optional[float] = None
    current_step: Optional[str] = None
    estimated_completion: Optional[datetime] = None
    error_message: Optional[str] = None


class ModelStatusResponse(BaseModel):
    """Schema for model status monitoring."""
    model_id: int
    model_name: str
    algorithm: str
    status: str
    last_prediction: Optional[datetime] = None
    prediction_count: int
    accuracy_metrics: Optional[Dict[str, float]] = None
    performance_metrics: Optional[Dict[str, float]] = None


class HealthCheckResponse(BaseModel):
    """Schema for health check response."""
    status: str
    timestamp: datetime
    version: str
    environment: str
    checks: Dict[str, Dict[str, Any]]


class MetricsResponse(BaseModel):
    """Schema for system metrics response."""
    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, float]
    database_connections: int
    active_requests: int
    response_times: Dict[str, float]


class AlertResponse(BaseModel):
    """Schema for alert response."""
    id: int
    alert_type: str
    severity: str
    title: str
    message: str
    service_name: str
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    is_active: bool
    metadata: Optional[Dict[str, Any]] = None
