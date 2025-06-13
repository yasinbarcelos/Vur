"""
Pipeline endpoints organizados por etapas do fluxo
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineUpdate,
    PipelineResponse,
    PipelineListResponse,
    PipelineStatusUpdate,
    # Schemas para etapas específicas
    UploadStepData,
    PreviewStepData,
    DivisaoStepData,
    PreprocessingStepData,
    FeaturesStepData,
    ModeloStepData,
    PipelineFlowResponse,
    PipelineStepResponse,
    PipelineStepUpdate,
    CompleteStepResponse,
    PipelineStepUpdateResponse
)
from app.services.pipeline_service import PipelineService
from app.services.auth_service import AuthService
from app.models.user import User
from app.models.pipeline import PipelineStatus
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()

# === ENDPOINTS PRINCIPAIS ===

@router.get("/", response_model=PipelineListResponse)
async def list_pipelines(
    skip: int = Query(0, ge=0, description="Number of pipelines to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of pipelines to return"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List user's pipelines with pagination.
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

@router.post("/", response_model=PipelineFlowResponse, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    pipeline_data: PipelineCreate,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new pipeline with flow structure.
    """
    # Inicializar pipeline com estrutura de etapas
    pipeline_config = {
        "steps_data": {
            "upload": {},
            "preview": {},
            "divisao": {},
            "preprocessing": {},
            "features": {},
            "modelo": {}
        },
        "current_step": "upload",
        "completed_steps": []
    }
    
    pipeline_data.configuration = pipeline_config
    pipeline = await PipelineService.create_pipeline(db, pipeline_data, current_user.id)
    
    logger.info("Pipeline created with flow structure", pipeline_id=pipeline.id, user_id=current_user.id)
    
    return PipelineFlowResponse(
        id=pipeline.id,
        name=pipeline.name,
        status=pipeline.status,
        current_step=pipeline_config["current_step"],
        completed_steps=pipeline_config["completed_steps"],
        steps_data=pipeline_config["steps_data"],
        created_at=pipeline.created_at,
        updated_at=pipeline.updated_at
    )

@router.get("/{pipeline_id}/flow", response_model=PipelineFlowResponse)
async def get_pipeline_flow(
    pipeline_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get complete pipeline flow with all steps data.
    """
    pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found"
        )

    # Check ownership
    if pipeline.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    config = pipeline.configuration or {}
    
    return PipelineFlowResponse(
        id=pipeline.id,
        name=pipeline.name,
        status=pipeline.status,
        current_step=config.get("current_step", "upload"),
        completed_steps=config.get("completed_steps", []),
        steps_data=config.get("steps_data", {}),
        created_at=pipeline.created_at,
        updated_at=pipeline.updated_at
    )

# === ENDPOINTS ESPECÍFICOS POR ETAPA ===

@router.post("/{pipeline_id}/steps/upload", response_model=PipelineStepUpdateResponse)
async def update_upload_step(
    pipeline_id: int,
    step_data: UploadStepData,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualizar etapa de Upload com todos os parâmetros selecionados.
    """
    result = await update_pipeline_step(pipeline_id, "upload", step_data.dict(), current_user, db)
    return PipelineStepUpdateResponse(
        message=result["message"],
        step_data=result["step_data"],
        pipeline_id=result["pipeline_id"],
        step_name="upload"
    )

@router.post("/{pipeline_id}/steps/preview", response_model=PipelineStepUpdateResponse)
async def update_preview_step(
    pipeline_id: int,
    step_data: PreviewStepData,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualizar etapa de Preview com todos os parâmetros selecionados.
    """
    result = await update_pipeline_step(pipeline_id, "preview", step_data.dict(), current_user, db)
    return PipelineStepUpdateResponse(
        message=result["message"],
        step_data=result["step_data"],
        pipeline_id=result["pipeline_id"],
        step_name="preview"
    )

@router.post("/{pipeline_id}/steps/divisao", response_model=PipelineStepUpdateResponse)
async def update_divisao_step(
    pipeline_id: int,
    step_data: DivisaoStepData,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualizar etapa de Divisão dos Dados com todos os parâmetros selecionados.
    """
    result = await update_pipeline_step(pipeline_id, "divisao", step_data.dict(), current_user, db)
    return PipelineStepUpdateResponse(
        message=result["message"],
        step_data=result["step_data"],
        pipeline_id=result["pipeline_id"],
        step_name="divisao"
    )

@router.post("/{pipeline_id}/steps/preprocessing", response_model=PipelineStepUpdateResponse)
async def update_preprocessing_step(
    pipeline_id: int,
    step_data: PreprocessingStepData,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualizar etapa de Preprocessing com todos os parâmetros selecionados.
    """
    result = await update_pipeline_step(pipeline_id, "preprocessing", step_data.dict(), current_user, db)
    return PipelineStepUpdateResponse(
        message=result["message"],
        step_data=result["step_data"],
        pipeline_id=result["pipeline_id"],
        step_name="preprocessing"
    )

@router.post("/{pipeline_id}/steps/features", response_model=PipelineStepUpdateResponse)
async def update_features_step(
    pipeline_id: int,
    step_data: FeaturesStepData,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualizar etapa de Features com todos os parâmetros selecionados.
    """
    result = await update_pipeline_step(pipeline_id, "features", step_data.dict(), current_user, db)
    return PipelineStepUpdateResponse(
        message=result["message"],
        step_data=result["step_data"],
        pipeline_id=result["pipeline_id"],
        step_name="features"
    )

@router.post("/{pipeline_id}/steps/modelo", response_model=PipelineStepUpdateResponse)
async def update_modelo_step(
    pipeline_id: int,
    step_data: ModeloStepData,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Atualizar etapa de Modelo com todos os parâmetros selecionados.
    """
    result = await update_pipeline_step(pipeline_id, "modelo", step_data.dict(), current_user, db)
    return PipelineStepUpdateResponse(
        message=result["message"],
        step_data=result["step_data"],
        pipeline_id=result["pipeline_id"],
        step_name="modelo"
    )

# === ENDPOINTS DE NAVEGAÇÃO ===

@router.post("/{pipeline_id}/complete-step/{step_name}", response_model=CompleteStepResponse)
async def complete_step(
    pipeline_id: int,
    step_name: str,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Marcar uma etapa como completa e avançar para a próxima.
    """
    valid_steps = ["upload", "preview", "divisao", "preprocessing", "features", "modelo"]
    step_order = {step: i for i, step in enumerate(valid_steps)}
    
    if step_name not in valid_steps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid step name. Valid steps: {valid_steps}"
        )
    
    pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)
    if not pipeline or pipeline.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    
    config = pipeline.configuration or {"steps_data": {}, "completed_steps": [], "current_step": "upload"}
    
    # Adicionar step aos completos se não estiver
    if step_name not in config["completed_steps"]:
        config["completed_steps"].append(step_name)
    
    # Determinar próximo step
    current_step_index = step_order.get(config.get("current_step", "upload"), 0)
    completed_step_index = step_order[step_name]
    
    if completed_step_index >= current_step_index:
        next_step_index = completed_step_index + 1
        if next_step_index < len(valid_steps):
            config["current_step"] = valid_steps[next_step_index]
        else:
            config["current_step"] = "completed"
    
    # Atualizar pipeline
    update_data = PipelineUpdate(
        configuration=config,
        status=PipelineStatus.CONFIGURING if config["current_step"] != "completed" else PipelineStatus.COMPLETED
    )
    
    await PipelineService.update_pipeline(db, pipeline_id, update_data, current_user.id)
    
    return CompleteStepResponse(
        message=f"Step {step_name} completed successfully",
        next_step=config["current_step"],
        completed_step=step_name
    )

@router.get("/{pipeline_id}/steps/{step_name}", response_model=PipelineStepResponse)
async def get_step_data(
    pipeline_id: int,
    step_name: str,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Obter dados específicos de uma etapa.
    """
    valid_steps = ["upload", "preview", "divisao", "preprocessing", "features", "modelo"]
    
    if step_name not in valid_steps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid step name. Valid steps: {valid_steps}"
        )
    
    pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)
    if not pipeline or pipeline.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    
    config = pipeline.configuration or {"steps_data": {}}
    step_data = config.get("steps_data", {}).get(step_name, {})
    
    return PipelineStepResponse(
        step_name=step_name,
        data=step_data,
        completed=step_name in config.get("completed_steps", []),
        is_current=config.get("current_step") == step_name
    )

# === FUNÇÃO AUXILIAR ===

async def update_pipeline_step(
    pipeline_id: int,
    step_name: str,
    step_data: Dict[str, Any],
    current_user: User,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Função auxiliar para atualizar dados de uma etapa específica.
    """
    pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)
    if not pipeline or pipeline.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    
    config = pipeline.configuration or {"steps_data": {}, "completed_steps": [], "current_step": "upload"}
    
    # Atualizar dados da etapa
    if "steps_data" not in config:
        config["steps_data"] = {}
    
    config["steps_data"][step_name] = step_data
    
    # Atualizar pipeline
    update_data = PipelineUpdate(configuration=config)
    updated_pipeline = await PipelineService.update_pipeline(db, pipeline_id, update_data, current_user.id)
    
    logger.info(f"Pipeline step {step_name} updated", pipeline_id=pipeline_id, user_id=current_user.id)
    
    return {
        "message": f"Step {step_name} updated successfully",
        "step_data": step_data,
        "pipeline_id": pipeline_id
    }

# === ENDPOINTS LEGADOS (mantidos para compatibilidade) ===

@router.get("/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    pipeline_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get pipeline details (legacy endpoint)."""
    pipeline = await PipelineService.get_pipeline_by_id(db, pipeline_id)

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found"
        )

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
    """Update pipeline (legacy endpoint)."""
    pipeline = await PipelineService.update_pipeline(
        db, pipeline_id, pipeline_data, current_user.id
    )

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found or access denied"
        )

    logger.info("Pipeline updated via legacy API", pipeline_id=pipeline.id, user_id=current_user.id)
    return pipeline

@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline(
    pipeline_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete pipeline."""
    success = await PipelineService.delete_pipeline(db, pipeline_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found or access denied"
        )

    logger.info("Pipeline deleted via API", pipeline_id=pipeline_id, user_id=current_user.id)