"""
Dataset service for business logic
"""

import os
import pandas as pd
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload

from app.models.dataset import Dataset, DatasetStatus, DatasetType
from app.schemas.dataset import (
    DatasetCreate,
    DatasetUpdate,
    DatasetAnalysisResponse,
    DatasetProcessingResponse,
    DatasetColumnsResponse,
    ColumnInfo
)
from app.services.data_analysis_service import DataAnalysisService
from app.core.config import get_settings
import structlog

logger = structlog.get_logger(__name__)
settings = get_settings()


class DatasetService:
    """Service for dataset management."""
    
    @staticmethod
    async def create_dataset(
        db: AsyncSession, 
        dataset_data: DatasetCreate, 
        owner_id: int
    ) -> Dataset:
        """
        Create a new dataset.
        
        Args:
            db: Database session
            dataset_data: Dataset creation data
            owner_id: Owner user ID
            
        Returns:
            Created dataset
        """
        db_dataset = Dataset(
            name=dataset_data.name,
            description=dataset_data.description,
            filename=dataset_data.filename,
            file_path=dataset_data.file_path,
            file_size=dataset_data.file_size,
            dataset_type=dataset_data.dataset_type,
            status=DatasetStatus.UPLOADED,
            owner_id=owner_id
        )
        
        db.add(db_dataset)
        await db.commit()
        await db.refresh(db_dataset)
        
        logger.info("Dataset created successfully", dataset_id=db_dataset.id, name=db_dataset.name)
        return db_dataset
    
    @staticmethod
    async def get_dataset_by_id(db: AsyncSession, dataset_id: int) -> Optional[Dataset]:
        """Get dataset by ID."""
        result = await db.execute(
            select(Dataset)
            .options(selectinload(Dataset.owner))
            .where(Dataset.id == dataset_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_datasets_by_owner(
        db: AsyncSession, 
        owner_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Dataset], int]:
        """
        Get datasets by owner with pagination.
        
        Returns:
            Tuple of (datasets, total_count)
        """
        # Get total count
        count_result = await db.execute(
            select(func.count(Dataset.id)).where(Dataset.owner_id == owner_id)
        )
        total = count_result.scalar()
        
        # Get datasets
        result = await db.execute(
            select(Dataset)
            .where(Dataset.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
            .order_by(Dataset.created_at.desc())
        )
        datasets = result.scalars().all()
        
        return datasets, total
    
    @staticmethod
    async def update_dataset(
        db: AsyncSession, 
        dataset_id: int, 
        dataset_data: DatasetUpdate,
        owner_id: int
    ) -> Optional[Dataset]:
        """
        Update dataset information.
        
        Args:
            db: Database session
            dataset_id: Dataset ID
            dataset_data: Update data
            owner_id: Owner user ID (for authorization)
            
        Returns:
            Updated dataset or None if not found/unauthorized
        """
        dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
        if not dataset or dataset.owner_id != owner_id:
            return None
        
        # Update fields
        update_data = dataset_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(dataset, field, value)
        
        dataset.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(dataset)
        
        logger.info("Dataset updated successfully", dataset_id=dataset.id)
        return dataset
    
    @staticmethod
    async def delete_dataset(
        db: AsyncSession, 
        dataset_id: int, 
        owner_id: int
    ) -> bool:
        """
        Delete a dataset.
        
        Args:
            db: Database session
            dataset_id: Dataset ID
            owner_id: Owner user ID (for authorization)
            
        Returns:
            True if deleted, False if not found/unauthorized
        """
        dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
        if not dataset or dataset.owner_id != owner_id:
            return False
        
        # Delete physical file
        try:
            if os.path.exists(dataset.file_path):
                os.remove(dataset.file_path)
        except Exception as e:
            logger.warning("Failed to delete dataset file", file_path=dataset.file_path, error=str(e))
        
        await db.delete(dataset)
        await db.commit()
        
        logger.info("Dataset deleted successfully", dataset_id=dataset_id)
        return True
    
    @staticmethod
    def get_dataset_preview(file_path: str, rows: int = 10) -> Dict[str, Any]:
        """
        Get preview of dataset.
        
        Args:
            file_path: Path to dataset file
            rows: Number of rows to preview
            
        Returns:
            Dataset preview information
        """
        try:
            # Read CSV file
            df = pd.read_csv(file_path, nrows=rows + 1000)  # Read extra rows for statistics
            
            # Get preview data
            preview_df = df.head(rows)
            
            # Get data types
            data_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
            
            # Get basic statistics
            statistics = {}
            for col in df.columns:
                if df[col].dtype in ['int64', 'float64']:
                    statistics[col] = {
                        'mean': float(df[col].mean()) if not df[col].isna().all() else None,
                        'std': float(df[col].std()) if not df[col].isna().all() else None,
                        'min': float(df[col].min()) if not df[col].isna().all() else None,
                        'max': float(df[col].max()) if not df[col].isna().all() else None,
                        'null_count': int(df[col].isna().sum())
                    }
                else:
                    statistics[col] = {
                        'unique_count': int(df[col].nunique()),
                        'null_count': int(df[col].isna().sum()),
                        'most_frequent': str(df[col].mode().iloc[0]) if not df[col].empty else None
                    }
            
            return {
                'columns': list(df.columns),
                'data': preview_df.to_dict('records'),
                'total_rows': len(df),
                'preview_rows': len(preview_df),
                'data_types': data_types,
                'statistics': statistics
            }
            
        except Exception as e:
            logger.error("Failed to preview dataset", file_path=file_path, error=str(e))
            raise ValueError(f"Failed to preview dataset: {str(e)}")
    
    @staticmethod
    def validate_dataset(file_path: str) -> Dict[str, Any]:
        """
        Validate dataset for time series analysis.
        
        Args:
            file_path: Path to dataset file
            
        Returns:
            Validation results
        """
        try:
            df = pd.read_csv(file_path)
            
            errors = []
            warnings = []
            suggestions = []
            
            # Basic validations
            if df.empty:
                errors.append("Dataset is empty")
                return {
                    'is_valid': False,
                    'errors': errors,
                    'warnings': warnings,
                    'suggestions': suggestions,
                    'column_analysis': {},
                    'time_series_info': None
                }
            
            if len(df.columns) < 2:
                errors.append("Dataset must have at least 2 columns (date and target)")
            
            # Check for potential date columns
            date_columns = []
            for col in df.columns:
                try:
                    pd.to_datetime(df[col].dropna().head(100))
                    date_columns.append(col)
                except:
                    pass
            
            if not date_columns:
                warnings.append("No date column detected. Time series analysis requires a date column.")
            
            # Check for numeric columns
            numeric_columns = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
            if not numeric_columns:
                errors.append("No numeric columns found for target variable")
            
            # Column analysis
            column_analysis = {}
            for col in df.columns:
                null_count = df[col].isna().sum()
                null_percentage = (null_count / len(df)) * 100
                
                column_analysis[col] = {
                    'data_type': str(df[col].dtype),
                    'null_count': int(null_count),
                    'null_percentage': float(null_percentage),
                    'unique_count': int(df[col].nunique()),
                    'is_potential_date': col in date_columns,
                    'is_numeric': col in numeric_columns
                }
                
                if null_percentage > 50:
                    warnings.append(f"Column '{col}' has {null_percentage:.1f}% missing values")
                elif null_percentage > 20:
                    warnings.append(f"Column '{col}' has {null_percentage:.1f}% missing values")
            
            # Time series specific analysis
            time_series_info = None
            if date_columns and numeric_columns:
                time_series_info = {
                    'potential_date_columns': date_columns,
                    'potential_target_columns': numeric_columns,
                    'recommended_date_column': date_columns[0] if date_columns else None,
                    'recommended_target_column': numeric_columns[0] if numeric_columns else None
                }
                
                suggestions.append(f"Consider using '{date_columns[0]}' as date column")
                suggestions.append(f"Consider using '{numeric_columns[0]}' as target column")
            
            is_valid = len(errors) == 0
            
            return {
                'is_valid': is_valid,
                'errors': errors,
                'warnings': warnings,
                'suggestions': suggestions,
                'column_analysis': column_analysis,
                'time_series_info': time_series_info
            }
            
        except Exception as e:
            logger.error("Failed to validate dataset", file_path=file_path, error=str(e))
            return {
                'is_valid': False,
                'errors': [f"Failed to validate dataset: {str(e)}"],
                'warnings': [],
                'suggestions': [],
                'column_analysis': {},
                'time_series_info': None
            }

    @staticmethod
    async def analyze_dataset(
        db: AsyncSession,
        dataset_id: int,
        owner_id: int,
        sample_size: int = 1000
    ) -> DatasetAnalysisResponse:
        """
        Perform comprehensive analysis of a dataset.

        Args:
            db: Database session
            dataset_id: Dataset ID
            owner_id: Owner user ID (for authorization)
            sample_size: Sample size for analysis

        Returns:
            Comprehensive dataset analysis
        """
        # Get dataset
        dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
        if not dataset or dataset.owner_id != owner_id:
            raise ValueError("Dataset not found or access denied")

        # Perform analysis
        analysis_result = DataAnalysisService.analyze_csv_file(
            dataset.file_path,
            sample_size
        )

        # Update dataset with analysis results
        columns_info = analysis_result['columns_info']
        time_series_info = analysis_result['time_series_info']

        # Update dataset metadata
        dataset.columns_info = {
            'columns': [col['name'] for col in columns_info],
            'analysis': analysis_result
        }
        dataset.row_count = analysis_result['total_rows']
        dataset.status = DatasetStatus.VALIDATED
        dataset.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(dataset)

        logger.info("Dataset analysis completed", dataset_id=dataset_id)

        return DatasetAnalysisResponse(
            dataset_id=dataset_id,
            **analysis_result
        )

    @staticmethod
    async def get_dataset_columns(
        db: AsyncSession,
        dataset_id: int,
        owner_id: int
    ) -> DatasetColumnsResponse:
        """
        Get detailed column information for a dataset.

        Args:
            db: Database session
            dataset_id: Dataset ID
            owner_id: Owner user ID (for authorization)

        Returns:
            Dataset columns information
        """
        # Get dataset
        dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
        if not dataset or dataset.owner_id != owner_id:
            raise ValueError("Dataset not found or access denied")

        # Check if analysis exists
        if not dataset.columns_info or 'analysis' not in dataset.columns_info:
            # Perform quick analysis
            analysis_result = DataAnalysisService.analyze_csv_file(dataset.file_path, 1000)
            columns_info = analysis_result['columns_info']
            time_series_info = analysis_result['time_series_info']
        else:
            # Use existing analysis
            analysis_data = dataset.columns_info['analysis']
            columns_info = analysis_data['columns_info']
            time_series_info = analysis_data['time_series_info']

        # Convert to ColumnInfo objects
        columns = [ColumnInfo(**col) for col in columns_info]

        # Categorize columns
        numeric_columns = [col.name for col in columns if col.is_numeric]
        categorical_columns = [col.name for col in columns if not col.is_numeric and not col.is_potential_date]
        date_columns = [col.name for col in columns if col.is_potential_date]

        # Suggestions
        suggested_date_column = time_series_info['date_column'] if time_series_info else None
        suggested_target_columns = [col.name for col in columns if col.is_potential_target]

        return DatasetColumnsResponse(
            dataset_id=dataset_id,
            columns=columns,
            suggested_date_column=suggested_date_column,
            suggested_target_columns=suggested_target_columns,
            numeric_columns=numeric_columns,
            categorical_columns=categorical_columns,
            date_columns=date_columns
        )

    @staticmethod
    async def process_and_save_dataset(
        db: AsyncSession,
        dataset_id: int,
        owner_id: int,
        chunk_size: int = 10000
    ) -> DatasetProcessingResponse:
        """
        Process CSV data and save to database for faster access.

        Args:
            db: Database session
            dataset_id: Dataset ID
            owner_id: Owner user ID (for authorization)
            chunk_size: Chunk size for processing large files

        Returns:
            Processing results
        """
        start_time = datetime.utcnow()

        # Get dataset
        dataset = await DatasetService.get_dataset_by_id(db, dataset_id)
        if not dataset or dataset.owner_id != owner_id:
            raise ValueError("Dataset not found or access denied")

        errors = []
        warnings = []

        try:
            # Read CSV file
            df = pd.read_csv(dataset.file_path)

            if df.empty:
                raise ValueError("Dataset is empty")

            # Create table name
            table_name = f"dataset_{dataset_id}_data"

            # Clean column names for database
            df.columns = [col.strip().replace(' ', '_').replace('-', '_').lower() for col in df.columns]

            # Process data in chunks for large datasets
            total_rows = len(df)
            rows_processed = 0

            # Create table and insert data
            # Note: This is a simplified approach. In production, you might want to use
            # a more sophisticated approach with proper data types and constraints

            # Drop table if exists
            await db.execute(text(f"DROP TABLE IF EXISTS {table_name}"))

            # Create table dynamically based on DataFrame structure
            create_table_sql = DatasetService._generate_create_table_sql(df, table_name)
            await db.execute(text(create_table_sql))

            # Insert data in chunks
            for chunk_start in range(0, total_rows, chunk_size):
                chunk_end = min(chunk_start + chunk_size, total_rows)
                chunk_df = df.iloc[chunk_start:chunk_end]

                # Convert DataFrame to SQL insert
                insert_sql, values = DatasetService._generate_insert_sql(chunk_df, table_name)

                try:
                    await db.execute(text(insert_sql), values)
                    rows_processed += len(chunk_df)

                    logger.info(
                        "Processed chunk",
                        dataset_id=dataset_id,
                        chunk_start=chunk_start,
                        chunk_end=chunk_end,
                        rows_processed=rows_processed
                    )

                except Exception as e:
                    error_msg = f"Failed to insert chunk {chunk_start}-{chunk_end}: {str(e)}"
                    errors.append(error_msg)
                    logger.error("Chunk processing failed", error=error_msg)

            await db.commit()

            # Update dataset metadata
            dataset.dataset_metadata = {
                'database_table': table_name,
                'processed_at': datetime.utcnow().isoformat(),
                'rows_in_db': rows_processed,
                'columns_in_db': len(df.columns)
            }
            dataset.status = DatasetStatus.VALIDATED
            dataset.updated_at = datetime.utcnow()

            await db.commit()
            await db.refresh(dataset)

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            logger.info(
                "Dataset processing completed",
                dataset_id=dataset_id,
                table_name=table_name,
                rows_processed=rows_processed,
                processing_time=processing_time
            )

            return DatasetProcessingResponse(
                dataset_id=dataset_id,
                processing_status="completed",
                rows_processed=rows_processed,
                columns_processed=len(df.columns),
                processing_time_seconds=processing_time,
                database_table_name=table_name,
                errors=errors,
                warnings=warnings
            )

        except Exception as e:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            error_msg = f"Dataset processing failed: {str(e)}"
            errors.append(error_msg)

            logger.error("Dataset processing failed", dataset_id=dataset_id, error=str(e))

            return DatasetProcessingResponse(
                dataset_id=dataset_id,
                processing_status="failed",
                rows_processed=0,
                columns_processed=0,
                processing_time_seconds=processing_time,
                database_table_name=None,
                errors=errors,
                warnings=warnings
            )

    @staticmethod
    def _generate_create_table_sql(df: pd.DataFrame, table_name: str) -> str:
        """Generate CREATE TABLE SQL from DataFrame."""
        columns_sql = []

        for col in df.columns:
            # Determine SQL data type based on pandas dtype
            dtype = df[col].dtype

            if pd.api.types.is_integer_dtype(dtype):
                sql_type = "INTEGER"
            elif pd.api.types.is_float_dtype(dtype):
                sql_type = "REAL"
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                sql_type = "TIMESTAMP"
            else:
                sql_type = "TEXT"

            columns_sql.append(f"{col} {sql_type}")

        return f"CREATE TABLE {table_name} ({', '.join(columns_sql)})"

    @staticmethod
    def _generate_insert_sql(df: pd.DataFrame, table_name: str) -> Tuple[str, List[Dict]]:
        """Generate INSERT SQL and values from DataFrame."""
        columns = list(df.columns)
        placeholders = ', '.join([f":{col}" for col in columns])

        insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

        # Convert DataFrame to list of dictionaries
        values = df.to_dict('records')

        # Handle NaN values
        for row in values:
            for key, value in row.items():
                if pd.isna(value):
                    row[key] = None

        return insert_sql, values
