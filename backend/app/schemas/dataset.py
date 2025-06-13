"""
Dataset schemas for API validation
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.dataset import DatasetStatus, DatasetType


class DatasetBase(BaseModel):
    """Base dataset schema."""
    name: str = Field(..., min_length=1, max_length=200, description="Dataset name")
    description: Optional[str] = Field(None, max_length=1000, description="Dataset description")
    dataset_type: DatasetType = Field(default=DatasetType.TIME_SERIES, description="Dataset type")


class DatasetCreate(DatasetBase):
    """Schema for creating a new dataset."""
    filename: str = Field(..., description="Original filename")
    file_path: str = Field(..., description="Path to stored file")
    file_size: Optional[int] = Field(None, description="File size in bytes")


class DatasetUpdate(BaseModel):
    """Schema for updating dataset information."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Dataset name")
    description: Optional[str] = Field(None, max_length=1000, description="Dataset description")
    dataset_type: Optional[DatasetType] = Field(None, description="Dataset type")
    status: Optional[DatasetStatus] = Field(None, description="Dataset status")
    columns_info: Optional[Dict[str, Any]] = Field(None, description="Column metadata")
    row_count: Optional[int] = Field(None, description="Number of rows")
    validation_errors: Optional[Dict[str, Any]] = Field(None, description="Validation errors")
    dataset_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class DatasetResponse(DatasetBase):
    """Schema for dataset response."""
    id: int
    filename: str
    file_path: str
    file_size: Optional[int]
    status: DatasetStatus
    columns_info: Optional[Dict[str, Any]]
    row_count: Optional[int]
    validation_errors: Optional[Dict[str, Any]]
    dataset_metadata: Optional[Dict[str, Any]]
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class DatasetListResponse(BaseModel):
    """Schema for dataset list response."""
    datasets: List[DatasetResponse]
    total: int
    page: int
    size: int


class DatasetUploadResponse(BaseModel):
    """Schema for dataset upload response."""
    dataset_id: int
    filename: str
    file_size: int
    status: str
    message: str


class DatasetPreviewResponse(BaseModel):
    """Schema for dataset preview response."""
    columns: List[str]
    data: List[Dict[str, Any]]
    total_rows: int
    preview_rows: int
    data_types: Dict[str, str]
    statistics: Optional[Dict[str, Any]]


class DatasetValidationResponse(BaseModel):
    """Schema for dataset validation response."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]
    column_analysis: Dict[str, Any]
    time_series_info: Optional[Dict[str, Any]]


class DatasetStatusUpdate(BaseModel):
    """Schema for updating dataset status."""
    status: DatasetStatus = Field(..., description="New dataset status")
    message: Optional[str] = Field(None, description="Status update message")


class DatasetAnalysisRequest(BaseModel):
    """Schema for dataset analysis request."""
    dataset_id: int
    analyze_columns: Optional[List[str]] = Field(None, description="Specific columns to analyze")
    sample_size: Optional[int] = Field(1000, ge=100, le=10000, description="Sample size for analysis")
    detect_time_series: bool = Field(True, description="Whether to detect time series patterns")


class ColumnInfo(BaseModel):
    """Schema for column information."""
    name: str
    data_type: str
    null_count: int
    null_percentage: float
    unique_count: int
    is_numeric: bool
    is_potential_date: bool
    is_potential_target: bool
    statistics: Optional[Dict[str, Any]] = None
    sample_values: List[str]


class TimeSeriesInfo(BaseModel):
    """Schema for time series information."""
    date_column: Optional[str]
    frequency: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    total_periods: Optional[int]
    missing_periods: Optional[int]
    is_regular: bool
    seasonality_detected: Optional[Dict[str, Any]]


class DatasetAnalysisResponse(BaseModel):
    """Schema for comprehensive dataset analysis response."""
    dataset_id: int
    total_rows: int
    total_columns: int
    memory_usage_mb: float
    columns_info: List[ColumnInfo]
    time_series_info: Optional[TimeSeriesInfo]
    data_quality_score: float
    recommendations: List[str]
    warnings: List[str]
    errors: List[str]
    analysis_timestamp: datetime


class DatasetProcessingRequest(BaseModel):
    """Schema for dataset processing request."""
    dataset_id: int
    save_to_database: bool = Field(True, description="Whether to save processed data to database")
    chunk_size: int = Field(10000, ge=1000, le=100000, description="Chunk size for processing")


class DatasetProcessingResponse(BaseModel):
    """Schema for dataset processing response."""
    dataset_id: int
    processing_status: str
    rows_processed: int
    columns_processed: int
    processing_time_seconds: float
    database_table_name: Optional[str]
    errors: List[str]
    warnings: List[str]


class DatasetColumnsResponse(BaseModel):
    """Schema for dataset columns information."""
    dataset_id: int
    columns: List[ColumnInfo]
    suggested_date_column: Optional[str]
    suggested_target_columns: List[str]
    numeric_columns: List[str]
    categorical_columns: List[str]
    date_columns: List[str]


# ===== NEW SCHEMAS FOR TIME SERIES ANALYSIS =====

class TimeSeriesAnalysisRequest(BaseModel):
    """Schema for time series analysis request."""
    dataset_id: int
    target_column: str = Field(..., description="Target column for analysis")
    date_column: Optional[str] = Field(None, description="Date column for time series")
    max_lags: int = Field(50, ge=1, le=200, description="Maximum lags for ACF/PACF")
    sample_size: Optional[int] = Field(None, description="Sample size for analysis (None = full dataset)")


class AutocorrelationResponse(BaseModel):
    """Schema for autocorrelation analysis response."""
    lags: List[int]
    acf_values: List[float]
    confidence_intervals: List[List[float]]  # [lower, upper] for each lag
    significant_lags: List[int]
    ljung_box_statistic: Optional[float]
    ljung_box_p_value: Optional[float]


class PartialAutocorrelationResponse(BaseModel):
    """Schema for partial autocorrelation analysis response."""
    lags: List[int]
    pacf_values: List[float]
    confidence_intervals: List[List[float]]  # [lower, upper] for each lag
    significant_lags: List[int]


class MutualInformationResponse(BaseModel):
    """Schema for mutual information analysis response."""
    lags: List[int]
    mi_values: List[float]
    optimal_lag: Optional[int]
    mi_threshold: float


class HurstExponentResponse(BaseModel):
    """Schema for Hurst exponent analysis response."""
    hurst_exponent: float
    scales: List[int]
    rs_values: List[float]
    regression_slope: float
    regression_intercept: float
    r_squared: float
    interpretation: str  # "trending", "random_walk", "mean_reverting"


class StationarityTestResponse(BaseModel):
    """Schema for stationarity tests response."""
    adf_statistic: float
    adf_p_value: float
    adf_critical_values: Dict[str, float]
    adf_is_stationary: bool
    kpss_statistic: Optional[float]
    kpss_p_value: Optional[float]
    kpss_critical_values: Optional[Dict[str, float]]
    kpss_is_stationary: Optional[bool]
    pp_statistic: Optional[float]
    pp_p_value: Optional[float]
    pp_is_stationary: Optional[bool]


class SeasonalityAnalysisResponse(BaseModel):
    """Schema for seasonality analysis response."""
    seasonal_periods: List[int]
    seasonal_strengths: List[float]
    dominant_period: Optional[int]
    seasonal_decomposition: Optional[Dict[str, List[float]]]  # trend, seasonal, residual
    fourier_peaks: List[Dict[str, float]]  # frequency and magnitude


class DataQualityResponse(BaseModel):
    """Schema for comprehensive data quality analysis."""
    total_rows: int
    total_columns: int
    missing_values: Dict[str, int]
    missing_percentages: Dict[str, float]
    duplicate_rows: int
    data_types: Dict[str, str]
    numeric_columns: List[str]
    categorical_columns: List[str]
    date_columns: List[str]
    outliers_count: Dict[str, int]
    completeness_score: float
    consistency_score: float
    overall_quality_score: float
    recommendations: List[str]
    issues: List[str]


class ColumnStatisticsResponse(BaseModel):
    """Schema for detailed column statistics."""
    column: str
    data_type: str
    count: int
    null_count: int
    null_percentage: float
    unique_count: int
    unique_percentage: float
    mean: Optional[float]
    median: Optional[float]
    std: Optional[float]
    min: Optional[float]
    max: Optional[float]
    q25: Optional[float]
    q75: Optional[float]
    skewness: Optional[float]
    kurtosis: Optional[float]
    mode: Optional[str]
    most_frequent_values: List[Dict[str, Any]]
    outliers_count: Optional[int]
    outliers_percentage: Optional[float]


class DatasetStatisticsResponse(BaseModel):
    """Schema for complete dataset statistics."""
    dataset_id: int
    total_rows: int
    total_columns: int
    memory_usage_mb: float
    columns_statistics: List[ColumnStatisticsResponse]
    correlations: Optional[Dict[str, Dict[str, float]]]
    general_stats: Dict[str, Any]
    analysis_timestamp: datetime


class TimeSeriesCompleteAnalysisResponse(BaseModel):
    """Schema for complete time series analysis response."""
    dataset_id: int
    target_column: str
    date_column: Optional[str]
    data_quality: DataQualityResponse
    statistics: DatasetStatisticsResponse
    autocorrelation: AutocorrelationResponse
    partial_autocorrelation: PartialAutocorrelationResponse
    mutual_information: MutualInformationResponse
    hurst_exponent: HurstExponentResponse
    stationarity_tests: StationarityTestResponse
    seasonality_analysis: SeasonalityAnalysisResponse
    analysis_timestamp: datetime
    computation_time_seconds: float


class DataVisualizationRequest(BaseModel):
    """Schema for data visualization request."""
    dataset_id: int
    target_column: str
    date_column: Optional[str] = None
    chart_type: str = Field(..., description="Type of chart: 'timeseries', 'histogram', 'boxplot', 'scatter'")
    sample_size: Optional[int] = Field(1000, description="Sample size for visualization")
    additional_columns: Optional[List[str]] = Field(None, description="Additional columns for multi-variate plots")


class DataVisualizationResponse(BaseModel):
    """Schema for data visualization response."""
    dataset_id: int
    chart_type: str
    chart_data: Dict[str, Any]  # Plotly-compatible data structure
    chart_layout: Dict[str, Any]  # Plotly-compatible layout
    sample_size: int
    total_rows: int
    metadata: Dict[str, Any]
