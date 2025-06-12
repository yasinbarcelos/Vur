"""
Monitoring model for system monitoring and logging
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Enum, Float
from sqlalchemy.sql import func

from app.core.database import Base


class MonitoringLevel(enum.Enum):
    """Monitoring level enumeration."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MonitoringCategory(enum.Enum):
    """Monitoring category enumeration."""
    SYSTEM = "system"
    APPLICATION = "application"
    DATABASE = "database"
    ML_PIPELINE = "ml_pipeline"
    API = "api"
    SECURITY = "security"


class Monitoring(Base):
    """
    Model for system monitoring, logging, and performance tracking.

    Attributes:
        id: Primary key
        service_name: Name of the service/component
        category: Category of monitoring event
        level: Severity level
        status: Current status
        message: Log message
        metrics: Performance metrics (JSON)
        monitoring_metadata: Additional metadata
        duration: Operation duration in seconds
        error_details: Error details if applicable
        created_at: Event timestamp
    """
    __tablename__ = "monitoring"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Service information
    service_name = Column(String(100), nullable=False, index=True)
    category = Column(Enum(MonitoringCategory), default=MonitoringCategory.SYSTEM, nullable=False, index=True)
    level = Column(Enum(MonitoringLevel), default=MonitoringLevel.INFO, nullable=False, index=True)

    # Status and message
    status = Column(String(50), nullable=False, index=True)
    message = Column(Text, nullable=False)

    # Performance and metrics
    metrics = Column(JSON, nullable=True)  # Performance metrics, counters, etc.
    monitoring_metadata = Column(JSON, nullable=True)  # Additional context
    duration = Column(Float, nullable=True)  # Operation duration in seconds

    # Error handling
    error_details = Column(JSON, nullable=True)  # Stack trace, error codes, etc.

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<Monitoring(id={self.id}, service='{self.service_name}', level='{self.level.value}', status='{self.status}')>"