/**
 * TypeScript types for dataset-related API responses
 */

export interface ColumnInfo {
  name: string;
  data_type: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  is_numeric: boolean;
  is_potential_date: boolean;
  is_potential_target: boolean;
  statistics?: {
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
    q25?: number;
    q75?: number;
    most_frequent?: string;
    unique_values?: number;
    top_values?: Record<string, number>;
  };
  sample_values: string[];
}

export interface TimeSeriesInfo {
  date_column?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  total_periods?: number;
  missing_periods?: number;
  is_regular: boolean;
  seasonality_detected?: Record<string, any>;
}

export interface DatasetAnalysis {
  dataset_id: number;
  total_rows: number;
  total_columns: number;
  memory_usage_mb: number;
  columns_info: ColumnInfo[];
  time_series_info?: TimeSeriesInfo;
  data_quality_score: number;
  recommendations: string[];
  warnings: string[];
  errors: string[];
  analysis_timestamp: string;
}

export interface DatasetColumns {
  dataset_id: number;
  columns: ColumnInfo[];
  suggested_date_column?: string;
  suggested_target_columns: string[];
  numeric_columns: string[];
  categorical_columns: string[];
  date_columns: string[];
}

export interface DatasetProcessingResult {
  dataset_id: number;
  processing_status: string;
  rows_processed: number;
  columns_processed: number;
  processing_time_seconds: number;
  database_table_name?: string;
  errors: string[];
  warnings: string[];
}

export interface DatasetValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  column_analysis: Record<string, any>;
  time_series_info?: Record<string, any>;
}

export interface DatasetPreview {
  columns: string[];
  data: Record<string, any>[];
  total_rows: number;
  preview_rows: number;
  data_types: Record<string, string>;
  statistics?: Record<string, any>;
}

export interface DatasetUploadResponse {
  dataset_id: number;
  filename: string;
  file_size: number;
  status: string;
  message: string;
}

export interface Dataset {
  id: number;
  name: string;
  description?: string;
  filename: string;
  file_path: string;
  file_size?: number;
  dataset_type: 'time_series' | 'tabular' | 'other';
  status: 'uploaded' | 'processing' | 'validated' | 'error' | 'archived';
  columns_info?: Record<string, any>;
  row_count?: number;
  validation_errors?: Record<string, any>;
  dataset_metadata?: Record<string, any>;
  owner_id: number;
  created_at: string;
  updated_at?: string;
}

export interface DatasetListResponse {
  datasets: Dataset[];
  total: number;
  page: number;
  size: number;
}

// Form types for dataset operations
export interface DatasetUploadForm {
  file: File;
  name: string;
  description?: string;
  dataset_type?: 'time_series' | 'tabular' | 'other';
}

export interface DatasetAnalysisRequest {
  dataset_id: number;
  analyze_columns?: string[];
  sample_size?: number;
  detect_time_series?: boolean;
}

export interface DatasetProcessingRequest {
  dataset_id: number;
  save_to_database?: boolean;
  chunk_size?: number;
}

// UI State types
export interface DatasetAnalysisState {
  isLoading: boolean;
  analysis?: DatasetAnalysis;
  error?: string;
}

export interface DatasetUploadState {
  isUploading: boolean;
  progress: number;
  uploadedDataset?: Dataset;
  error?: string;
}

export interface DatasetProcessingState {
  isProcessing: boolean;
  progress?: number;
  result?: DatasetProcessingResult;
  error?: string;
}

// Column selection and configuration
export interface ColumnConfiguration {
  dateColumn?: string;
  targetColumn?: string;
  featureColumns: string[];
  excludeColumns: string[];
}

export interface DataQualityIssue {
  column: string;
  issue_type: 'missing_values' | 'outliers' | 'duplicates' | 'inconsistent_format';
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  percentage: number;
  description: string;
  suggested_action: string;
}

export interface DataQualityReport {
  overall_score: number;
  issues: DataQualityIssue[];
  recommendations: string[];
  column_scores: Record<string, number>;
}

// Export utility types
export type DatasetStatus = Dataset['status'];
export type DatasetType = Dataset['dataset_type'];
export type ColumnDataType = ColumnInfo['data_type'];
export type ProcessingStatus = DatasetProcessingResult['processing_status'];

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

// Error types
export interface DatasetError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Pagination types
export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
  has_prev: boolean;
}
