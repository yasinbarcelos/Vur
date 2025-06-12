"""
Dataset endpoints
"""

import os
import shutil
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
    DatasetColumnsResponse
)
from app.services.dataset_service import DatasetService
from app.services.auth_service import AuthService
from app.models.user import User
from app.core.config import get_settings
import structlog

logger = structlog.get_logger(__name__)
settings = get_settings()
router = APIRouter()


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
    rows: int = Query(10, ge=1, le=100, description="Number of rows to preview"),
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

    # Check ownership (or admin access)
    if dataset.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    try:
        preview_data = DatasetService.get_dataset_preview(dataset.file_path, rows)
        return DatasetPreviewResponse(**preview_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{dataset_id}/validate", response_model=DatasetValidationResponse)
async def validate_dataset(
    dataset_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Validate dataset for time series analysis.

    Args:
        dataset_id: Dataset ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dataset validation results

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

    validation_results = DatasetService.validate_dataset(dataset.file_path)
    return DatasetValidationResponse(**validation_results)


@router.post("/{dataset_id}/analyze", response_model=DatasetAnalysisResponse)
async def analyze_dataset(
    dataset_id: int,
    sample_size: int = Query(1000, ge=100, le=10000, description="Sample size for analysis"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Perform comprehensive analysis of a dataset.

    Args:
        dataset_id: Dataset ID
        sample_size: Number of rows to sample for analysis
        current_user: Current authenticated user
        db: Database session

    Returns:
        Comprehensive dataset analysis results

    Raises:
        HTTPException: If dataset not found or access denied
    """
    try:
        analysis_result = await DatasetService.analyze_dataset(
            db, dataset_id, current_user.id, sample_size
        )

        logger.info("Dataset analysis completed", dataset_id=dataset_id, user_id=current_user.id)
        return analysis_result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Dataset analysis failed", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze dataset"
        )


@router.get("/{dataset_id}/columns", response_model=DatasetColumnsResponse)
async def get_dataset_columns(
    dataset_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get detailed column information for a dataset.

    Args:
        dataset_id: Dataset ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dataset columns information with suggestions

    Raises:
        HTTPException: If dataset not found or access denied
    """
    try:
        columns_info = await DatasetService.get_dataset_columns(
            db, dataset_id, current_user.id
        )

        logger.info("Dataset columns retrieved", dataset_id=dataset_id, user_id=current_user.id)
        return columns_info

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Failed to get dataset columns", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dataset columns"
        )


@router.post("/{dataset_id}/process", response_model=DatasetProcessingResponse)
async def process_dataset(
    dataset_id: int,
    chunk_size: int = Query(10000, ge=1000, le=100000, description="Chunk size for processing"),
    current_user: User = Depends(AuthService.get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Process CSV data and save to database for faster access.

    Args:
        dataset_id: Dataset ID
        chunk_size: Chunk size for processing large files
        current_user: Current authenticated user
        db: Database session

    Returns:
        Processing results

    Raises:
        HTTPException: If dataset not found or access denied
    """
    try:
        processing_result = await DatasetService.process_and_save_dataset(
            db, dataset_id, current_user.id, chunk_size
        )

        logger.info(
            "Dataset processing completed",
            dataset_id=dataset_id,
            user_id=current_user.id,
            status=processing_result.processing_status
        )
        return processing_result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Dataset processing failed", dataset_id=dataset_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process dataset"
        )