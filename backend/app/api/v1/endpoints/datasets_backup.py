"""
Dataset endpoints
"""

import os
import shutil
import pandas as pd
import numpy as np
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.schemas.dataset import (
    DatasetCreate,
    DatasetUpdate,
    DatasetResponse,
    DatasetListResponse,
    DatasetUploadResponse,
    DatasetPreviewResponse,
    DatasetValidationResponse,
    DatasetAnalysisRequest,
    DatasetAnalysisResponse,
    DatasetProcessingRequest,
    DatasetProcessingResponse,
    DatasetColumnsResponse,
    # New schemas for heavy analysis
    TimeSeriesAnalysisRequest,
    AutocorrelationResponse,
    PartialAutocorrelationResponse,
    MutualInformationResponse,
    HurstExponentResponse,
    StationarityTestResponse,
    SeasonalityAnalysisResponse,
    DataQualityResponse,
    ColumnStatisticsResponse,
    DatasetStatisticsResponse,
    TimeSeriesCompleteAnalysisResponse,
    DataVisualizationRequest,
    DataVisualizationResponse
)
from app.services.dataset_service import DatasetService
from app.services.auth_service import AuthService
from app.services.timeseries_analysis_service import TimeSeriesAnalysisService
from app.services.data_analysis_service import DataAnalysisService
from app.models.user import User
from app.core.config import get_settings
import structlog

logger = structlog.get_logger(__name__)
settings = get_settings()
router = APIRouter()

# Initialize analysis services
ts_analysis_service = TimeSeriesAnalysisService()
data_analysis_service = DataAnalysisService()


@router.get("/", response_model=DatasetListResponse)
async def list_datasets(
    skip: int = Query(0, ge=0, description="Number of datasets to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of datasets to return"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List user's datasets with pagination.

    Args:
        skip: Number of datasets to skip
        limit: Number of datasets to return
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of user's datasets with pagination info
    """
    datasets, total = await DatasetService.get_datasets_by_owner(
        db, current_user.id, skip, limit
    )

    return DatasetListResponse(
        datasets=datasets,
        total=total,
        page=skip // limit + 1,
        size=len(datasets)
    )


@router.post("/upload", response_model=DatasetUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Query(..., description="Dataset name"),
    description: str = Query(None, description="Dataset description"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Upload a new dataset.

    Args:
        file: Uploaded file
        name: Dataset name
        description: Dataset description
        current_user: Current authenticated user
        db: Database session

    Returns:
        Upload confirmation with dataset information

    Raises:
        HTTPException: If upload fails
    """
    # Validate file type
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files are supported"
        )

    # Create upload directory if it doesn't exist
    upload_dir = os.path.join("uploads", "datasets", str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(upload_dir, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)

        # Create dataset record
        dataset_data = DatasetCreate(
            name=name,
            description=description,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size
        )

        dataset = await DatasetService.create_dataset(db, dataset_data, current_user.id)

        logger.info("Dataset uploaded successfully", dataset_id=dataset.id, filename=file.filename)

        return DatasetUploadResponse(
            dataset_id=dataset.id,
            filename=file.filename,
            file_size=file_size,
            status="uploaded",
            message="Dataset uploaded successfully"
        )

    except Exception as e:
        # Clean up file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)

        logger.error("Dataset upload failed", filename=file.filename, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload dataset: {str(e)}"
        )


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get dataset details.

    Args:
        dataset_id: Dataset ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dataset information

    Raises:
        HTTPException: If dataset not found or access denied
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check ownership (or admin access)
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return dataset


@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
async def preview_dataset(
    dataset_id: int,
    rows: int = Query(10, ge=1, le=1000000, description="Number of rows to preview"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Preview dataset data.

    Args:
        dataset_id: Dataset ID
        rows: Number of rows to preview
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dataset preview with sample data

    Raises:
        HTTPException: If dataset not found or access denied
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check ownership
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    try:
        # Read dataset file
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)

        # Get preview data
        preview_df = df.head(rows)
        
        # Convert to records for JSON serialization
        data_records = []
        for _, row in preview_df.iterrows():
            record = {}
            for col in df.columns:
                value = row[col]
                if pd.isna(value):
                    record[col] = None
                elif isinstance(value, (np.integer, np.floating)):
                    record[col] = float(value)
                else:
                    record[col] = str(value)
            data_records.append(record)

        # Get data types
        data_types = {}
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                data_types[col] = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                data_types[col] = "datetime"
            else:
                data_types[col] = "text"

        return DatasetPreviewResponse(
            columns=df.columns.tolist(),
            data=data_records,
            total_rows=len(df),
            preview_rows=len(preview_df),
            data_types=data_types,
            statistics=None
        )

    except Exception as e:
        logger.error("Failed to preview dataset", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview dataset: {str(e)}"
        )


# ===== NEW ENDPOINTS FOR HEAVY ANALYSIS =====

@router.get("/{dataset_id}/statistics", response_model=DatasetStatisticsResponse)
async def get_dataset_statistics(
    dataset_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get comprehensive dataset statistics.
    
    Args:
        dataset_id: Dataset ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Complete dataset statistics
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        # Perform complete analysis
        analysis_result = await data_analysis_service.analyze_dataset_complete(df, dataset_id)
        
        return DatasetStatisticsResponse(**analysis_result)
        
    except Exception as e:
        logger.error("Failed to analyze dataset statistics", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze dataset: {str(e)}"
        )


@router.get("/{dataset_id}/data-quality", response_model=DataQualityResponse)
async def get_data_quality(
    dataset_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get data quality analysis.
    
    Args:
        dataset_id: Dataset ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Data quality metrics
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        # Calculate data quality
        quality_result = data_analysis_service.calculate_data_quality(df)
        
        return DataQualityResponse(**quality_result)
        
    except Exception as e:
        logger.error("Failed to analyze data quality", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze data quality: {str(e)}"
        )


@router.post("/{dataset_id}/timeseries-analysis", response_model=TimeSeriesCompleteAnalysisResponse)
async def analyze_timeseries(
    dataset_id: int,
    request: TimeSeriesAnalysisRequest,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Perform complete time series analysis including ACF, PACF, Hurst, MI, etc.
    
    Args:
        dataset_id: Dataset ID
        request: Analysis request parameters
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Complete time series analysis results
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        # Validate target column
        if request.target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target column '{request.target_column}' not found in dataset"
            )
        
        # Extract target series
        target_series = df[request.target_column]
        
        # Convert to numeric and clean
        target_data = ts_analysis_service._safe_float_conversion(target_series)
        
        if len(target_data) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient numeric data in target column for analysis"
            )
        
        # Sample data if requested
        if request.sample_size and request.sample_size < len(target_data):
            np.random.seed(42)
            indices = np.random.choice(len(target_data), request.sample_size, replace=False)
            indices.sort()
            target_data = target_data[indices]
        
        # Perform complete time series analysis
        ts_results = await ts_analysis_service.run_complete_analysis(target_data, request.max_lags)
        
        # Perform data quality and statistics analysis
        data_quality = data_analysis_service.calculate_data_quality(df)
        statistics = await data_analysis_service.analyze_dataset_complete(df, dataset_id)
        
        # Combine results
        complete_analysis = TimeSeriesCompleteAnalysisResponse(
            dataset_id=dataset_id,
            target_column=request.target_column,
            date_column=request.date_column,
            data_quality=DataQualityResponse(**data_quality),
            statistics=DatasetStatisticsResponse(**statistics),
            autocorrelation=AutocorrelationResponse(**ts_results["autocorrelation"]),
            partial_autocorrelation=PartialAutocorrelationResponse(**ts_results["partial_autocorrelation"]),
            mutual_information=MutualInformationResponse(**ts_results["mutual_information"]),
            hurst_exponent=HurstExponentResponse(**ts_results["hurst_exponent"]),
            stationarity_tests=StationarityTestResponse(**ts_results["stationarity_tests"]),
            seasonality_analysis=SeasonalityAnalysisResponse(**ts_results["seasonality_analysis"]),
            analysis_timestamp=ts_results["analysis_timestamp"],
            computation_time_seconds=ts_results["computation_time_seconds"]
        )
        
        return complete_analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to perform time series analysis", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform time series analysis: {str(e)}"
        )


@router.post("/{dataset_id}/autocorrelation", response_model=AutocorrelationResponse)
async def calculate_autocorrelation(
    dataset_id: int,
    target_column: str = Query(..., description="Target column for analysis"),
    max_lags: int = Query(50, ge=1, le=200, description="Maximum lags to calculate"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Calculate autocorrelation function (ACF) for a time series.
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column '{target_column}' not found in dataset"
            )
        
        # Extract and clean data
        target_data = ts_analysis_service._safe_float_conversion(df[target_column])
        
        if len(target_data) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient numeric data for autocorrelation analysis"
            )
        
        # Calculate ACF
        acf_result = ts_analysis_service.calculate_autocorrelation(target_data, max_lags)
        
        return AutocorrelationResponse(**acf_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to calculate autocorrelation", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate autocorrelation: {str(e)}"
        )


@router.post("/{dataset_id}/partial-autocorrelation", response_model=PartialAutocorrelationResponse)
async def calculate_partial_autocorrelation(
    dataset_id: int,
    target_column: str = Query(..., description="Target column for analysis"),
    max_lags: int = Query(50, ge=1, le=200, description="Maximum lags to calculate"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Calculate partial autocorrelation function (PACF) for a time series.
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column '{target_column}' not found in dataset"
            )
        
        # Extract and clean data
        target_data = ts_analysis_service._safe_float_conversion(df[target_column])
        
        if len(target_data) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient numeric data for PACF analysis"
            )
        
        # Calculate PACF
        pacf_result = ts_analysis_service.calculate_partial_autocorrelation(target_data, max_lags)
        
        return PartialAutocorrelationResponse(**pacf_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to calculate PACF", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate PACF: {str(e)}"
        )


@router.post("/{dataset_id}/mutual-information", response_model=MutualInformationResponse)
async def calculate_mutual_information(
    dataset_id: int,
    target_column: str = Query(..., description="Target column for analysis"),
    max_lags: int = Query(30, ge=1, le=100, description="Maximum lags to calculate"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Calculate mutual information for different lags.
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column '{target_column}' not found in dataset"
            )
        
        # Extract and clean data
        target_data = ts_analysis_service._safe_float_conversion(df[target_column])
        
        if len(target_data) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient numeric data for mutual information analysis"
            )
        
        # Calculate MI
        mi_result = ts_analysis_service.calculate_mutual_information(target_data, max_lags)
        
        return MutualInformationResponse(**mi_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to calculate mutual information", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate mutual information: {str(e)}"
        )


@router.post("/{dataset_id}/hurst-exponent", response_model=HurstExponentResponse)
async def calculate_hurst_exponent(
    dataset_id: int,
    target_column: str = Query(..., description="Target column for analysis"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Calculate Hurst exponent using R/S analysis.
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column '{target_column}' not found in dataset"
            )
        
        # Extract and clean data
        target_data = ts_analysis_service._safe_float_conversion(df[target_column])
        
        if len(target_data) < 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient numeric data for Hurst exponent analysis (minimum 50 points)"
            )
        
        # Calculate Hurst exponent
        hurst_result = ts_analysis_service.calculate_hurst_exponent(target_data)
        
        return HurstExponentResponse(**hurst_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to calculate Hurst exponent", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate Hurst exponent: {str(e)}"
        )


@router.post("/{dataset_id}/stationarity-tests", response_model=StationarityTestResponse)
async def perform_stationarity_tests(
    dataset_id: int,
    target_column: str = Query(..., description="Target column for analysis"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Perform stationarity tests (ADF, KPSS, PP).
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column '{target_column}' not found in dataset"
            )
        
        # Extract and clean data
        target_data = ts_analysis_service._safe_float_conversion(df[target_column])
        
        if len(target_data) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient numeric data for stationarity tests (minimum 20 points)"
            )
        
        # Perform stationarity tests
        stationarity_result = ts_analysis_service.calculate_stationarity_tests(target_data)
        
        return StationarityTestResponse(**stationarity_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to perform stationarity tests", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform stationarity tests: {str(e)}"
        )


@router.post("/{dataset_id}/seasonality-analysis", response_model=SeasonalityAnalysisResponse)
async def analyze_seasonality(
    dataset_id: int,
    target_column: str = Query(..., description="Target column for analysis"),
    max_periods: int = Query(50, ge=2, le=200, description="Maximum periods to check"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Analyze seasonality in time series data.
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
    
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )
    
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # Load dataset
        if dataset.filename.endswith('.csv'):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)
        
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column '{target_column}' not found in dataset"
            )
        
        # Extract and clean data
        target_data = ts_analysis_service._safe_float_conversion(df[target_column])
        
        if len(target_data) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient numeric data for seasonality analysis (minimum 20 points)"
            )
        
        # Analyze seasonality
        seasonality_result = ts_analysis_service.calculate_seasonality_analysis(target_data, max_periods)
        
        return SeasonalityAnalysisResponse(**seasonality_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to analyze seasonality", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze seasonality: {str(e)}"
        )


# ===== EXISTING ENDPOINTS (keeping the rest unchanged) =====

@router.post("/{dataset_id}/validate", response_model=DatasetValidationResponse)
async def validate_dataset(
    dataset_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Validate dataset structure and content.

    Args:
        dataset_id: Dataset ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Validation results with errors, warnings, and suggestions

    Raises:
        HTTPException: If dataset not found or access denied
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check ownership
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    try:
        validation_result = await DatasetService.validate_dataset(db, dataset_id)
        return validation_result

    except Exception as e:
        logger.error("Dataset validation failed", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate dataset: {str(e)}"
        )


@router.post("/{dataset_id}/analyze", response_model=DatasetAnalysisResponse)
async def analyze_dataset(
    dataset_id: int,
    sample_size: int = Query(1000, ge=100, le=10000, description="Sample size for analysis"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Perform comprehensive dataset analysis.

    Args:
        dataset_id: Dataset ID
        sample_size: Sample size for analysis
        current_user: Current authenticated user
        db: Database session

    Returns:
        Comprehensive analysis results

    Raises:
        HTTPException: If dataset not found or access denied
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check ownership
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    try:
        analysis_result = await DatasetService.analyze_dataset(db, dataset_id, sample_size)
        return analysis_result

    except Exception as e:
        logger.error("Dataset analysis failed", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze dataset: {str(e)}"
        )


@router.get("/{dataset_id}/columns", response_model=DatasetColumnsResponse)
async def get_dataset_columns(
    dataset_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get dataset column information and suggestions.

    Args:
        dataset_id: Dataset ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Column information with suggestions

    Raises:
        HTTPException: If dataset not found or access denied
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check ownership
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    try:
        columns_info = await DatasetService.get_dataset_columns(db, dataset_id)
        return columns_info

    except Exception as e:
        logger.error("Failed to get dataset columns", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dataset columns: {str(e)}"
        )


@router.post("/{dataset_id}/process", response_model=DatasetProcessingResponse)
async def process_dataset(
    dataset_id: int,
    chunk_size: int = Query(10000, ge=1000, le=1000000, description="Chunk size for processing"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Process dataset for analysis and modeling.

    Args:
        dataset_id: Dataset ID
        chunk_size: Chunk size for processing large datasets
        current_user: Current authenticated user
        db: Database session

    Returns:
        Processing results

    Raises:
        HTTPException: If dataset not found or access denied
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check ownership
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    try:
        processing_result = await DatasetService.process_dataset(db, dataset_id, chunk_size)
        return processing_result

    except Exception as e:
        logger.error("Dataset processing failed", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process dataset: {str(e)}"
        )


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Delete a dataset.

    Args:
        dataset_id: Dataset ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If dataset not found or access denied
    """
    dataset = await DatasetService.get_dataset_by_id(db, dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Check ownership
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    try:
        await DatasetService.delete_dataset(db, dataset_id)
        
        # Clean up file
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)
            
        logger.info("Dataset deleted successfully", dataset_id=dataset_id)
        
        return {"message": "Dataset deleted successfully"}

    except Exception as e:
        logger.error("Dataset deletion failed", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete dataset: {str(e)}"
        )