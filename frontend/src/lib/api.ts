import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

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
