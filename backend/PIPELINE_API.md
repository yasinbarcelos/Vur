# API de Pipeline Organizada por Etapas

Esta documentação descreve a nova estrutura da API de Pipeline, organizada seguindo o fluxo de trabalho:

1. **Upload** - Carregamento dos dados
2. **Preview** - Visualização e configuração dos dados
3. **Divisão** - Configuração da divisão dos dados
4. **Preprocessing** - Pré-processamento dos dados
5. **Features** - Engenharia de atributos
6. **Modelo** - Configuração do modelo

## Endpoints Principais

### 1. Criar Pipeline
```
POST /api/v1/pipelines/
```
Cria um novo pipeline com estrutura de etapas inicializada.

**Response:**
```json
{
  "id": 1,
  "name": "Meu Pipeline",
  "status": "created",
  "current_step": "upload",
  "completed_steps": [],
  "steps_data": {
    "upload": {},
    "preview": {},
    "divisao": {},
    "preprocessing": {},
    "features": {},
    "modelo": {}
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": null
}
```

### 2. Obter Fluxo Completo do Pipeline
```
GET /api/v1/pipelines/{pipeline_id}/flow
```
Retorna o estado completo de todas as etapas do pipeline.

## Endpoints por Etapa

### 1. Etapa de Upload
```
POST /api/v1/pipelines/{pipeline_id}/steps/upload
```

**Payload:**
```json
{
  "dataset_id": 123,
  "dataset_name": "Vendas 2024",
  "total_rows": 10000,
  "total_columns": 15,
  "file_size": 2048576,
  "file_type": "csv",
  "upload_timestamp": "2024-01-01T00:00:00Z"
}
```

**Parâmetros Salvos:**
- ID e nome do dataset
- Informações do arquivo (tamanho, tipo, caminho)
- Contadores de linhas e colunas
- Timestamp do upload

### 2. Etapa de Preview
```
POST /api/v1/pipelines/{pipeline_id}/steps/preview
```

**Payload:**
```json
{
  "columns": ["data", "vendas", "produto", "regiao"],
  "sample_data": [
    {"data": "2024-01-01", "vendas": 1000, "produto": "A", "regiao": "Sul"},
    {"data": "2024-01-02", "vendas": 1200, "produto": "B", "regiao": "Norte"}
  ],
  "data_types": {
    "data": "datetime",
    "vendas": "float",
    "produto": "string",
    "regiao": "string"
  },
  "missing_values": {
    "vendas": 5,
    "produto": 0
  },
  "date_column": "data",
  "target_column": "vendas",
  "column_suggestions": {
    "date_columns": ["data"],
    "target_columns": ["vendas"]
  },
  "data_quality_score": 0.95,
  "quality_issues": ["5 valores faltantes em 'vendas'"]
}
```

**Parâmetros Salvos:**
- Lista de colunas e seus tipos
- Amostra dos dados
- Valores faltantes por coluna
- Coluna de data e coluna alvo selecionadas
- Score de qualidade e problemas identificados

### 3. Etapa de Divisão
```
POST /api/v1/pipelines/{pipeline_id}/steps/divisao
```

**Payload:**
```json
{
  "train_size": 0.7,
  "validation_size": 0.15,
  "test_size": 0.15,
  "split_method": "temporal",
  "split_date": "2024-06-01",
  "cross_validation_config": {
    "method": "time_series_split",
    "n_splits": 5
  },
  "train_rows": 7000,
  "validation_rows": 1500,
  "test_rows": 1500
}
```

**Parâmetros Salvos:**
- Proporções de divisão (treino, validação, teste)
- Método de divisão (temporal, aleatório, estratificado)
- Data de corte para divisão temporal
- Configuração de validação cruzada
- Número real de linhas em cada conjunto

### 4. Etapa de Preprocessing
```
POST /api/v1/pipelines/{pipeline_id}/steps/preprocessing
```

**Payload:**
```json
{
  "normalization": "minmax",
  "transformation": "log",
  "outlier_detection": true,
  "outlier_method": "iqr",
  "outlier_threshold": 1.5,
  "missing_value_handling": "interpolate",
  "seasonal_decomposition": true,
  "smoothing": true,
  "smoothing_window": 5,
  "applied_transformations": ["log_transform", "minmax_scaling", "outlier_removal"]
}
```

**Parâmetros Salvos:**
- Método de normalização (minmax, standard, robust)
- Transformações aplicadas (log, sqrt, box_cox, diferenças)
- Configuração de detecção de outliers
- Método de tratamento de valores faltantes
- Configurações de decomposição sazonal e suavização
- Lista de transformações efetivamente aplicadas

### 5. Etapa de Features
```
POST /api/v1/pipelines/{pipeline_id}/steps/features
```

**Payload:**
```json
{
  "selected_features": ["vendas", "temperatura", "feriado"],
  "feature_engineering": {
    "lag_features": [1, 7, 30],
    "rolling_features": [
      {"window": 7, "operation": "mean"},
      {"window": 30, "operation": "std"}
    ]
  },
  "input_window_size": 35,
  "forecast_horizon": 15,
  "feature_selection_method": "mutual_information",
  "feature_importance": {
    "vendas_lag_1": 0.8,
    "temperatura": 0.6,
    "vendas_rolling_7": 0.4
  },
  "feature_correlations": {
    "vendas_temperatura": 0.7
  },
  "lag_features": [1, 7, 30],
  "rolling_features": [
    {"window": 7, "operation": "mean"},
    {"window": 14, "operation": "std"}
  ]
}
```

**Parâmetros Salvos:**
- Features selecionadas para o modelo
- Configuração de engenharia de features
- Tamanho da janela de entrada e horizonte de previsão
- Método de seleção de features
- Importância e correlações das features
- Configurações específicas de lag e rolling features

### 6. Etapa de Modelo
```
POST /api/v1/pipelines/{pipeline_id}/steps/modelo
```

**Payload:**
```json
{
  "algorithm": "lstm",
  "algorithm_category": "deep_learning",
  "hyperparameters": {
    "hidden_size": 128,
    "num_layers": 2,
    "dropout": 0.2,
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 100
  },
  "model_type": "multivariate",
  "validation_method": "time_series_split",
  "metrics_config": {
    "primary_metric": "mse",
    "additional_metrics": ["mae", "mape", "rmse"]
  },
  "auto_hyperparameter_tuning": true,
  "tuning_method": "bayesian"
}
```

**Parâmetros Salvos:**
- Algoritmo selecionado e sua categoria
- Hiperparâmetros específicos do modelo
- Tipo do modelo (univariado/multivariado)
- Método de validação
- Configuração de métricas de avaliação
- Configurações de tuning automático

## Endpoints de Navegação

### Completar Etapa
```
POST /api/v1/pipelines/{pipeline_id}/complete-step/{step_name}
```
Marca uma etapa como completa e avança para a próxima.

**Response:**
```json
{
  "message": "Step upload completed successfully",
  "next_step": "preview",
  "completed_step": "upload"
}
```

### Obter Dados de Uma Etapa
```
GET /api/v1/pipelines/{pipeline_id}/steps/{step_name}
```

**Response:**
```json
{
  "step_name": "upload",
  "data": {
    "dataset_id": 123,
    "dataset_name": "Vendas 2024",
    "total_rows": 10000
  },
  "completed": true,
  "is_current": false
}
```

## Fluxo de Uso

1. **Criar Pipeline**: `POST /api/v1/pipelines/`
2. **Para cada etapa**:
   - Configurar: `POST /api/v1/pipelines/{id}/steps/{step_name}`
   - Completar: `POST /api/v1/pipelines/{id}/complete-step/{step_name}`
3. **Monitorar**: `GET /api/v1/pipelines/{id}/flow`

## Validações

- Cada etapa valida seus parâmetros específicos
- Não é possível pular etapas obrigatórias
- Dados de etapas anteriores são preservados
- Validação de tipos e valores obrigatórios

## Etapas Válidas

- `upload`: Carregamento dos dados
- `preview`: Configuração de colunas
- `divisao`: Divisão dos dados
- `preprocessing`: Pré-processamento
- `features`: Engenharia de atributos
- `modelo`: Configuração do modelo

## Status do Pipeline

- `created`: Pipeline criado
- `configuring`: Em configuração
- `completed`: Todas as etapas completadas
- `training`: Em treinamento
- `failed`: Erro durante processamento
- `archived`: Arquivado

Esta estrutura garante que todos os parâmetros selecionados em cada etapa sejam devidamente armazenados e possam ser recuperados posteriormente. 