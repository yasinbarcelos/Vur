"""
Data Analysis Service for CSV processing and analysis
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.dataset import (
    ColumnInfo, 
    TimeSeriesInfo, 
    DatasetAnalysisResponse,
    DatasetProcessingResponse
)

logger = structlog.get_logger(__name__)


class DataAnalysisService:
    """Service for analyzing and processing CSV datasets."""
    
    @staticmethod
    def analyze_csv_file(file_path: str, sample_size: int = 1000) -> Dict[str, Any]:
        """
        Analyze a CSV file and extract comprehensive information.
        
        Args:
            file_path: Path to the CSV file
            sample_size: Number of rows to sample for analysis
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Read the file with error handling
            df = DataAnalysisService._read_csv_safely(file_path)
            
            if df is None or df.empty:
                raise ValueError("Could not read CSV file or file is empty")
            
            # Sample data for analysis if dataset is large
            if len(df) > sample_size:
                analysis_df = df.sample(n=sample_size, random_state=42)
            else:
                analysis_df = df.copy()
            
            # Basic information
            total_rows = len(df)
            total_columns = len(df.columns)
            memory_usage = df.memory_usage(deep=True).sum() / (1024 * 1024)  # MB
            
            # Analyze columns
            columns_info = DataAnalysisService._analyze_columns(analysis_df, df)
            
            # Detect time series information
            time_series_info = DataAnalysisService._detect_time_series(df, columns_info)
            
            # Calculate data quality score
            quality_score = DataAnalysisService._calculate_quality_score(columns_info, total_rows)
            
            # Generate recommendations
            recommendations = DataAnalysisService._generate_recommendations(
                columns_info, time_series_info, total_rows
            )
            
            # Generate warnings and errors
            warnings, errors = DataAnalysisService._generate_warnings_errors(
                columns_info, time_series_info, total_rows
            )
            
            return {
                'total_rows': total_rows,
                'total_columns': total_columns,
                'memory_usage_mb': round(memory_usage, 2),
                'columns_info': columns_info,
                'time_series_info': time_series_info,
                'data_quality_score': quality_score,
                'recommendations': recommendations,
                'warnings': warnings,
                'errors': errors,
                'analysis_timestamp': datetime.utcnow()
            }
            
        except Exception as e:
            logger.error("Failed to analyze CSV file", file_path=file_path, error=str(e))
            raise ValueError(f"Failed to analyze CSV file: {str(e)}")
    
    @staticmethod
    def _read_csv_safely(file_path: str) -> Optional[pd.DataFrame]:
        """Safely read CSV file with multiple encoding attempts."""
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        separators = [',', ';', '\t', '|']
        
        for encoding in encodings:
            for sep in separators:
                try:
                    df = pd.read_csv(file_path, encoding=encoding, sep=sep, low_memory=False)
                    if len(df.columns) > 1:  # Valid CSV should have multiple columns
                        logger.info(
                            "Successfully read CSV", 
                            encoding=encoding, 
                            separator=sep,
                            shape=df.shape
                        )
                        return df
                except Exception:
                    continue
        
        logger.error("Failed to read CSV with any encoding/separator combination")
        return None
    
    @staticmethod
    def _analyze_columns(analysis_df: pd.DataFrame, full_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze each column in the dataset."""
        columns_info = []
        
        for col in analysis_df.columns:
            col_data = analysis_df[col]
            full_col_data = full_df[col]
            
            # Basic statistics
            null_count = int(full_col_data.isna().sum())
            null_percentage = (null_count / len(full_df)) * 100
            unique_count = int(full_col_data.nunique())
            
            # Data type detection
            is_numeric = pd.api.types.is_numeric_dtype(col_data)
            is_potential_date = DataAnalysisService._is_potential_date_column(col_data)
            is_potential_target = DataAnalysisService._is_potential_target_column(col, col_data)
            
            # Sample values (non-null)
            sample_values = col_data.dropna().astype(str).head(5).tolist()
            
            # Statistics based on data type
            statistics = None
            if is_numeric:
                statistics = {
                    'mean': float(col_data.mean()) if not col_data.isna().all() else None,
                    'median': float(col_data.median()) if not col_data.isna().all() else None,
                    'std': float(col_data.std()) if not col_data.isna().all() else None,
                    'min': float(col_data.min()) if not col_data.isna().all() else None,
                    'max': float(col_data.max()) if not col_data.isna().all() else None,
                    'q25': float(col_data.quantile(0.25)) if not col_data.isna().all() else None,
                    'q75': float(col_data.quantile(0.75)) if not col_data.isna().all() else None,
                }
            else:
                most_frequent = col_data.mode()
                statistics = {
                    'most_frequent': str(most_frequent.iloc[0]) if len(most_frequent) > 0 else None,
                    'unique_values': min(unique_count, 10),  # Limit for performance
                    'top_values': col_data.value_counts().head(5).to_dict()
                }
            
            columns_info.append({
                'name': col,
                'data_type': str(col_data.dtype),
                'null_count': null_count,
                'null_percentage': round(null_percentage, 2),
                'unique_count': unique_count,
                'is_numeric': is_numeric,
                'is_potential_date': is_potential_date,
                'is_potential_target': is_potential_target,
                'statistics': statistics,
                'sample_values': sample_values
            })
        
        return columns_info
    
    @staticmethod
    def _is_potential_date_column(col_data: pd.Series) -> bool:
        """Check if a column could be a date column."""
        if col_data.dtype == 'object':
            try:
                # Try to parse a sample of non-null values
                sample = col_data.dropna().head(100)
                if len(sample) == 0:
                    return False
                
                parsed = pd.to_datetime(sample, errors='coerce')
                success_rate = parsed.notna().sum() / len(sample)
                return success_rate > 0.8  # 80% success rate
            except:
                return False
        return False
    
    @staticmethod
    def _is_potential_target_column(col_name: str, col_data: pd.Series) -> bool:
        """Check if a column could be a target variable."""
        # Check column name patterns
        target_keywords = [
            'target', 'label', 'y', 'output', 'result', 'outcome',
            'sales', 'revenue', 'price', 'value', 'amount', 'count',
            'demand', 'volume', 'quantity', 'score', 'rating'
        ]
        
        name_lower = col_name.lower()
        has_target_keyword = any(keyword in name_lower for keyword in target_keywords)
        
        # Check if numeric (targets are usually numeric)
        is_numeric = pd.api.types.is_numeric_dtype(col_data)
        
        # Check variability (targets should have some variation)
        has_variation = col_data.nunique() > 1 if not col_data.empty else False
        
        return has_target_keyword and is_numeric and has_variation
    
    @staticmethod
    def _detect_time_series(df: pd.DataFrame, columns_info: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect time series patterns in the dataset."""
        # Find potential date columns
        date_columns = [col['name'] for col in columns_info if col['is_potential_date']]
        
        if not date_columns:
            return None
        
        # Use the first date column found
        date_column = date_columns[0]
        
        try:
            # Parse dates
            dates = pd.to_datetime(df[date_column], errors='coerce')
            valid_dates = dates.dropna().sort_values()
            
            if len(valid_dates) < 2:
                return None
            
            # Analyze frequency
            time_diffs = valid_dates.diff().dropna()
            most_common_diff = time_diffs.mode()
            
            frequency = None
            if len(most_common_diff) > 0:
                diff_days = most_common_diff.iloc[0].days
                if diff_days == 1:
                    frequency = 'daily'
                elif diff_days == 7:
                    frequency = 'weekly'
                elif 28 <= diff_days <= 31:
                    frequency = 'monthly'
                elif 365 <= diff_days <= 366:
                    frequency = 'yearly'
                else:
                    frequency = f'{diff_days}_days'
            
            # Check regularity
            is_regular = len(time_diffs.unique()) <= 3  # Allow some variation
            
            return {
                'date_column': date_column,
                'frequency': frequency,
                'start_date': str(valid_dates.min().date()),
                'end_date': str(valid_dates.max().date()),
                'total_periods': len(valid_dates),
                'missing_periods': len(df) - len(valid_dates),
                'is_regular': is_regular,
                'seasonality_detected': None  # Could be expanded with seasonal analysis
            }
            
        except Exception as e:
            logger.warning("Failed to analyze time series", date_column=date_column, error=str(e))
            return None
    
    @staticmethod
    def _calculate_quality_score(columns_info: List[Dict[str, Any]], total_rows: int) -> float:
        """Calculate overall data quality score (0-1)."""
        if not columns_info:
            return 0.0
        
        scores = []
        
        for col in columns_info:
            col_score = 1.0
            
            # Penalize missing values
            null_percentage = col['null_percentage']
            if null_percentage > 50:
                col_score *= 0.3
            elif null_percentage > 20:
                col_score *= 0.7
            elif null_percentage > 5:
                col_score *= 0.9
            
            # Reward data type consistency
            if col['is_numeric'] or col['is_potential_date']:
                col_score *= 1.1
            
            # Penalize low uniqueness (except for categorical variables)
            uniqueness_ratio = col['unique_count'] / total_rows
            if uniqueness_ratio < 0.01 and col['is_numeric']:  # Very low uniqueness for numeric
                col_score *= 0.8
            
            scores.append(min(col_score, 1.0))
        
        return round(sum(scores) / len(scores), 3)
    
    @staticmethod
    def _generate_recommendations(
        columns_info: List[Dict[str, Any]], 
        time_series_info: Optional[Dict[str, Any]], 
        total_rows: int
    ) -> List[str]:
        """Generate recommendations based on analysis."""
        recommendations = []
        
        # Date column recommendations
        date_columns = [col for col in columns_info if col['is_potential_date']]
        if not date_columns:
            recommendations.append("Consider adding a date/time column for time series analysis")
        elif len(date_columns) > 1:
            recommendations.append("Multiple date columns detected. Choose the primary time column")
        
        # Target variable recommendations
        target_columns = [col for col in columns_info if col['is_potential_target']]
        if not target_columns:
            recommendations.append("No clear target variable detected. Specify your prediction target")
        elif len(target_columns) > 3:
            recommendations.append("Multiple potential targets found. Focus on the main variable to predict")
        
        # Missing values recommendations
        high_missing_cols = [col for col in columns_info if col['null_percentage'] > 20]
        if high_missing_cols:
            recommendations.append(f"Handle missing values in {len(high_missing_cols)} columns with >20% missing data")
        
        # Data size recommendations
        if total_rows < 100:
            recommendations.append("Dataset is very small. Consider collecting more data for better model performance")
        elif total_rows > 100000:
            recommendations.append("Large dataset detected. Consider sampling for faster preprocessing")
        
        return recommendations
    
    @staticmethod
    def _generate_warnings_errors(
        columns_info: List[Dict[str, Any]], 
        time_series_info: Optional[Dict[str, Any]], 
        total_rows: int
    ) -> Tuple[List[str], List[str]]:
        """Generate warnings and errors based on analysis."""
        warnings = []
        errors = []
        
        # Critical errors
        if total_rows == 0:
            errors.append("Dataset is empty")
        elif len(columns_info) < 2:
            errors.append("Dataset must have at least 2 columns")
        
        # Warnings
        if total_rows < 50:
            warnings.append("Very small dataset - results may not be reliable")
        
        critical_missing_cols = [col for col in columns_info if col['null_percentage'] > 80]
        if critical_missing_cols:
            warnings.append(f"Columns with >80% missing values: {[col['name'] for col in critical_missing_cols]}")
        
        if time_series_info and time_series_info['missing_periods'] > 0:
            warnings.append(f"Time series has {time_series_info['missing_periods']} missing time periods")
        
        return warnings, errors
