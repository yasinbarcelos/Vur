"""
Pipeline schemas for API validation
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.pipeline import PipelineStatus, PipelineType


class PipelineBase(BaseModel):
    """Base pipeline schema."""
    name: str = Field(..., min_length=1, max_length=200, description="Pipeline name")
    description: Optional[str] = Field(None, max_length=1000, description="Pipeline description")
    pipeline_type: PipelineType = Field(default=PipelineType.UNIVARIATE, description="Pipeline type")
    target_column: Optional[str] = Field(None, max_length=100, description="Target column name")
    date_column: Optional[str] = Field(None, max_length=100, description="Date column name")
    features: Optional[List[str]] = Field(None, description="List of feature column names")
    algorithm: Optional[str] = Field(None, max_length=50, description="ML algorithm")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Algorithm hyperparameters")


class PipelineCreate(PipelineBase):
    """Schema for creating a new pipeline."""
    dataset_id: Optional[int] = Field(None, description="Associated dataset ID")
    configuration: Optional[Dict[str, Any]] = Field(None, description="Pipeline configuration")


class PipelineUpdate(BaseModel):
    """Schema for updating pipeline information."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Pipeline name")
    description: Optional[str] = Field(None, max_length=1000, description="Pipeline description")
    pipeline_type: Optional[PipelineType] = Field(None, description="Pipeline type")
    status: Optional[PipelineStatus] = Field(None, description="Pipeline status")
    target_column: Optional[str] = Field(None, max_length=100, description="Target column name")
    date_column: Optional[str] = Field(None, max_length=100, description="Date column name")
    features: Optional[List[str]] = Field(None, description="List of feature column names")
    algorithm: Optional[str] = Field(None, max_length=50, description="ML algorithm")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Algorithm hyperparameters")
    configuration: Optional[Dict[str, Any]] = Field(None, description="Pipeline configuration")
    metrics: Optional[Dict[str, Any]] = Field(None, description="Pipeline metrics")


class PipelineResponse(PipelineBase):
    """Schema for pipeline response."""
    id: int
    status: PipelineStatus
    configuration: Optional[Dict[str, Any]]
    metrics: Optional[Dict[str, Any]]
    owner_id: int
    dataset_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PipelineListResponse(BaseModel):
    """Schema for pipeline list response."""
    pipelines: List[PipelineResponse]
    total: int
    page: int
    size: int
    
    
class PipelineStatusUpdate(BaseModel):
    """Schema for updating pipeline status."""
    status: PipelineStatus = Field(..., description="New pipeline status")
    message: Optional[str] = Field(None, description="Status update message")


# === SCHEMAS PARA ETAPAS ESPECÍFICAS ===

class UploadStepData(BaseModel):
    """Dados da etapa de Upload"""
    dataset_id: int = Field(..., description="ID do dataset")
    dataset_name: str = Field(..., description="Nome do dataset")
    file_path: Optional[str] = Field(None, description="Caminho do arquivo")
    total_rows: int = Field(..., description="Total de linhas")
    total_columns: int = Field(..., description="Total de colunas")
    file_size: Optional[int] = Field(None, description="Tamanho do arquivo em bytes")
    file_type: str = Field(default="csv", description="Tipo do arquivo")
    upload_timestamp: datetime = Field(..., description="Timestamp do upload")


class PreviewStepData(BaseModel):
    """Dados da etapa de Preview"""
    columns: List[str] = Field(..., description="Lista de colunas")
    sample_data: List[Dict[str, Any]] = Field(..., description="Amostra dos dados")
    data_types: Dict[str, str] = Field(..., description="Tipos de dados por coluna")
    missing_values: Dict[str, int] = Field(..., description="Valores faltantes por coluna")
    date_column: Optional[str] = Field(None, description="Coluna de data selecionada")
    target_column: Optional[str] = Field(None, description="Coluna alvo selecionada")
    column_suggestions: Dict[str, List[str]] = Field(..., description="Sugestões de colunas")
    data_quality_score: float = Field(..., description="Score de qualidade dos dados")
    quality_issues: List[str] = Field(..., description="Problemas de qualidade identificados")


class DivisaoStepData(BaseModel):
    """Dados da etapa de Divisão dos Dados"""
    train_size: float = Field(default=0.7, description="Proporção de dados para treino")
    validation_size: float = Field(default=0.15, description="Proporção de dados para validação")
    test_size: float = Field(default=0.15, description="Proporção de dados para teste")
    split_method: str = Field(default="temporal", description="Método de divisão")
    split_date: Optional[str] = Field(None, description="Data de corte para divisão")
    cross_validation_config: Optional[Dict[str, Any]] = Field(None, description="Configuração de validação cruzada")
    train_rows: int = Field(..., description="Número de linhas de treino")
    validation_rows: int = Field(..., description="Número de linhas de validação")
    test_rows: int = Field(..., description="Número de linhas de teste")


class PreprocessingStepData(BaseModel):
    """Dados da etapa de Preprocessing"""
    normalization: str = Field(default="minmax", description="Método de normalização")
    transformation: str = Field(default="none", description="Transformação aplicada")
    outlier_detection: bool = Field(default=False, description="Detecção de outliers habilitada")
    outlier_method: str = Field(default="iqr", description="Método de detecção de outliers")
    outlier_threshold: float = Field(default=1.5, description="Threshold para outliers")
    missing_value_handling: str = Field(default="interpolate", description="Tratamento de valores faltantes")
    seasonal_decomposition: bool = Field(default=False, description="Decomposição sazonal habilitada")
    smoothing: bool = Field(default=False, description="Suavização habilitada")
    smoothing_window: int = Field(default=5, description="Janela de suavização")
    applied_transformations: List[str] = Field(..., description="Transformações aplicadas")


class FeaturesStepData(BaseModel):
    """Dados da etapa de Features"""
    selected_features: List[str] = Field(..., description="Features selecionadas")
    feature_engineering: Dict[str, Any] = Field(..., description="Configuração de engenharia de features")
    input_window_size: int = Field(default=35, description="Tamanho da janela de entrada")
    forecast_horizon: int = Field(default=15, description="Horizonte de previsão")
    feature_selection_method: Optional[str] = Field(None, description="Método de seleção de features")
    feature_importance: Optional[Dict[str, float]] = Field(None, description="Importância das features")
    feature_correlations: Optional[Dict[str, float]] = Field(None, description="Correlações das features")
    lag_features: List[int] = Field(default=[], description="Features de lag")
    rolling_features: List[Dict[str, Any]] = Field(default=[], description="Features de rolling window")


class ModeloStepData(BaseModel):
    """Dados da etapa de Modelo"""
    algorithm: str = Field(..., description="Algoritmo selecionado")
    algorithm_category: str = Field(..., description="Categoria do algoritmo")
    hyperparameters: Dict[str, Any] = Field(..., description="Hiperparâmetros do modelo")
    model_type: str = Field(..., description="Tipo do modelo")
    validation_method: str = Field(default="holdout", description="Método de validação")
    metrics_config: Dict[str, Any] = Field(..., description="Configuração de métricas")
    auto_hyperparameter_tuning: bool = Field(default=False, description="Tuning automático habilitado")
    tuning_method: Optional[str] = Field(None, description="Método de tuning")


class PipelineFlowResponse(BaseModel):
    """Response completo do fluxo do pipeline"""
    id: int = Field(..., description="ID do pipeline")
    name: str = Field(..., description="Nome do pipeline")
    status: PipelineStatus = Field(..., description="Status do pipeline")
    current_step: str = Field(..., description="Etapa atual")
    completed_steps: List[str] = Field(..., description="Etapas completadas")
    steps_data: Dict[str, Dict[str, Any]] = Field(..., description="Dados de todas as etapas")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: Optional[datetime] = Field(None, description="Data de atualização")


class PipelineStepResponse(BaseModel):
    """Response para dados de uma etapa específica"""
    step_name: str = Field(..., description="Nome da etapa")
    data: Dict[str, Any] = Field(..., description="Dados da etapa")
    completed: bool = Field(..., description="Se a etapa foi completada")
    is_current: bool = Field(..., description="Se é a etapa atual")


class PipelineStepUpdate(BaseModel):
    """Schema para atualizar dados de uma etapa"""
    step_data: Dict[str, Any] = Field(..., description="Dados da etapa")
    completed: bool = Field(default=False, description="Marcar como completada")


class CompleteStepResponse(BaseModel):
    """Response para completar uma etapa"""
    message: str = Field(..., description="Mensagem de sucesso")
    next_step: str = Field(..., description="Próxima etapa")
    completed_step: str = Field(..., description="Etapa completada")


class PipelineStepUpdateResponse(BaseModel):
    """Response para atualização de etapa"""
    message: str = Field(..., description="Mensagem de sucesso")
    step_data: Dict[str, Any] = Field(..., description="Dados atualizados")
    pipeline_id: int = Field(..., description="ID do pipeline")
    step_name: str = Field(..., description="Nome da etapa")
