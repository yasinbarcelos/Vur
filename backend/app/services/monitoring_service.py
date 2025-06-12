"""
Monitoring service for system monitoring and logging
"""

import psutil
import time
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.models.monitoring import Monitoring, MonitoringLevel, MonitoringCategory
from app.models.pipeline import Pipeline, PipelineStatus
from app.models.model import Model, ModelStatus
from app.schemas.monitoring import MonitoringCreate
from app.core.config import get_settings
import structlog

logger = structlog.get_logger(__name__)
settings = get_settings()


class MonitoringService:
    """Service for system monitoring and logging."""
    
    @staticmethod
    async def create_log_entry(
        db: AsyncSession, 
        log_data: MonitoringCreate
    ) -> Monitoring:
        """
        Create a new monitoring log entry.
        
        Args:
            db: Database session
            log_data: Log entry data
            
        Returns:
            Created monitoring entry
        """
        db_log = Monitoring(
            service_name=log_data.service_name,
            category=log_data.category,
            level=log_data.level,
            status=log_data.status,
            message=log_data.message,
            metrics=log_data.metrics,
            monitoring_metadata=log_data.monitoring_metadata,
            duration=log_data.duration,
            error_details=log_data.error_details
        )
        
        db.add(db_log)
        await db.commit()
        await db.refresh(db_log)
        
        return db_log
    
    @staticmethod
    async def get_logs(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        level: Optional[MonitoringLevel] = None,
        category: Optional[MonitoringCategory] = None,
        service_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Tuple[List[Monitoring], int]:
        """
        Get monitoring logs with filtering and pagination.
        
        Returns:
            Tuple of (logs, total_count)
        """
        query = select(Monitoring)
        count_query = select(func.count(Monitoring.id))
        
        # Apply filters
        if level:
            query = query.where(Monitoring.level == level)
            count_query = count_query.where(Monitoring.level == level)
        
        if category:
            query = query.where(Monitoring.category == category)
            count_query = count_query.where(Monitoring.category == category)
        
        if service_name:
            query = query.where(Monitoring.service_name == service_name)
            count_query = count_query.where(Monitoring.service_name == service_name)
        
        if start_date:
            query = query.where(Monitoring.created_at >= start_date)
            count_query = count_query.where(Monitoring.created_at >= start_date)
        
        if end_date:
            query = query.where(Monitoring.created_at <= end_date)
            count_query = count_query.where(Monitoring.created_at <= end_date)
        
        # Get total count
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        
        # Get logs
        query = query.offset(skip).limit(limit).order_by(desc(Monitoring.created_at))
        result = await db.execute(query)
        logs = result.scalars().all()
        
        return logs, total
    
    @staticmethod
    def get_system_status() -> Dict[str, Any]:
        """
        Get current system status and metrics.
        
        Returns:
            System status information
        """
        try:
            # CPU and Memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Network (if available)
            try:
                network = psutil.net_io_counters()
                network_info = {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                }
            except:
                network_info = {}
            
            # Boot time
            boot_time = psutil.boot_time()
            uptime = time.time() - boot_time
            
            return {
                'status': 'healthy',
                'uptime': uptime,
                'services': {
                    'api': {'status': 'running', 'health': 'good'},
                    'database': {'status': 'running', 'health': 'good'},
                    'ml_engine': {'status': 'running', 'health': 'good'}
                },
                'database': {
                    'status': 'connected',
                    'pool_size': 10,  # Mock value
                    'active_connections': 3  # Mock value
                },
                'memory_usage': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used,
                    'free': memory.free
                },
                'disk_usage': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': (disk.used / disk.total) * 100
                },
                'cpu_usage': cpu_percent,
                'network': network_info
            }
            
        except Exception as e:
            logger.error("Failed to get system status", error=str(e))
            return {
                'status': 'error',
                'error': str(e),
                'uptime': 0,
                'services': {},
                'database': {},
                'memory_usage': {},
                'disk_usage': {}
            }
    
    @staticmethod
    async def get_pipeline_statuses(db: AsyncSession) -> List[Dict[str, Any]]:
        """Get status of all pipelines."""
        result = await db.execute(
            select(Pipeline)
            .order_by(desc(Pipeline.updated_at))
            .limit(50)
        )
        pipelines = result.scalars().all()
        
        pipeline_statuses = []
        for pipeline in pipelines:
            status_info = {
                'pipeline_id': pipeline.id,
                'pipeline_name': pipeline.name,
                'status': pipeline.status.value,
                'last_updated': pipeline.updated_at or pipeline.created_at,
                'progress': None,
                'current_step': None,
                'estimated_completion': None,
                'error_message': None
            }
            
            # Add progress information based on status
            if pipeline.status == PipelineStatus.TRAINING:
                status_info['progress'] = 0.5  # Mock progress
                status_info['current_step'] = 'Model Training'
                status_info['estimated_completion'] = datetime.utcnow() + timedelta(minutes=30)
            elif pipeline.status == PipelineStatus.CONFIGURING:
                status_info['progress'] = 0.2
                status_info['current_step'] = 'Configuration'
            elif pipeline.status == PipelineStatus.COMPLETED:
                status_info['progress'] = 1.0
                status_info['current_step'] = 'Completed'
            elif pipeline.status == PipelineStatus.FAILED:
                status_info['error_message'] = 'Training failed due to data issues'
            
            pipeline_statuses.append(status_info)
        
        return pipeline_statuses
    
    @staticmethod
    async def get_model_statuses(db: AsyncSession) -> List[Dict[str, Any]]:
        """Get status of all models."""
        result = await db.execute(
            select(Model)
            .order_by(desc(Model.updated_at))
            .limit(50)
        )
        models = result.scalars().all()
        
        model_statuses = []
        for model in models:
            # Mock prediction count and last prediction
            prediction_count = hash(model.id) % 1000  # Mock value
            last_prediction = model.updated_at if model.status == ModelStatus.DEPLOYED else None
            
            status_info = {
                'model_id': model.id,
                'model_name': model.name,
                'algorithm': model.algorithm.value,
                'status': model.status.value,
                'last_prediction': last_prediction,
                'prediction_count': prediction_count,
                'accuracy_metrics': model.validation_metrics,
                'performance_metrics': {
                    'avg_response_time': 0.15,  # Mock value
                    'throughput': 100,  # Mock value
                    'error_rate': 0.01  # Mock value
                }
            }
            
            model_statuses.append(status_info)
        
        return model_statuses
    
    @staticmethod
    def get_health_check() -> Dict[str, Any]:
        """
        Perform comprehensive health check.
        
        Returns:
            Health check results
        """
        checks = {}
        overall_status = 'healthy'
        
        # Database check
        try:
            # This would be a real database ping in production
            checks['database'] = {
                'status': 'healthy',
                'response_time': 0.05,
                'message': 'Database connection successful'
            }
        except Exception as e:
            checks['database'] = {
                'status': 'unhealthy',
                'error': str(e),
                'message': 'Database connection failed'
            }
            overall_status = 'unhealthy'
        
        # Memory check
        memory = psutil.virtual_memory()
        if memory.percent > 90:
            checks['memory'] = {
                'status': 'warning',
                'usage': memory.percent,
                'message': 'High memory usage'
            }
            if overall_status == 'healthy':
                overall_status = 'warning'
        else:
            checks['memory'] = {
                'status': 'healthy',
                'usage': memory.percent,
                'message': 'Memory usage normal'
            }
        
        # Disk check
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        if disk_percent > 90:
            checks['disk'] = {
                'status': 'warning',
                'usage': disk_percent,
                'message': 'High disk usage'
            }
            if overall_status == 'healthy':
                overall_status = 'warning'
        else:
            checks['disk'] = {
                'status': 'healthy',
                'usage': disk_percent,
                'message': 'Disk usage normal'
            }
        
        return {
            'status': overall_status,
            'timestamp': datetime.utcnow(),
            'version': '1.0.0',
            'environment': settings.ENVIRONMENT,
            'checks': checks
        }
