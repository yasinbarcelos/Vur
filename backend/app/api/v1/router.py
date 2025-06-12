"""
Main API v1 router
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, pipelines, datasets, models, monitoring

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

api_router.include_router(
    pipelines.router,
    prefix="/pipelines",
    tags=["Pipelines"]
)

api_router.include_router(
    datasets.router,
    prefix="/datasets",
    tags=["Datasets"]
)

api_router.include_router(
    models.router,
    prefix="/models",
    tags=["Models"]
)

api_router.include_router(
    monitoring.router,
    prefix="/monitoring",
    tags=["Monitoring"]
) 