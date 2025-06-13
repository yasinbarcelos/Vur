import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Dataset, DatasetPreview, DatasetUploadResponse } from '@/types/dataset';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor para adicionar token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('vur_auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor para tratamento de erros
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expirado ou inválido
          localStorage.removeItem('vur_auth_token');
          localStorage.removeItem('vur_token_expiry');
          window.location.href = '/auth';
        }
        
        // Extrair mensagem de erro
        const message = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       error.message || 
                       'Erro desconhecido';
        
        return Promise.reject(new Error(message));
      }
    );
  }

  // Métodos HTTP básicos
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config);
  }

  // Método para upload de arquivos
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Método para download de arquivos
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Métodos específicos da API
  
  // Auth endpoints
  auth = {
    login: (credentials: { username: string; password: string }) =>
      this.post('/auth/login', credentials),
    
    register: (data: { email: string; username: string; password: string; full_name?: string }) =>
      this.post('/auth/register', data),
    
    me: () => this.get('/auth/me'),
    
    updateProfile: (data: any) => this.put('/auth/profile', data),
  };

  // Dashboard endpoints
  dashboard = {
    getStats: () => this.get('/dashboard/stats'),
    getActivity: () => this.get('/dashboard/activity'),
    getTasks: () => this.get('/dashboard/tasks'),
  };

  // Dataset endpoints
  datasets = {
    list: (params?: { skip?: number; limit?: number }) =>
      this.get('/datasets', { params }),
    
    upload: (file: File, onProgress?: (progress: number) => void) =>
      this.uploadFile('/datasets/upload', file, onProgress),
    
    get: (id: string) => this.get(`/datasets/${id}`),
    
    preview: (id: string, params?: { page?: number; limit?: number }) =>
      this.get(`/datasets/${id}/preview`, { params }),
    
    statistics: (id: string) => this.get(`/datasets/${id}/statistics`),

    // New comprehensive analysis endpoints
    analyze: (id: string, sampleSize: number = 1000) =>
      this.post(`/datasets/${id}/analyze?sample_size=${sampleSize}`),

    getColumns: (id: string) => this.get(`/datasets/${id}/columns`),

    validate: (id: string) => this.post(`/datasets/${id}/validate`),

    process: (id: string, chunkSize: number = 10000) =>
      this.post(`/datasets/${id}/process?chunk_size=${chunkSize}`),

    configure: (id: string, config: any) => this.put(`/datasets/${id}/config`, config),

    preprocess: (id: string, config: any) => this.post(`/datasets/${id}/preprocess`, config),

    split: (id: string, config: any) => this.post(`/datasets/${id}/split`, config),

    delete: (id: string) => this.delete(`/datasets/${id}`),
  };

  // Pipeline endpoints
  pipelines = {
    list: (params?: { skip?: number; limit?: number }) =>
      this.get('/pipelines', { params }),
    
    create: (data: any) => this.post('/pipelines', data),
    
    get: (id: string) => this.get(`/pipelines/${id}`),
    
    update: (id: string, data: any) => this.put(`/pipelines/${id}`, data),
    
    delete: (id: string) => this.delete(`/pipelines/${id}`),
    
    export: (id: string) => this.get(`/pipelines/${id}/export`),
    
    import: (file: File) => this.uploadFile('/pipelines/import', file),
  };

  // Model endpoints
  models = {
    algorithms: () => this.get('/models/algorithms'),
    
    configure: (config: any) => this.post('/models/configure', config),
    
    train: (id: string) => this.post(`/models/${id}/train`),
    
    trainingStatus: (id: string) => this.get(`/models/${id}/training/status`),
    
    results: (id: string) => this.get(`/models/${id}/results`),
    
    save: (id: string) => this.post(`/models/${id}/save`),
    
    load: (data: any) => this.post('/models/load', data),
    
    optimize: (id: string, config: any) => this.post(`/models/${id}/optimize`, config),
  };

  // Monitoring endpoints
  monitoring = {
    pipelines: () => this.get('/monitoring/pipelines'),
    
    models: () => this.get('/monitoring/models'),
    
    databases: () => this.get('/monitoring/databases'),
    
    systemMetrics: () => this.get('/monitoring/system'),
    
    startPredictions: (config: any) => this.post('/monitoring/predictions/start', config),
    
    stopPredictions: () => this.post('/monitoring/predictions/stop'),
  };

  // Prediction endpoints
  predictions = {
    predict: (data: any) => this.post('/predictions/predict', data),
    
    batch: (data: any) => this.post('/predictions/batch', data),
    
    history: (params?: any) => this.get('/predictions/history', { params }),
  };
}

// Instância singleton da API
export const api = new ApiClient();

// Export default para compatibilidade
export default api;

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create headers with auth token
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Create headers for file upload
const getFileUploadHeaders = () => {
  const token = getAuthToken();
  return {
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// ===== EXISTING API FUNCTIONS =====

export const uploadDataset = async (
  file: File,
  name: string,
  description?: string
): Promise<DatasetUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams();
  params.append('name', name);
  if (description) {
    params.append('description', description);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/datasets/upload?${params}`, {
    method: 'POST',
    headers: getFileUploadHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload dataset');
  }

  return response.json();
};

export const getDatasets = async (): Promise<{ datasets: Dataset[]; total: number }> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/datasets/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch datasets');
  }

  return response.json();
};

export const getDatasetPreview = async (
  datasetId: number,
  rows: number = 10
): Promise<DatasetPreview> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/preview?rows=${rows}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch dataset preview');
  }

  return response.json();
};

export const deleteDataset = async (datasetId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/datasets/${datasetId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete dataset');
  }
};

// ===== NEW API FUNCTIONS FOR HEAVY ANALYSIS =====

// Time Series Analysis Types
export interface TimeSeriesAnalysisRequest {
  target_column: string;
  date_column?: string;
  max_lags?: number;
  sample_size?: number;
}

export interface AutocorrelationResponse {
  lags: number[];
  acf_values: number[];
  confidence_intervals: number[][];
  significant_lags: number[];
  ljung_box_statistic?: number;
  ljung_box_p_value?: number;
}

export interface PartialAutocorrelationResponse {
  lags: number[];
  pacf_values: number[];
  confidence_intervals: number[][];
  significant_lags: number[];
}

export interface MutualInformationResponse {
  lags: number[];
  mi_values: number[];
  optimal_lag?: number;
  mi_threshold: number;
}

export interface HurstExponentResponse {
  hurst_exponent: number;
  scales: number[];
  rs_values: number[];
  regression_slope: number;
  regression_intercept: number;
  r_squared: number;
  interpretation: string;
}

export interface StationarityTestResponse {
  adf_statistic: number;
  adf_p_value: number;
  adf_critical_values: { [key: string]: number };
  adf_is_stationary: boolean;
  kpss_statistic?: number;
  kpss_p_value?: number;
  kpss_critical_values?: { [key: string]: number };
  kpss_is_stationary?: boolean;
  pp_statistic?: number;
  pp_p_value?: number;
  pp_is_stationary?: boolean;
}

export interface SeasonalityAnalysisResponse {
  seasonal_periods: number[];
  seasonal_strengths: number[];
  dominant_period?: number;
  seasonal_decomposition?: any;
  fourier_peaks: Array<{
    frequency: number;
    period: number;
    magnitude: number;
  }>;
}

export interface DataQualityResponse {
  total_rows: number;
  total_columns: number;
  missing_values: { [key: string]: number };
  missing_percentages: { [key: string]: number };
  duplicate_rows: number;
  data_types: { [key: string]: string };
  numeric_columns: string[];
  categorical_columns: string[];
  date_columns: string[];
  outliers_count: { [key: string]: number };
  completeness_score: number;
  consistency_score: number;
  overall_quality_score: number;
  recommendations: string[];
  issues: string[];
}

export interface ColumnStatistics {
  column: string;
  data_type: string;
  count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  unique_percentage: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  q25?: number;
  q75?: number;
  skewness?: number;
  kurtosis?: number;
  mode?: string;
  most_frequent_values: Array<{
    value: string;
    count: number;
    percentage: number;
  }>;
  outliers_count?: number;
  outliers_percentage?: number;
}

export interface DatasetStatisticsResponse {
  dataset_id: number;
  total_rows: number;
  total_columns: number;
  memory_usage_mb: number;
  columns_statistics: ColumnStatistics[];
  correlations?: { [key: string]: { [key: string]: number } };
  general_stats: {
    memory_usage_mb: number;
    shape: [number, number];
    dtypes_summary: { [key: string]: number };
    missing_data_summary: {
      total_missing_cells: number;
      missing_percentage: number;
    };
  };
  data_quality: DataQualityResponse;
  analysis_timestamp: string;
}

export interface TimeSeriesCompleteAnalysisResponse {
  dataset_id: number;
  target_column: string;
  date_column?: string;
  data_quality: DataQualityResponse;
  statistics: DatasetStatisticsResponse;
  autocorrelation: AutocorrelationResponse;
  partial_autocorrelation: PartialAutocorrelationResponse;
  mutual_information: MutualInformationResponse;
  hurst_exponent: HurstExponentResponse;
  stationarity_tests: StationarityTestResponse;
  seasonality_analysis: SeasonalityAnalysisResponse;
  analysis_timestamp: string;
  computation_time_seconds: number;
}

// ===== API FUNCTIONS FOR HEAVY ANALYSIS =====

export const getDatasetStatistics = async (
  datasetId: number
): Promise<DatasetStatisticsResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/statistics`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get dataset statistics');
  }

  return response.json();
};

export const getDataQuality = async (
  datasetId: number
): Promise<DataQualityResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/data-quality`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get data quality analysis');
  }

  return response.json();
};

export const analyzeTimeSeries = async (
  datasetId: number,
  request: TimeSeriesAnalysisRequest
): Promise<TimeSeriesCompleteAnalysisResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/timeseries-analysis`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to perform time series analysis');
  }

  return response.json();
};

export const calculateAutocorrelation = async (
  datasetId: number,
  targetColumn: string,
  maxLags: number = 50
): Promise<AutocorrelationResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/autocorrelation?target_column=${encodeURIComponent(targetColumn)}&max_lags=${maxLags}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to calculate autocorrelation');
  }

  return response.json();
};

export const calculatePartialAutocorrelation = async (
  datasetId: number,
  targetColumn: string,
  maxLags: number = 50
): Promise<PartialAutocorrelationResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/partial-autocorrelation?target_column=${encodeURIComponent(targetColumn)}&max_lags=${maxLags}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to calculate partial autocorrelation');
  }

  return response.json();
};

export const calculateMutualInformation = async (
  datasetId: number,
  targetColumn: string,
  maxLags: number = 30
): Promise<MutualInformationResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/mutual-information?target_column=${encodeURIComponent(targetColumn)}&max_lags=${maxLags}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to calculate mutual information');
  }

  return response.json();
};

export const calculateHurstExponent = async (
  datasetId: number,
  targetColumn: string
): Promise<HurstExponentResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/hurst-exponent?target_column=${encodeURIComponent(targetColumn)}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to calculate Hurst exponent');
  }

  return response.json();
};

export const performStationarityTests = async (
  datasetId: number,
  targetColumn: string
): Promise<StationarityTestResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/stationarity-tests?target_column=${encodeURIComponent(targetColumn)}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to perform stationarity tests');
  }

  return response.json();
};

export const analyzeSeasonality = async (
  datasetId: number,
  targetColumn: string,
  maxPeriods: number = 50
): Promise<SeasonalityAnalysisResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/datasets/${datasetId}/seasonality-analysis?target_column=${encodeURIComponent(targetColumn)}&max_periods=${maxPeriods}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze seasonality');
  }

  return response.json();
};
