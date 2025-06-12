# Plano de Implementação Completo - Pipeline APIs e Integração Frontend

## Visão Geral

Este documento detalha o plano completo de implementação de todas as APIs do pipeline de Machine Learning e os processos de integração com o frontend React. O sistema VUR (Time Series Forecasting Platform) será implementado seguindo uma arquitetura modular com 8 etapas principais.

## Arquitetura Atual

### Backend (FastAPI)
- **Base URL**: `http://localhost:8000/api/v1`
- **Estrutura**: Modular com routers separados por funcionalidade
- **Autenticação**: JWT Bearer Token
- **Banco de Dados**: PostgreSQL com SQLAlchemy (async)
- **Logging**: Estruturado com structlog

### Frontend (React + TypeScript)
- **Framework**: React 18 + Vite + TypeScript
- **UI**: Shadcn/ui + Tailwind CSS
- **Estado**: React Context + TanStack Query
- **Roteamento**: React Router v6
- **API Client**: Axios com interceptors

## Etapas do Pipeline

### 1. Dashboard e Visão Geral
### 2. Upload e Gestão de Dados
### 3. Pré-processamento de Dados
### 4. Engenharia de Atributos
### 5. Seleção e Configuração de Modelos
### 6. Treinamento de Modelos
### 7. Monitoramento e Avaliação
### 8. Predições e Deployment

---

## ETAPA 1: DASHBOARD E VISÃO GERAL

### 1.1 APIs Backend

#### Endpoint: `/api/v1/dashboard/stats`
**Método**: GET
**Descrição**: Estatísticas gerais do sistema

```python
# backend/app/api/v1/endpoints/dashboard.py
@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Retorna estatísticas do dashboard do usuário"""
```

**Response Schema**:
```python
class DashboardStatsResponse(BaseModel):
    total_pipelines: int
    active_pipelines: int
    total_datasets: int
    total_models: int
    recent_predictions: int
    system_health: str
    storage_used: float  # GB
    last_activity: Optional[datetime]
```

#### Endpoint: `/api/v1/dashboard/recent-activity`
**Método**: GET
**Descrição**: Atividades recentes do usuário

#### Endpoint: `/api/v1/dashboard/quick-actions`
**Método**: GET
**Descrição**: Ações rápidas disponíveis

### 1.2 Frontend Integration

#### Service Layer
```typescript
// frontend/src/services/dashboardService.ts
export class DashboardService {
  static async getStats(): Promise<DashboardStats> {
    return api.dashboard.getStats();
  }
  
  static async getRecentActivity(): Promise<Activity[]> {
    return api.dashboard.getActivity();
  }
}
```

#### React Hooks
```typescript
// frontend/src/hooks/useDashboard.ts
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: DashboardService.getStats,
    refetchInterval: 30000, // 30s
  });
};
```

#### Components
- `DashboardOverview.tsx` - Componente principal
- `StatsCards.tsx` - Cards de estatísticas
- `RecentActivity.tsx` - Lista de atividades
- `QuickActions.tsx` - Botões de ação rápida

---

## ETAPA 2: UPLOAD E GESTÃO DE DADOS

### 2.1 APIs Backend

#### Endpoint: `/api/v1/datasets/upload`
**Método**: POST (multipart/form-data)
**Descrição**: Upload de arquivo de dataset

```python
@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    dataset_type: DatasetType = Form(DatasetType.TIME_SERIES),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Upload e processamento inicial de dataset"""
```

#### Endpoint: `/api/v1/datasets/{dataset_id}/validate`
**Método**: POST
**Descrição**: Validação de estrutura do dataset

#### Endpoint: `/api/v1/datasets/{dataset_id}/preview`
**Método**: GET
**Descrição**: Preview dos dados com paginação

#### Endpoint: `/api/v1/datasets/{dataset_id}/statistics`
**Método**: GET
**Descrição**: Estatísticas descritivas do dataset

### 2.2 Frontend Integration

#### Upload Component
```typescript
// frontend/src/components/pipeline/DataUpload.tsx
const DataUpload = () => {
  const uploadMutation = useMutation({
    mutationFn: DatasetService.upload,
    onSuccess: (data) => {
      // Navegar para próxima etapa
      goToStep('preprocessing');
    }
  });
  
  return (
    <DropZone
      onDrop={handleFileUpload}
      accept=".csv,.xlsx,.json"
      maxSize={100 * 1024 * 1024} // 100MB
    />
  );
};
```

#### Data Preview Component
```typescript
// frontend/src/components/pipeline/DataPreview.tsx
const DataPreview = ({ datasetId }: { datasetId: string }) => {
  const { data: preview } = useQuery({
    queryKey: ['dataset', datasetId, 'preview'],
    queryFn: () => DatasetService.getPreview(datasetId),
  });
  
  return <DataTable data={preview?.rows} columns={preview?.columns} />;
};
```

---

## ETAPA 3: PRÉ-PROCESSAMENTO DE DADOS

### 3.1 APIs Backend

#### Endpoint: `/api/v1/preprocessing/analyze`
**Método**: POST
**Descrição**: Análise automática de qualidade dos dados

```python
@router.post("/analyze", response_model=DataQualityAnalysisResponse)
async def analyze_data_quality(
    request: DataQualityAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Análise de qualidade dos dados"""
```

#### Endpoint: `/api/v1/preprocessing/missing-values`
**Método**: POST
**Descrição**: Tratamento de valores ausentes

#### Endpoint: `/api/v1/preprocessing/outliers`
**Método**: POST
**Descrição**: Detecção e tratamento de outliers

#### Endpoint: `/api/v1/preprocessing/transformations`
**Método**: POST
**Descrição**: Aplicação de transformações

### 3.2 Frontend Integration

#### Preprocessing Configuration
```typescript
// frontend/src/components/pipeline/PreprocessingConfig.tsx
const PreprocessingConfig = () => {
  const [config, setConfig] = useState<PreprocessingConfig>({
    missingValues: 'interpolate',
    outliers: 'iqr',
    scaling: 'standard',
    transformations: []
  });
  
  const applyMutation = useMutation({
    mutationFn: PreprocessingService.apply,
    onSuccess: () => completeStep('preprocessing')
  });
};
```

---

## ETAPA 4: ENGENHARIA DE ATRIBUTOS

### 4.1 APIs Backend

#### Endpoint: `/api/v1/features/generate`
**Método**: POST
**Descrição**: Geração automática de features

#### Endpoint: `/api/v1/features/select`
**Método**: POST
**Descrição**: Seleção de features relevantes

#### Endpoint: `/api/v1/features/importance`
**Método**: GET
**Descrição**: Análise de importância das features

### 4.2 Frontend Integration

#### Feature Engineering Component
```typescript
// frontend/src/components/pipeline/FeatureEngineering.tsx
const FeatureEngineering = () => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [autoGenerate, setAutoGenerate] = useState(true);
  
  const generateMutation = useMutation({
    mutationFn: FeatureService.generate,
    onSuccess: (features) => setSelectedFeatures(features.map(f => f.name))
  });
};
```

---

## ETAPA 5: SELEÇÃO E CONFIGURAÇÃO DE MODELOS

### 5.1 APIs Backend

#### Endpoint: `/api/v1/models/algorithms`
**Método**: GET
**Descrição**: Lista de algoritmos disponíveis

#### Endpoint: `/api/v1/models/configure`
**Método**: POST
**Descrição**: Configuração de hiperparâmetros

#### Endpoint: `/api/v1/models/validate-config`
**Método**: POST
**Descrição**: Validação da configuração

### 5.2 Frontend Integration

#### Model Selection Component
```typescript
// frontend/src/components/pipeline/ModelSelection.tsx
const ModelSelection = () => {
  const { data: algorithms } = useQuery({
    queryKey: ['models', 'algorithms'],
    queryFn: ModelService.getAlgorithms
  });
  
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('');
  const [hyperparameters, setHyperparameters] = useState<Record<string, any>>({});
};
```

---

## ETAPA 6: TREINAMENTO DE MODELOS

### 6.1 APIs Backend

#### Endpoint: `/api/v1/training/start`
**Método**: POST
**Descrição**: Iniciar treinamento do modelo

#### Endpoint: `/api/v1/training/{job_id}/status`
**Método**: GET
**Descrição**: Status do treinamento

#### Endpoint: `/api/v1/training/{job_id}/logs`
**Método**: GET (SSE)
**Descrição**: Logs em tempo real

#### Endpoint: `/api/v1/training/{job_id}/metrics`
**Método**: GET
**Descrição**: Métricas de treinamento

### 6.2 Frontend Integration

#### Training Component
```typescript
// frontend/src/components/pipeline/ModelTraining.tsx
const ModelTraining = () => {
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('idle');
  
  const startTraining = useMutation({
    mutationFn: TrainingService.start,
    onSuccess: (jobId) => {
      // Iniciar polling de status
      startStatusPolling(jobId);
    }
  });
  
  // WebSocket ou SSE para logs em tempo real
  useEffect(() => {
    if (jobId) {
      const eventSource = new EventSource(`/api/v1/training/${jobId}/logs`);
      eventSource.onmessage = (event) => {
        setLogs(prev => [...prev, JSON.parse(event.data)]);
      };
    }
  }, [jobId]);
};
```

---

## ETAPA 7: MONITORAMENTO E AVALIAÇÃO

### 7.1 APIs Backend

#### Endpoint: `/api/v1/monitoring/models/{model_id}/metrics`
**Método**: GET
**Descrição**: Métricas de performance do modelo

#### Endpoint: `/api/v1/monitoring/drift-detection`
**Método**: POST
**Descrição**: Detecção de drift nos dados

#### Endpoint: `/api/v1/monitoring/alerts`
**Método**: GET
**Descrição**: Alertas do sistema

### 7.2 Frontend Integration

#### Monitoring Dashboard
```typescript
// frontend/src/components/pipeline/Monitoring.tsx
const Monitoring = () => {
  const { data: metrics } = useQuery({
    queryKey: ['monitoring', 'metrics'],
    queryFn: MonitoringService.getMetrics,
    refetchInterval: 10000 // 10s
  });
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricsChart data={metrics?.performance} />
      <DriftDetection data={metrics?.drift} />
      <AlertsPanel alerts={metrics?.alerts} />
    </div>
  );
};
```

---

## ETAPA 8: PREDIÇÕES E DEPLOYMENT

### 8.1 APIs Backend

#### Endpoint: `/api/v1/predictions/single`
**Método**: POST
**Descrição**: Predição única

#### Endpoint: `/api/v1/predictions/batch`
**Método**: POST
**Descrição**: Predições em lote

#### Endpoint: `/api/v1/predictions/real-time`
**Método**: WebSocket
**Descrição**: Predições em tempo real

#### Endpoint: `/api/v1/deployment/deploy`
**Método**: POST
**Descrição**: Deploy do modelo

### 8.2 Frontend Integration

#### Prediction Interface
```typescript
// frontend/src/components/pipeline/PredictionInterface.tsx
const PredictionInterface = () => {
  const [predictionMode, setPredictionMode] = useState<'single' | 'batch' | 'realtime'>('single');
  
  const singlePrediction = useMutation({
    mutationFn: PredictionService.single,
    onSuccess: (result) => setResults([result])
  });
  
  // WebSocket para predições em tempo real
  const { socket } = useWebSocket('/api/v1/predictions/real-time', {
    onMessage: (data) => {
      setRealTimeResults(prev => [...prev, JSON.parse(data)]);
    }
  });
};
```

---

## Detalhes Técnicos de Implementação

### Schemas Pydantic (Backend)

#### Dashboard Schemas
```python
# backend/app/schemas/dashboard.py
class DashboardStatsResponse(BaseModel):
    total_pipelines: int
    active_pipelines: int
    total_datasets: int
    total_models: int
    recent_predictions: int
    system_health: Literal["healthy", "warning", "error"]
    storage_used: float
    storage_limit: float
    last_activity: Optional[datetime]
    user_activity_score: float

class ActivityItem(BaseModel):
    id: int
    type: Literal["upload", "training", "prediction", "deployment"]
    title: str
    description: str
    status: Literal["success", "error", "in_progress"]
    timestamp: datetime
    metadata: Optional[Dict[str, Any]]

class RecentActivityResponse(BaseModel):
    activities: List[ActivityItem]
    total_count: int
    has_more: bool
```

#### Preprocessing Schemas
```python
# backend/app/schemas/preprocessing.py
class DataQualityAnalysisRequest(BaseModel):
    dataset_id: int
    columns: Optional[List[str]] = None
    sample_size: Optional[int] = 10000

class DataQualityIssue(BaseModel):
    column: str
    issue_type: Literal["missing_values", "outliers", "duplicates", "inconsistent_format"]
    severity: Literal["low", "medium", "high", "critical"]
    count: int
    percentage: float
    description: str
    suggested_action: str

class DataQualityAnalysisResponse(BaseModel):
    dataset_id: int
    total_rows: int
    total_columns: int
    issues: List[DataQualityIssue]
    overall_score: float
    recommendations: List[str]
    analysis_timestamp: datetime

class PreprocessingConfig(BaseModel):
    missing_values_strategy: Literal["drop", "mean", "median", "mode", "interpolate", "forward_fill"]
    outlier_detection_method: Literal["iqr", "zscore", "isolation_forest"]
    outlier_treatment: Literal["remove", "cap", "transform"]
    scaling_method: Optional[Literal["standard", "minmax", "robust", "none"]]
    transformations: List[Dict[str, Any]]
    custom_rules: Optional[List[Dict[str, Any]]]

class PreprocessingResult(BaseModel):
    original_shape: Tuple[int, int]
    processed_shape: Tuple[int, int]
    changes_summary: Dict[str, Any]
    quality_improvement: float
    processing_time: float
    warnings: List[str]
```

#### Training Schemas
```python
# backend/app/schemas/training.py
class TrainingJobRequest(BaseModel):
    pipeline_id: int
    model_config: Dict[str, Any]
    training_config: Dict[str, Any]
    validation_split: float = 0.2
    cross_validation: bool = False
    cv_folds: int = 5
    early_stopping: bool = True
    max_epochs: int = 100

class TrainingJobResponse(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    progress: float
    estimated_time_remaining: Optional[int]
    current_epoch: Optional[int]
    best_metric: Optional[float]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

class TrainingMetrics(BaseModel):
    epoch: int
    train_loss: float
    val_loss: Optional[float]
    train_metrics: Dict[str, float]
    val_metrics: Optional[Dict[str, float]]
    learning_rate: float
    timestamp: datetime

class ModelEvaluationResult(BaseModel):
    model_id: int
    test_metrics: Dict[str, float]
    confusion_matrix: Optional[List[List[int]]]
    feature_importance: Optional[Dict[str, float]]
    prediction_intervals: Optional[Dict[str, Any]]
    residual_analysis: Optional[Dict[str, Any]]
    model_size_mb: float
    inference_time_ms: float
```

### Services Layer (Backend)

#### Dashboard Service
```python
# backend/app/services/dashboard_service.py
class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_stats(self, user_id: int) -> DashboardStatsResponse:
        """Calcula estatísticas do dashboard para o usuário"""
        # Queries paralelas para performance
        pipelines_query = select(func.count(Pipeline.id)).where(Pipeline.owner_id == user_id)
        active_pipelines_query = select(func.count(Pipeline.id)).where(
            Pipeline.owner_id == user_id,
            Pipeline.status.in_([PipelineStatus.TRAINING, PipelineStatus.DEPLOYED])
        )
        # ... outras queries

        results = await asyncio.gather(
            self.db.scalar(pipelines_query),
            self.db.scalar(active_pipelines_query),
            # ... outras queries
        )

        return DashboardStatsResponse(
            total_pipelines=results[0] or 0,
            active_pipelines=results[1] or 0,
            # ... outros campos
        )

    async def get_recent_activity(self, user_id: int, limit: int = 10) -> RecentActivityResponse:
        """Busca atividades recentes do usuário"""
        # Implementação com joins otimizados
        pass
```

#### Preprocessing Service
```python
# backend/app/services/preprocessing_service.py
class PreprocessingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.data_analyzer = DataQualityAnalyzer()
        self.preprocessor = DataPreprocessor()

    async def analyze_data_quality(self, request: DataQualityAnalysisRequest) -> DataQualityAnalysisResponse:
        """Analisa qualidade dos dados"""
        dataset = await self.get_dataset(request.dataset_id)
        df = await self.load_dataset_dataframe(dataset)

        # Análise de qualidade
        issues = self.data_analyzer.detect_issues(df, request.columns)
        score = self.data_analyzer.calculate_quality_score(issues)
        recommendations = self.data_analyzer.generate_recommendations(issues)

        return DataQualityAnalysisResponse(
            dataset_id=request.dataset_id,
            total_rows=len(df),
            total_columns=len(df.columns),
            issues=issues,
            overall_score=score,
            recommendations=recommendations,
            analysis_timestamp=datetime.utcnow()
        )

    async def apply_preprocessing(self, config: PreprocessingConfig) -> PreprocessingResult:
        """Aplica pré-processamento aos dados"""
        # Implementação do pipeline de pré-processamento
        pass
```

### Frontend Services

#### API Client Extensions
```typescript
// frontend/src/lib/api.ts - Extensões
export class ApiClient {
  // ... código existente ...

  // Dashboard endpoints
  dashboard = {
    getStats: (): Promise<DashboardStats> => this.get('/dashboard/stats'),
    getActivity: (params?: ActivityParams): Promise<RecentActivity> =>
      this.get('/dashboard/recent-activity', { params }),
    getQuickActions: (): Promise<QuickAction[]> => this.get('/dashboard/quick-actions'),
  };

  // Preprocessing endpoints
  preprocessing = {
    analyzeQuality: (request: DataQualityAnalysisRequest): Promise<DataQualityAnalysis> =>
      this.post('/preprocessing/analyze', request),

    applyPreprocessing: (config: PreprocessingConfig): Promise<PreprocessingResult> =>
      this.post('/preprocessing/apply', config),

    getPreprocessingOptions: (): Promise<PreprocessingOptions> =>
      this.get('/preprocessing/options'),
  };

  // Training endpoints
  training = {
    startJob: (request: TrainingJobRequest): Promise<TrainingJobResponse> =>
      this.post('/training/start', request),

    getJobStatus: (jobId: string): Promise<TrainingJobResponse> =>
      this.get(`/training/${jobId}/status`),

    getJobMetrics: (jobId: string): Promise<TrainingMetrics[]> =>
      this.get(`/training/${jobId}/metrics`),

    cancelJob: (jobId: string): Promise<void> =>
      this.post(`/training/${jobId}/cancel`),
  };

  // Real-time endpoints
  realtime = {
    connectTrainingLogs: (jobId: string): EventSource =>
      new EventSource(`${this.baseURL}/training/${jobId}/logs`),

    connectPredictions: (): WebSocket =>
      new WebSocket(`${this.baseURL.replace('http', 'ws')}/predictions/stream`),
  };
}
```

#### React Hooks Patterns
```typescript
// frontend/src/hooks/useTraining.ts
export const useTrainingJob = (jobId?: string) => {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Query para status do job
  const jobQuery = useQuery({
    queryKey: ['training', 'job', jobId],
    queryFn: () => TrainingService.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Parar polling quando job terminar
      return data?.status === 'completed' || data?.status === 'failed' ? false : 2000;
    },
  });

  // Mutation para iniciar treinamento
  const startTraining = useMutation({
    mutationFn: TrainingService.startJob,
    onSuccess: (response) => {
      // Iniciar conexão de logs
      connectToLogs(response.job_id);
    },
  });

  // Conexão SSE para logs
  const connectToLogs = useCallback((jobId: string) => {
    const eventSource = api.realtime.connectTrainingLogs(jobId);

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLogs(prev => [...prev, log]);
    };
    eventSource.onerror = () => setIsConnected(false);

    return () => eventSource.close();
  }, []);

  return {
    job: jobQuery.data,
    logs,
    isConnected,
    startTraining,
    isLoading: jobQuery.isLoading,
    error: jobQuery.error,
  };
};

// Hook para métricas em tempo real
export const useRealTimeMetrics = (modelId?: string) => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);

  useEffect(() => {
    if (!modelId) return;

    const interval = setInterval(async () => {
      try {
        const newMetrics = await MonitoringService.getModelMetrics(modelId);
        setMetrics(newMetrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [modelId]);

  return metrics;
};
```

#### Component Patterns
```typescript
// frontend/src/components/pipeline/TrainingProgress.tsx
interface TrainingProgressProps {
  jobId: string;
  onComplete?: (result: TrainingResult) => void;
}

const TrainingProgress: React.FC<TrainingProgressProps> = ({ jobId, onComplete }) => {
  const { job, logs, isConnected, error } = useTrainingJob(jobId);

  useEffect(() => {
    if (job?.status === 'completed' && onComplete) {
      onComplete(job.result);
    }
  }, [job?.status, onComplete]);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Treinamento do Modelo</h3>
          <Badge variant={getStatusVariant(job?.status)}>
            {getStatusLabel(job?.status)}
          </Badge>
        </div>

        {/* Progress Bar */}
        {job?.progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round(job.progress * 100)}%</span>
            </div>
            <Progress value={job.progress * 100} />
          </div>
        )}

        {/* Metrics Display */}
        {job?.current_metrics && (
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Loss de Treino"
              value={job.current_metrics.train_loss}
              format="decimal"
            />
            <MetricCard
              title="Loss de Validação"
              value={job.current_metrics.val_loss}
              format="decimal"
            />
          </div>
        )}

        {/* Real-time Logs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Logs</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <ScrollArea className="h-40 border rounded p-2">
            {logs.map((log, index) => (
              <div key={index} className="text-xs font-mono mb-1">
                <span className="text-gray-500">{log.timestamp}</span>
                <span className={`ml-2 ${getLogLevelColor(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro no Treinamento</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};
```

---

## Cronograma de Implementação

### Fase 1 (Semana 1-2): Fundação
- [ ] Implementar APIs de Dashboard
- [ ] Expandir APIs de Dataset
- [ ] Criar componentes base do frontend
- [ ] Configurar integração completa

### Fase 2 (Semana 3-4): Processamento
- [ ] APIs de Pré-processamento
- [ ] APIs de Feature Engineering
- [ ] Componentes de configuração
- [ ] Validação e preview

### Fase 3 (Semana 5-6): Modelagem
- [ ] APIs de Seleção de Modelos
- [ ] APIs de Treinamento
- [ ] Interface de treinamento
- [ ] Monitoramento em tempo real

### Fase 4 (Semana 7-8): Produção
- [ ] APIs de Monitoramento
- [ ] APIs de Predição
- [ ] Interface de deployment
- [ ] Testes e otimização

---

## Padrões de Estado e Context

### Pipeline Context Enhancement
```typescript
// frontend/src/contexts/PipelineContext.tsx - Extensão
interface PipelineContextType {
  // Estado atual
  currentStep: string;
  completedSteps: string[];
  pipelineData: PipelineData;

  // Estado de execução
  isProcessing: boolean;
  currentJob?: TrainingJob;
  errors: Record<string, string>;

  // Métodos de navegação
  goToStep: (step: string) => void;
  completeStep: (step: string) => void;

  // Métodos de dados
  updatePipelineData: (data: Partial<PipelineData>) => void;
  savePipelineState: () => Promise<void>;
  loadPipelineState: (id: string) => Promise<void>;

  // Métodos de execução
  startTraining: () => Promise<void>;
  stopTraining: () => Promise<void>;
  deployModel: () => Promise<void>;

  // Estado de validação
  validateStep: (step: string) => Promise<boolean>;
  getStepErrors: (step: string) => string[];
}

const PipelineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PipelineState>({
    currentStep: 'upload',
    completedSteps: [],
    pipelineData: {},
    isProcessing: false,
    errors: {},
  });

  // Persistência automática
  useEffect(() => {
    const saveState = debounce(() => {
      localStorage.setItem('vur_pipeline_state', JSON.stringify(state));
    }, 1000);

    saveState();
  }, [state]);

  // Validação de etapas
  const validateStep = useCallback(async (step: string): Promise<boolean> => {
    const validators = {
      upload: () => !!state.pipelineData.dataset,
      preprocessing: () => !!state.pipelineData.preprocessingConfig,
      features: () => state.pipelineData.selectedFeatures?.length > 0,
      model: () => !!state.pipelineData.modelConfig,
      training: () => !!state.pipelineData.trainingConfig,
    };

    const validator = validators[step];
    return validator ? validator() : true;
  }, [state.pipelineData]);

  return (
    <PipelineContext.Provider value={{
      ...state,
      validateStep,
      // ... outros métodos
    }}>
      {children}
    </PipelineContext.Provider>
  );
};
```

### Error Handling Patterns
```typescript
// frontend/src/utils/errorHandling.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message;
    const code = error.response?.data?.code;

    return new ApiError(message, status, code, error.response?.data);
  }

  return new ApiError('Erro desconhecido', 500);
};

// Hook para tratamento de erros
export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, context?: string) => {
    const apiError = handleApiError(error);

    // Log estruturado
    console.error('API Error:', {
      message: apiError.message,
      status: apiError.status,
      code: apiError.code,
      context,
      details: apiError.details,
    });

    // Toast de erro
    toast({
      variant: "destructive",
      title: "Erro",
      description: apiError.message,
    });

    // Ações específicas por tipo de erro
    if (apiError.status === 401) {
      // Redirecionar para login
      window.location.href = '/auth';
    }

    return apiError;
  }, [toast]);

  return { handleError };
};
```

## Testes

### Backend Tests
```python
# backend/tests/test_dashboard_api.py
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.database import get_async_session
from tests.conftest import override_get_async_session

@pytest.mark.asyncio
async def test_get_dashboard_stats(
    client: AsyncClient,
    authenticated_user_headers: dict,
    sample_user_data: dict
):
    """Testa endpoint de estatísticas do dashboard"""
    response = await client.get(
        "/api/v1/dashboard/stats",
        headers=authenticated_user_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert "total_pipelines" in data
    assert "active_pipelines" in data
    assert "system_health" in data
    assert data["system_health"] in ["healthy", "warning", "error"]

@pytest.mark.asyncio
async def test_preprocessing_analysis(
    client: AsyncClient,
    authenticated_user_headers: dict,
    sample_dataset: dict
):
    """Testa análise de qualidade dos dados"""
    request_data = {
        "dataset_id": sample_dataset["id"],
        "sample_size": 1000
    }

    response = await client.post(
        "/api/v1/preprocessing/analyze",
        json=request_data,
        headers=authenticated_user_headers
    )

    assert response.status_code == 200
    data = response.json()

    assert "issues" in data
    assert "overall_score" in data
    assert 0 <= data["overall_score"] <= 1
    assert "recommendations" in data
```

### Frontend Tests
```typescript
// frontend/src/components/pipeline/__tests__/DataUpload.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PipelineProvider } from '@/contexts/PipelineContext';
import DataUpload from '../DataUpload';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PipelineProvider>
        {component}
      </PipelineProvider>
    </QueryClientProvider>
  );
};

describe('DataUpload Component', () => {
  test('should upload file successfully', async () => {
    renderWithProviders(<DataUpload />);

    const file = new File(['test data'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/upload/i);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
    });
  });

  test('should show validation errors for invalid files', async () => {
    renderWithProviders(<DataUpload />);

    const file = new File(['invalid'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/upload/i);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
  });
});

// Hook testing
// frontend/src/hooks/__tests__/useTraining.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTrainingJob } from '../useTraining';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useTrainingJob', () => {
  test('should start training job', async () => {
    const { result } = renderHook(() => useTrainingJob(), { wrapper });

    const mockRequest = {
      pipeline_id: 1,
      model_config: { algorithm: 'lstm' },
      training_config: { epochs: 10 },
    };

    result.current.startTraining.mutate(mockRequest);

    await waitFor(() => {
      expect(result.current.startTraining.isSuccess).toBe(true);
    });
  });
});
```

## Configuração de Ambiente

### Docker Compose para Desenvolvimento
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://vur:vur123@postgres:5432/vur_dev
      - REDIS_URL=redis://redis:6379/0
      - ENVIRONMENT=development
    volumes:
      - ./backend:/app
      - ./data:/app/data
    depends_on:
      - postgres
      - redis
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000/api/v1
      - VITE_WS_URL=ws://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=vur_dev
      - POSTGRES_USER=vur
      - POSTGRES_PASSWORD=vur123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Serviços de monitoramento
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  redis_data:
  grafana_data:
```

### Scripts de Desenvolvimento
```bash
#!/bin/bash
# scripts/dev-setup.sh

echo "🚀 Configurando ambiente de desenvolvimento VUR..."

# Verificar dependências
command -v docker >/dev/null 2>&1 || { echo "Docker é necessário"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose é necessário"; exit 1; }

# Criar diretórios necessários
mkdir -p data/uploads data/models data/logs

# Configurar variáveis de ambiente
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Arquivo .env criado no backend"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Arquivo .env criado no frontend"
fi

# Iniciar serviços
echo "🐳 Iniciando serviços Docker..."
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Aguardar banco de dados
echo "⏳ Aguardando banco de dados..."
sleep 10

# Executar migrações
echo "🗄️ Executando migrações..."
cd backend && python scripts/migrate.py && cd ..

# Seed inicial
echo "🌱 Executando seed..."
cd backend && python scripts/seed.py && cd ..

echo "✅ Ambiente configurado com sucesso!"
echo "🌐 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:3000"
echo "📊 Grafana: http://localhost:3001 (admin/admin)"
```

---

## Próximos Passos

1. **Revisar e aprovar o plano**
2. **Configurar ambiente de desenvolvimento**
3. **Implementar APIs por etapa**
4. **Desenvolver componentes frontend**
5. **Integrar e testar**
6. **Documentar e deploy**

## Checklist de Implementação

### Backend
- [ ] Configurar estrutura de schemas Pydantic
- [ ] Implementar services layer com injeção de dependência
- [ ] Configurar logging estruturado e métricas
- [ ] Implementar testes unitários e de integração
- [ ] Configurar CI/CD pipeline
- [ ] Documentar APIs com OpenAPI/Swagger

### Frontend
- [ ] Expandir API client com todos os endpoints
- [ ] Implementar hooks customizados para cada funcionalidade
- [ ] Criar componentes reutilizáveis e acessíveis
- [ ] Configurar testes com Testing Library
- [ ] Implementar tratamento de erros robusto
- [ ] Configurar build e deploy automatizado

### DevOps
- [ ] Configurar Docker para desenvolvimento e produção
- [ ] Implementar monitoramento com Prometheus/Grafana
- [ ] Configurar backup automático do banco de dados
- [ ] Implementar logging centralizado
- [ ] Configurar alertas de sistema
- [ ] Documentar procedimentos de deploy

Este plano fornece uma base sólida e detalhada para implementação completa do sistema VUR com todas as funcionalidades de pipeline de ML necessárias, incluindo padrões de código, testes, e configuração de ambiente.
