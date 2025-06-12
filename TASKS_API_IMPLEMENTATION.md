# TASKS - Implementação de APIs para Frontend VUR

## Análise do Frontend

### Páginas Principais
1. **Dashboard** - Métricas e estatísticas gerais
2. **Pipeline** - Fluxo completo de ML com 7 etapas
3. **MonitoringPage** - Monitoramento em tempo real
4. **DataManagement** - Gerenciamento de datasets

### Pipeline Steps (7 etapas)
1. **Upload** - Upload de arquivos CSV
2. **Preview** - Visualização e configuração dos dados
3. **Split** - Divisão treino/validação/teste
4. **Preprocessing** - Pré-processamento dos dados
5. **Features** - Engenharia de atributos
6. **Model** - Configuração do modelo
7. **Training** - Treinamento e validação

---

## DETALHAMENTO POR COMPONENTE FRONTEND

### Dashboard.tsx - APIs Necessárias
- **Estatísticas gerais** (modelos ativos, precisão média, datasets, alertas)
- **Atividade recente** (últimas ações nos modelos)
- **Próximas tarefas** (ações recomendadas)
- **Trends e comparações** (métricas vs período anterior)

### Pipeline.tsx - APIs Necessárias
- **Estado do pipeline** (etapa atual, etapas completadas)
- **Dados carregados** (informações do dataset)
- **Configurações** (export/import de configurações)
- **Navegação entre etapas** (validação e progressão)

### MonitoringPage.tsx - APIs Necessárias
- **Pipelines disponíveis** (lista com status)
- **Modelos treinados** (lista com métricas)
- **Conexões de banco** (status e configurações)
- **Predições em tempo real** (WebSocket)
- **Métricas do sistema** (CPU, memória, disco, rede)

### DataManagement.tsx - APIs Necessárias
- **Lista de datasets** (com metadados)
- **Upload de arquivos** (validação e processamento)
- **Estatísticas de uso** (espaço, atualizações)
- **Operações CRUD** (visualizar, download, deletar)

### Componentes Pipeline - APIs Específicas
- **DataUpload**: Upload, validação, detecção automática
- **DataPreview**: Visualização, configuração de colunas
- **TrainTestSplit**: Divisão dos dados
- **DataPreprocessing**: Limpeza e transformação
- **FeatureEngineering**: Criação de features
- **ModelConfiguration**: Seleção e configuração de algoritmos
- **ModelTraining**: Treinamento e validação

---

## ETAPA 1: APIs de Dashboard e Estatísticas

### 1.1 Dashboard Statistics API
**Endpoint:** `GET /api/v1/dashboard/stats`
**Descrição:** Estatísticas gerais do dashboard

**Response:**
```json
{
  "active_models": 12,
  "average_accuracy": 94.2,
  "total_datasets": 45,
  "active_alerts": 3,
  "trends": {
    "models_this_month": "+2",
    "accuracy_vs_last_month": "+1.2%",
    "datasets_this_week": "+5",
    "new_alerts_today": "2"
  }
}
```

### 1.2 Recent Activity API
**Endpoint:** `GET /api/v1/dashboard/activity`
**Descrição:** Atividades recentes do sistema

**Response:**
```json
{
  "activities": [
    {
      "id": 1,
      "type": "model_trained",
      "message": "Modelo Sales_Forecast treinado com sucesso",
      "timestamp": "2024-01-20T14:30:00Z",
      "status": "success"
    }
  ]
}
```

### 1.3 Tasks API
**Endpoint:** `GET /api/v1/dashboard/tasks`
**Descrição:** Próximas tarefas e recomendações

---

## ETAPA 2: APIs de Upload e Gestão de Dados

### 2.1 File Upload API
**Endpoint:** `POST /api/v1/datasets/upload`
**Descrição:** Upload de arquivos CSV

**Request:** Multipart form data
- `file`: CSV file
- `name`: Dataset name (optional)
- `description`: Dataset description (optional)

**Response:**
```json
{
  "dataset_id": "uuid",
  "filename": "sales_data.csv",
  "size": 2048576,
  "columns": ["date", "sales", "region"],
  "rows_count": 10000,
  "detected_types": {
    "date": "datetime",
    "sales": "numeric",
    "region": "categorical"
  },
  "suggestions": {
    "date_column": "date",
    "target_column": "sales",
    "numeric_columns": ["sales"]
  }
}
```

### 2.2 Dataset Preview API
**Endpoint:** `GET /api/v1/datasets/{dataset_id}/preview`
**Descrição:** Preview dos dados com paginação

**Query Parameters:**
- `page`: Página (default: 1)
- `limit`: Itens por página (default: 100)
- `columns`: Colunas específicas (optional)

### 2.3 Dataset Statistics API
**Endpoint:** `GET /api/v1/datasets/{dataset_id}/statistics`
**Descrição:** Estatísticas descritivas do dataset

### 2.4 Dataset Configuration API
**Endpoint:** `PUT /api/v1/datasets/{dataset_id}/config`
**Descrição:** Configurar colunas de data e target

**Request:**
```json
{
  "date_column": "date",
  "target_column": "sales",
  "feature_columns": ["region", "category"],
  "exclude_columns": ["id"]
}
```

---

## ETAPA 3: APIs de Pré-processamento

### 3.1 Data Preprocessing API
**Endpoint:** `POST /api/v1/datasets/{dataset_id}/preprocess`
**Descrição:** Aplicar pré-processamento aos dados

**Request:**
```json
{
  "missing_values": {
    "method": "forward_fill",
    "columns": ["sales"]
  },
  "outliers": {
    "method": "iqr",
    "threshold": 1.5,
    "columns": ["sales"]
  },
  "normalization": {
    "method": "minmax",
    "columns": ["sales"]
  },
  "feature_engineering": {
    "lag_features": {
      "enabled": true,
      "lags": [1, 7, 30]
    },
    "rolling_features": {
      "enabled": true,
      "windows": [7, 30],
      "functions": ["mean", "std"]
    },
    "seasonal_features": {
      "enabled": true,
      "extract": ["month", "quarter", "day_of_week"]
    }
  }
}
```

### 3.2 Train-Test Split API
**Endpoint:** `POST /api/v1/datasets/{dataset_id}/split`
**Descrição:** Dividir dados em treino/validação/teste

**Request:**
```json
{
  "train_size": 0.7,
  "validation_size": 0.15,
  "test_size": 0.15,
  "method": "time_series",
  "shuffle": false
}
```

---

## ETAPA 4: APIs de Modelos e Algoritmos

### 4.1 Available Algorithms API
**Endpoint:** `GET /api/v1/models/algorithms`
**Descrição:** Lista de algoritmos disponíveis

**Response:**
```json
{
  "classical": [
    {
      "id": "arima",
      "name": "ARIMA",
      "description": "AutoRegressive Integrated Moving Average",
      "parameters": {
        "p": {"type": "int", "min": 0, "max": 5, "default": 1},
        "d": {"type": "int", "min": 0, "max": 2, "default": 1},
        "q": {"type": "int", "min": 0, "max": 5, "default": 1}
      }
    }
  ],
  "machine_learning": [...],
  "deep_learning": [...]
}
```

### 4.2 Model Configuration API
**Endpoint:** `POST /api/v1/models/configure`
**Descrição:** Configurar modelo para treinamento

**Request:**
```json
{
  "dataset_id": "uuid",
  "algorithm": "arima",
  "hyperparameters": {
    "p": 1,
    "d": 1,
    "q": 1
  },
  "validation": {
    "method": "time_series_split",
    "n_splits": 5
  },
  "optimization": {
    "enabled": true,
    "method": "bayesian",
    "iterations": 50,
    "metric": "rmse"
  },
  "metrics": ["rmse", "mae", "mape", "r2"]
}
```

### 4.3 Custom Model API
**Endpoint:** `POST /api/v1/models/custom`
**Descrição:** Configurar modelo neural personalizado

**Request:**
```json
{
  "dataset_id": "uuid",
  "architecture": {
    "layers": [
      {
        "type": "lstm",
        "units": 50,
        "return_sequences": true,
        "dropout": 0.2
      },
      {
        "type": "dense",
        "units": 25,
        "activation": "relu"
      },
      {
        "type": "dense",
        "units": 1,
        "activation": "linear"
      }
    ]
  },
  "compilation": {
    "optimizer": "adam",
    "loss": "mse",
    "metrics": ["mae", "mape"]
  },
  "training": {
    "epochs": 100,
    "batch_size": 32,
    "validation_split": 0.2,
    "early_stopping": {
      "enabled": true,
      "patience": 10,
      "monitor": "val_loss"
    }
  }
}
```

### 4.4 Hyperparameter Optimization API
**Endpoint:** `POST /api/v1/models/{model_id}/optimize`
**Descrição:** Otimização automática de hiperparâmetros

**Request:**
```json
{
  "method": "bayesian",
  "iterations": 50,
  "search_space": {
    "learning_rate": {"type": "float", "min": 0.0001, "max": 0.1},
    "batch_size": {"type": "int", "choices": [16, 32, 64, 128]},
    "hidden_units": {"type": "int", "min": 10, "max": 200}
  },
  "objective": "minimize",
  "metric": "val_rmse"
}
```

---

## ETAPA 5: APIs de Treinamento

### 5.1 Start Training API
**Endpoint:** `POST /api/v1/models/{model_id}/train`
**Descrição:** Iniciar treinamento do modelo

### 5.2 Training Status API
**Endpoint:** `GET /api/v1/models/{model_id}/training/status`
**Descrição:** Status do treinamento em tempo real

**Response:**
```json
{
  "status": "training",
  "progress": 75,
  "current_epoch": 15,
  "total_epochs": 20,
  "logs": [
    "Epoch 15/20 - Loss: 0.0234",
    "Validation RMSE: 12.45"
  ],
  "metrics": {
    "rmse": 12.45,
    "mae": 8.32,
    "mape": 5.67,
    "r2": 0.89
  }
}
```

### 5.3 Training Results API
**Endpoint:** `GET /api/v1/models/{model_id}/results`
**Descrição:** Resultados finais do treinamento

---

## ETAPA 6: APIs de Monitoramento

### 6.1 Available Pipelines API
**Endpoint:** `GET /api/v1/monitoring/pipelines`
**Descrição:** Pipelines disponíveis para monitoramento

### 6.2 Available Models API
**Endpoint:** `GET /api/v1/monitoring/models`
**Descrição:** Modelos treinados disponíveis

### 6.3 Database Connections API
**Endpoint:** `GET /api/v1/monitoring/databases`
**Descrição:** Conexões de banco disponíveis

### 6.4 Real-time Predictions API
**Endpoint:** `POST /api/v1/monitoring/predictions/start`
**Descrição:** Iniciar predições em tempo real

**Request:**
```json
{
  "pipeline_id": "uuid",
  "model_id": "uuid",
  "database_id": "uuid",
  "interval_seconds": 2
}
```

### 6.5 System Metrics API
**Endpoint:** `GET /api/v1/monitoring/system`
**Descrição:** Métricas do sistema (CPU, memória, etc.)

---

## ETAPA 7: APIs de Predições

### 7.1 Make Prediction API
**Endpoint:** `POST /api/v1/predictions/predict`
**Descrição:** Fazer predição com modelo treinado

### 7.2 Batch Predictions API
**Endpoint:** `POST /api/v1/predictions/batch`
**Descrição:** Predições em lote

### 7.3 Prediction History API
**Endpoint:** `GET /api/v1/predictions/history`
**Descrição:** Histórico de predições

---

## ETAPA 8: APIs de Configuração e Persistência

### 8.1 Pipeline Export API
**Endpoint:** `GET /api/v1/pipelines/{pipeline_id}/export`
**Descrição:** Exportar configuração do pipeline

### 8.2 Pipeline Import API
**Endpoint:** `POST /api/v1/pipelines/import`
**Descrição:** Importar configuração do pipeline

### 8.3 Model Save API
**Endpoint:** `POST /api/v1/models/{model_id}/save`
**Descrição:** Salvar modelo treinado

### 8.4 Model Load API
**Endpoint:** `POST /api/v1/models/load`
**Descrição:** Carregar modelo salvo

---

---

## ALGORITMOS DE MACHINE LEARNING

### Algoritmos Clássicos (Time Series)

#### ARIMA/SARIMA
```python
# app/ml/algorithms/classical/arima.py
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX

class ARIMAModel:
    def __init__(self, order=(1,1,1), seasonal_order=None):
        self.order = order
        self.seasonal_order = seasonal_order
        self.model = None
        self.fitted_model = None

    def fit(self, data):
        if self.seasonal_order:
            self.model = SARIMAX(data, order=self.order, seasonal_order=self.seasonal_order)
        else:
            self.model = ARIMA(data, order=self.order)
        self.fitted_model = self.model.fit()
        return self.fitted_model

    def predict(self, steps=1):
        return self.fitted_model.forecast(steps=steps)
```

#### Prophet
```python
# app/ml/algorithms/classical/prophet.py
from prophet import Prophet
import pandas as pd

class ProphetModel:
    def __init__(self, **kwargs):
        self.model = Prophet(**kwargs)
        self.fitted = False

    def fit(self, data, date_col='ds', target_col='y'):
        df = pd.DataFrame({
            'ds': data[date_col],
            'y': data[target_col]
        })
        self.model.fit(df)
        self.fitted = True
        return self

    def predict(self, periods=30, freq='D'):
        future = self.model.make_future_dataframe(periods=periods, freq=freq)
        forecast = self.model.predict(future)
        return forecast
```

### Algoritmos de Machine Learning

#### Random Forest
```python
# app/ml/algorithms/ml/random_forest.py
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
import numpy as np

class RandomForestTS:
    def __init__(self, **kwargs):
        self.model = RandomForestRegressor(**kwargs)
        self.feature_importance_ = None

    def create_features(self, data, target_col, lags=[1,2,3,7]):
        features = data.copy()

        # Lag features
        for lag in lags:
            features[f'{target_col}_lag_{lag}'] = features[target_col].shift(lag)

        # Rolling features
        for window in [7, 30]:
            features[f'{target_col}_rolling_mean_{window}'] = features[target_col].rolling(window).mean()
            features[f'{target_col}_rolling_std_{window}'] = features[target_col].rolling(window).std()

        return features.dropna()

    def fit(self, X, y):
        self.model.fit(X, y)
        self.feature_importance_ = self.model.feature_importances_
        return self

    def predict(self, X):
        return self.model.predict(X)
```

### Algoritmos de Deep Learning

#### LSTM
```python
# app/ml/algorithms/dl/lstm.py
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import numpy as np

class LSTMModel:
    def __init__(self, sequence_length=60, features=1):
        self.sequence_length = sequence_length
        self.features = features
        self.model = None
        self.scaler = None

    def build_model(self, lstm_units=[50, 50], dropout=0.2):
        model = Sequential()

        # First LSTM layer
        model.add(LSTM(lstm_units[0], return_sequences=True,
                      input_shape=(self.sequence_length, self.features)))
        model.add(Dropout(dropout))

        # Additional LSTM layers
        for units in lstm_units[1:]:
            model.add(LSTM(units, return_sequences=True))
            model.add(Dropout(dropout))

        # Final LSTM layer
        model.add(LSTM(lstm_units[-1]))
        model.add(Dropout(dropout))

        # Output layer
        model.add(Dense(1))

        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        self.model = model
        return model

    def prepare_data(self, data):
        X, y = [], []
        for i in range(self.sequence_length, len(data)):
            X.append(data[i-self.sequence_length:i])
            y.append(data[i])
        return np.array(X), np.array(y)

    def fit(self, data, epochs=100, batch_size=32, validation_split=0.2):
        X, y = self.prepare_data(data)
        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1
        )
        return history
```

---

## IMPLEMENTAÇÃO TÉCNICA DETALHADA

### Estrutura de Arquivos Backend

```
backend/
├── app/
│   ├── api/v1/endpoints/
│   │   ├── dashboard.py          # ETAPA 1
│   │   ├── datasets.py           # ETAPA 2 (expandir)
│   │   ├── preprocessing.py      # ETAPA 3 (novo)
│   │   ├── models.py             # ETAPA 4 (expandir)
│   │   ├── training.py           # ETAPA 5 (novo)
│   │   ├── monitoring.py         # ETAPA 6 (expandir)
│   │   ├── predictions.py        # ETAPA 7 (expandir)
│   │   └── configuration.py      # ETAPA 8 (novo)
│   ├── schemas/
│   │   ├── dashboard.py
│   │   ├── dataset.py
│   │   ├── preprocessing.py
│   │   ├── model.py
│   │   ├── training.py
│   │   ├── monitoring.py
│   │   └── prediction.py
│   ├── services/
│   │   ├── dashboard_service.py
│   │   ├── dataset_service.py
│   │   ├── preprocessing_service.py
│   │   ├── model_service.py
│   │   ├── training_service.py
│   │   ├── monitoring_service.py
│   │   └── prediction_service.py
│   └── ml/
│       ├── algorithms/
│       │   ├── classical/
│       │   ├── machine_learning/
│       │   └── deep_learning/
│       ├── preprocessing/
│       ├── feature_engineering/
│       └── evaluation/
```

### Dependências Adicionais Necessárias

```txt
# Machine Learning & Data Science
scikit-learn>=1.3.0
tensorflow>=2.13.0
torch>=2.0.0
xgboost>=1.7.0
lightgbm>=4.0.0
prophet>=1.1.4
statsmodels>=0.14.0

# Data Processing
polars>=0.19.0  # Alternativa rápida ao pandas
pyarrow>=13.0.0
dask>=2023.9.0  # Para processamento distribuído

# Visualization & Plotting
plotly>=5.17.0
matplotlib>=3.7.0
seaborn>=0.12.0

# Time Series Specific
sktime>=0.24.0
tsfresh>=0.20.0

# Model Serialization
joblib>=1.3.0
pickle5>=0.0.12

# Real-time & Streaming
redis>=5.0.0
celery>=5.3.0
websockets>=11.0.0

# Monitoring & Metrics
prometheus-client>=0.17.0
mlflow>=2.7.0

# File Processing
h5py>=3.9.0  # Para modelos TensorFlow/Keras
```

### WebSocket Implementation

**Arquivo:** `app/websockets/monitoring.py`
```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import json
import asyncio

class MonitoringWebSocket:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast_training_update(self, data: dict):
        for connection in self.active_connections:
            await connection.send_text(json.dumps(data))

    async def broadcast_prediction(self, data: dict):
        for connection in self.active_connections:
            await connection.send_text(json.dumps(data))

monitoring_ws = MonitoringWebSocket()
```

### Cache Strategy

**Redis Configuration:**
```python
# app/core/cache.py
import redis.asyncio as redis
from typing import Optional, Any
import json
import pickle

class CacheService:
    def __init__(self):
        self.redis = redis.Redis(
            host="localhost",
            port=6379,
            decode_responses=False
        )

    async def set_json(self, key: str, value: Any, expire: int = 3600):
        await self.redis.set(key, json.dumps(value), ex=expire)

    async def get_json(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        return json.loads(value) if value else None

    async def set_model(self, key: str, model: Any, expire: int = 86400):
        await self.redis.set(key, pickle.dumps(model), ex=expire)

    async def get_model(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        return pickle.loads(value) if value else None

cache = CacheService()
```

### Background Tasks com Celery

**Arquivo:** `app/tasks/training.py`
```python
from celery import Celery
from app.ml.training import ModelTrainer
from app.websockets.monitoring import monitoring_ws

celery_app = Celery('vur_ml')

@celery_app.task(bind=True)
def train_model_task(self, model_config: dict, dataset_id: str):
    trainer = ModelTrainer(model_config)

    # Callback para updates de progresso
    def progress_callback(progress: int, logs: list):
        monitoring_ws.broadcast_training_update({
            'task_id': self.request.id,
            'progress': progress,
            'logs': logs
        })

    result = trainer.train(dataset_id, progress_callback)
    return result
```

### Error Handling & Validation

**Arquivo:** `app/core/exceptions.py`
```python
from fastapi import HTTPException, status

class VURException(HTTPException):
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)

class DatasetNotFoundError(VURException):
    def __init__(self, dataset_id: str):
        super().__init__(
            detail=f"Dataset {dataset_id} not found",
            status_code=status.HTTP_404_NOT_FOUND
        )

class ModelTrainingError(VURException):
    def __init__(self, message: str):
        super().__init__(
            detail=f"Model training failed: {message}",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

class InvalidDataFormatError(VURException):
    def __init__(self, message: str):
        super().__init__(
            detail=f"Invalid data format: {message}",
            status_code=status.HTTP_400_BAD_REQUEST
        )
```

---

## CRONOGRAMA DE IMPLEMENTAÇÃO

### Semana 1: Fundação
- [ ] Configurar dependências ML
- [ ] Implementar estrutura base de schemas
- [ ] Configurar Redis e Celery
- [ ] Implementar sistema de cache
- [ ] Configurar WebSockets

### Semana 2: ETAPA 1 + 2 (Dashboard + Upload)
- [ ] APIs de Dashboard
- [ ] APIs de Upload de dados
- [ ] Validação e detecção automática
- [ ] Preview e estatísticas
- [ ] Testes unitários

### Semana 3: ETAPA 3 + 4 (Preprocessing + Models)
- [ ] APIs de pré-processamento
- [ ] Implementar algoritmos clássicos
- [ ] APIs de configuração de modelos
- [ ] Validação de hiperparâmetros
- [ ] Testes de integração

### Semana 4: ETAPA 5 + 6 (Training + Monitoring)
- [ ] APIs de treinamento
- [ ] Background tasks
- [ ] WebSocket para updates
- [ ] APIs de monitoramento
- [ ] Métricas do sistema

### Semana 5: ETAPA 7 + 8 (Predictions + Config)
- [ ] APIs de predição
- [ ] Batch processing
- [ ] Export/Import de configurações
- [ ] Persistência de modelos
- [ ] Documentação completa

### Semana 6: Integração e Testes
- [ ] Integração frontend-backend
- [ ] Testes end-to-end
- [ ] Otimização de performance
- [ ] Deploy e monitoramento
- [ ] Documentação final

---

## PRÓXIMOS PASSOS IMEDIATOS

1. **Configurar ambiente ML** - Instalar dependências científicas
2. **Implementar schemas base** - Validação de dados
3. **Configurar Redis/Celery** - Background processing
4. **Implementar ETAPA 1** - Dashboard APIs
5. **Testes e validação** - Garantir qualidade
6. **Documentação** - OpenAPI/Swagger
7. **Integração frontend** - React Query hooks
8. **Monitoramento** - Logs e métricas
9. **Deploy staging** - Ambiente de teste
10. **Feedback e iteração** - Melhorias contínuas

---

## INTEGRAÇÃO FRONTEND-BACKEND

### React Query Hooks

```typescript
// frontend/src/hooks/api/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 30000, // Atualizar a cada 30s
  });
};

export const useRecentActivity = () => {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => api.get('/dashboard/activity'),
    refetchInterval: 60000, // Atualizar a cada 1min
  });
};
```

```typescript
// frontend/src/hooks/api/useDatasets.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useUploadDataset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/datasets/upload', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
};

export const useDatasetPreview = (datasetId: string) => {
  return useQuery({
    queryKey: ['datasets', datasetId, 'preview'],
    queryFn: () => api.get(`/datasets/${datasetId}/preview`),
    enabled: !!datasetId,
  });
};
```

### WebSocket Integration

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: 'training_update' | 'prediction' | 'system_metrics';
  data: any;
}

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => setIsConnected(false);

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { isConnected, messages, sendMessage };
};
```

### API Client Configuration

```typescript
// frontend/src/lib/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Environment Variables

```bash
# frontend/.env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=VUR - Time Series Platform
```

```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/vur_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Backend APIs
- [ ] Dashboard endpoints (stats, activity, tasks)
- [ ] Dataset upload e management
- [ ] Data preprocessing e feature engineering
- [ ] Model configuration e algorithms
- [ ] Training com background tasks
- [ ] Real-time monitoring
- [ ] Predictions e batch processing
- [ ] Configuration export/import

### Frontend Integration
- [ ] React Query hooks para todas as APIs
- [ ] WebSocket para updates em tempo real
- [ ] Error handling e loading states
- [ ] Form validation com Zod
- [ ] File upload com progress
- [ ] Charts e visualizações
- [ ] Responsive design
- [ ] Accessibility (a11y)

### Infrastructure
- [ ] Docker containers
- [ ] Redis para cache e sessions
- [ ] Celery para background tasks
- [ ] PostgreSQL database
- [ ] Nginx reverse proxy
- [ ] SSL certificates
- [ ] Monitoring e logs
- [ ] Backup strategy

### Testing
- [ ] Unit tests (backend)
- [ ] Integration tests
- [ ] E2E tests (frontend)
- [ ] API documentation
- [ ] Performance testing
- [ ] Security testing
- [ ] Load testing
- [ ] User acceptance testing

### Deployment
- [ ] CI/CD pipeline
- [ ] Staging environment
- [ ] Production deployment
- [ ] Database migrations
- [ ] Environment configuration
- [ ] Monitoring setup
- [ ] Backup verification
- [ ] Performance optimization

---

## CONCLUSÃO

Este documento fornece um roadmap completo para implementar todas as APIs necessárias para servir o frontend VUR. A implementação deve ser feita de forma incremental, seguindo as etapas definidas e mantendo sempre a qualidade através de testes e documentação adequada.

O sistema resultante será uma plataforma completa de machine learning para séries temporais, com interface moderna e APIs robustas para suportar todas as funcionalidades do frontend.
