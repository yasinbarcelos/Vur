"""
Data Analysis Service
Handles data quality analysis and comprehensive statistics
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import warnings
warnings.filterwarnings('ignore')

from scipy import stats
import structlog

logger = structlog.get_logger(__name__)


class DataAnalysisService:
    """Service for data quality analysis and statistics."""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    @staticmethod
    def detect_data_type(series: pd.Series) -> str:
        """
        Detect the data type of a pandas series.
        
        Args:
            series: Pandas series to analyze
            
        Returns:
            String representing the detected data type
        """
        try:
            # Remove null values for analysis
            clean_series = series.dropna()
            
            if len(clean_series) == 0:
                return "empty"
            
            # Sample for performance
            sample_size = min(1000, len(clean_series))
            sample = clean_series.sample(n=sample_size, random_state=42)
            
            # Check if numeric
            try:
                pd.to_numeric(sample, errors='raise')
                # Check if integer or float
                if sample.dtype in ['int64', 'int32', 'int16', 'int8']:
                    return "integer"
                else:
                    return "float"
            except (ValueError, TypeError):
                pass
            
            # Check if datetime
            try:
                pd.to_datetime(sample, errors='raise')
                return "datetime"
            except (ValueError, TypeError):
                pass
            
            # Check if boolean
            if sample.dtype == 'bool':
                return "boolean"
            
            # Check if categorical (low cardinality)
            unique_ratio = len(sample.unique()) / len(sample)
            if unique_ratio < 0.1 and len(sample.unique()) < 50:
                return "categorical"
            
            return "text"
            
        except Exception as e:
            logger.warning("Error detecting data type", error=str(e))
            return "unknown"
    
    @staticmethod
    def calculate_column_statistics(series: pd.Series, column_name: str) -> Dict[str, Any]:
        """
        Calculate comprehensive statistics for a single column.
        
        Args:
            series: Pandas series to analyze
            column_name: Name of the column
            
        Returns:
            Dictionary with column statistics
        """
        try:
            total_count = len(series)
            null_count = series.isnull().sum()
            null_percentage = (null_count / total_count * 100) if total_count > 0 else 0
            
            # Clean series (remove nulls)
            clean_series = series.dropna()
            clean_count = len(clean_series)
            
            # Detect data type
            data_type = DataAnalysisService.detect_data_type(series)
            
            # Basic statistics
            stats_dict = {
                "column": column_name,
                "data_type": data_type,
                "count": total_count,
                "null_count": int(null_count),
                "null_percentage": round(null_percentage, 2),
                "unique_count": int(series.nunique()),
                "unique_percentage": round((series.nunique() / total_count * 100) if total_count > 0 else 0, 2),
                "mean": None,
                "median": None,
                "std": None,
                "min": None,
                "max": None,
                "q25": None,
                "q75": None,
                "skewness": None,
                "kurtosis": None,
                "mode": None,
                "most_frequent_values": [],
                "outliers_count": None,
                "outliers_percentage": None
            }
            
            if clean_count == 0:
                return stats_dict
            
            # Numeric statistics
            if data_type in ["integer", "float"]:
                try:
                    numeric_series = pd.to_numeric(clean_series, errors='coerce').dropna()
                    
                    if len(numeric_series) > 0:
                        stats_dict.update({
                            "mean": round(float(numeric_series.mean()), 4),
                            "median": round(float(numeric_series.median()), 4),
                            "std": round(float(numeric_series.std()), 4),
                            "min": round(float(numeric_series.min()), 4),
                            "max": round(float(numeric_series.max()), 4),
                            "q25": round(float(numeric_series.quantile(0.25)), 4),
                            "q75": round(float(numeric_series.quantile(0.75)), 4),
                        })
                        
                        # Skewness and kurtosis
                        if len(numeric_series) > 3:
                            stats_dict["skewness"] = round(float(stats.skew(numeric_series)), 4)
                            stats_dict["kurtosis"] = round(float(stats.kurtosis(numeric_series)), 4)
                        
                        # Outliers using IQR method
                        q1 = numeric_series.quantile(0.25)
                        q3 = numeric_series.quantile(0.75)
                        iqr = q3 - q1
                        lower_bound = q1 - 1.5 * iqr
                        upper_bound = q3 + 1.5 * iqr
                        
                        outliers = numeric_series[(numeric_series < lower_bound) | (numeric_series > upper_bound)]
                        stats_dict["outliers_count"] = len(outliers)
                        stats_dict["outliers_percentage"] = round((len(outliers) / len(numeric_series) * 100), 2)
                        
                except Exception as e:
                    logger.warning(f"Error calculating numeric statistics for {column_name}", error=str(e))
            
            # Mode and most frequent values
            try:
                value_counts = clean_series.value_counts().head(5)
                stats_dict["mode"] = str(value_counts.index[0]) if len(value_counts) > 0 else None
                stats_dict["most_frequent_values"] = [
                    {"value": str(val), "count": int(count), "percentage": round(count / clean_count * 100, 2)}
                    for val, count in value_counts.items()
                ]
            except Exception as e:
                logger.warning(f"Error calculating mode for {column_name}", error=str(e))
            
            return stats_dict
            
        except Exception as e:
            logger.error(f"Error calculating statistics for column {column_name}", error=str(e))
            return {
                "column": column_name,
                "data_type": "error",
                "count": 0,
                "null_count": 0,
                "null_percentage": 0,
                "unique_count": 0,
                "unique_percentage": 0,
                "mean": None,
                "median": None,
                "std": None,
                "min": None,
                "max": None,
                "q25": None,
                "q75": None,
                "skewness": None,
                "kurtosis": None,
                "mode": None,
                "most_frequent_values": [],
                "outliers_count": None,
                "outliers_percentage": None
            }
    
    @staticmethod
    def calculate_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calculate comprehensive data quality metrics.
        
        Args:
            df: Pandas DataFrame to analyze
            
        Returns:
            Dictionary with data quality metrics
        """
        try:
            total_rows = len(df)
            total_columns = len(df.columns)
            total_cells = total_rows * total_columns
            
            if total_cells == 0:
                return {
                    "total_rows": 0,
                    "total_columns": 0,
                    "missing_values": {},
                    "missing_percentages": {},
                    "duplicate_rows": 0,
                    "data_types": {},
                    "numeric_columns": [],
                    "categorical_columns": [],
                    "date_columns": [],
                    "outliers_count": {},
                    "completeness_score": 0,
                    "consistency_score": 0,
                    "overall_quality_score": 0,
                    "recommendations": [],
                    "issues": []
                }
            
            # Missing values analysis
            missing_values = {}
            missing_percentages = {}
            total_missing = 0
            
            for col in df.columns:
                missing_count = df[col].isnull().sum()
                missing_values[col] = int(missing_count)
                missing_percentages[col] = round((missing_count / total_rows * 100), 2)
                total_missing += missing_count
            
            # Duplicate rows
            duplicate_rows = df.duplicated().sum()
            
            # Data types analysis
            data_types = {}
            numeric_columns = []
            categorical_columns = []
            date_columns = []
            
            for col in df.columns:
                dtype = DataAnalysisService.detect_data_type(df[col])
                data_types[col] = dtype
                
                if dtype in ["integer", "float"]:
                    numeric_columns.append(col)
                elif dtype == "datetime":
                    date_columns.append(col)
                elif dtype in ["categorical", "boolean"]:
                    categorical_columns.append(col)
            
            # Outliers analysis (for numeric columns only)
            outliers_count = {}
            for col in numeric_columns:
                try:
                    numeric_series = pd.to_numeric(df[col], errors='coerce').dropna()
                    if len(numeric_series) > 0:
                        q1 = numeric_series.quantile(0.25)
                        q3 = numeric_series.quantile(0.75)
                        iqr = q3 - q1
                        lower_bound = q1 - 1.5 * iqr
                        upper_bound = q3 + 1.5 * iqr
                        outliers = numeric_series[(numeric_series < lower_bound) | (numeric_series > upper_bound)]
                        outliers_count[col] = len(outliers)
                except Exception:
                    outliers_count[col] = 0
            
            # Quality scores
            completeness_score = ((total_cells - total_missing) / total_cells * 100) if total_cells > 0 else 0
            
            # Consistency score (based on data type consistency)
            consistency_issues = 0
            for col in df.columns:
                try:
                    # Check for mixed types in text columns
                    if data_types[col] == "text":
                        sample = df[col].dropna().sample(n=min(100, len(df[col].dropna())), random_state=42)
                        # Simple check for mixed numeric/text
                        numeric_count = 0
                        for val in sample:
                            try:
                                float(str(val))
                                numeric_count += 1
                            except ValueError:
                                pass
                        if 0.1 < numeric_count / len(sample) < 0.9:  # Mixed types
                            consistency_issues += 1
                except Exception:
                    pass
            
            consistency_score = max(0, 100 - (consistency_issues / total_columns * 100)) if total_columns > 0 else 100
            
            # Overall quality score
            overall_quality_score = (completeness_score * 0.6 + consistency_score * 0.4)
            
            # Recommendations and issues
            recommendations = []
            issues = []
            
            # Missing values issues
            high_missing_cols = [col for col, pct in missing_percentages.items() if pct > 30]
            if high_missing_cols:
                issues.append(f"Colunas com muitos valores ausentes (>30%): {', '.join(high_missing_cols)}")
                recommendations.append("Considere imputação ou remoção de colunas com muitos valores ausentes")
            
            # Duplicate rows
            if duplicate_rows > 0:
                issues.append(f"{duplicate_rows} linhas duplicadas encontradas")
                recommendations.append("Remova linhas duplicadas para melhorar a qualidade dos dados")
            
            # Low data volume
            if total_rows < 100:
                issues.append("Dataset muito pequeno para análise robusta")
                recommendations.append("Colete mais dados para melhorar a confiabilidade da análise")
            
            # No numeric columns
            if len(numeric_columns) == 0:
                issues.append("Nenhuma coluna numérica encontrada")
                recommendations.append("Verifique se as colunas numéricas estão no formato correto")
            
            # High outlier percentage
            high_outlier_cols = [col for col, count in outliers_count.items() 
                               if count / total_rows > 0.1]  # >10% outliers
            if high_outlier_cols:
                issues.append(f"Colunas com muitos outliers: {', '.join(high_outlier_cols)}")
                recommendations.append("Investigue e trate outliers nas colunas numéricas")
            
            return {
                "total_rows": total_rows,
                "total_columns": total_columns,
                "missing_values": missing_values,
                "missing_percentages": missing_percentages,
                "duplicate_rows": int(duplicate_rows),
                "data_types": data_types,
                "numeric_columns": numeric_columns,
                "categorical_columns": categorical_columns,
                "date_columns": date_columns,
                "outliers_count": outliers_count,
                "completeness_score": round(completeness_score, 2),
                "consistency_score": round(consistency_score, 2),
                "overall_quality_score": round(overall_quality_score, 2),
                "recommendations": recommendations,
                "issues": issues
            }
            
        except Exception as e:
            logger.error("Error calculating data quality", error=str(e))
            return {
                "total_rows": 0,
                "total_columns": 0,
                "missing_values": {},
                "missing_percentages": {},
                "duplicate_rows": 0,
                "data_types": {},
                "numeric_columns": [],
                "categorical_columns": [],
                "date_columns": [],
                "outliers_count": {},
                "completeness_score": 0,
                "consistency_score": 0,
                "overall_quality_score": 0,
                "recommendations": ["Erro na análise de qualidade dos dados"],
                "issues": ["Erro interno na análise"]
            }
    
    @staticmethod
    def calculate_correlations(df: pd.DataFrame) -> Optional[Dict[str, Dict[str, float]]]:
        """
        Calculate correlation matrix for numeric columns.
        
        Args:
            df: Pandas DataFrame
            
        Returns:
            Correlation matrix as nested dictionary
        """
        try:
            # Get only numeric columns
            numeric_df = df.select_dtypes(include=[np.number])
            
            if len(numeric_df.columns) < 2:
                return None
            
            # Calculate correlation matrix
            corr_matrix = numeric_df.corr()
            
            # Convert to nested dictionary
            correlations = {}
            for col1 in corr_matrix.columns:
                correlations[col1] = {}
                for col2 in corr_matrix.columns:
                    corr_value = corr_matrix.loc[col1, col2]
                    correlations[col1][col2] = round(float(corr_value), 4) if not pd.isna(corr_value) else 0.0
            
            return correlations
            
        except Exception as e:
            logger.error("Error calculating correlations", error=str(e))
            return None
    
    async def analyze_dataset_complete(
        self, 
        df: pd.DataFrame, 
        dataset_id: int
    ) -> Dict[str, Any]:
        """
        Perform complete dataset analysis asynchronously.
        
        Args:
            df: Pandas DataFrame to analyze
            dataset_id: Dataset ID
            
        Returns:
            Complete analysis results
        """
        start_time = datetime.now()
        
        try:
            # Calculate memory usage
            memory_usage_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)
            
            # Run analyses in parallel
            loop = asyncio.get_event_loop()
            
            # Submit tasks to thread pool
            quality_task = loop.run_in_executor(
                self.executor,
                self.calculate_data_quality,
                df
            )
            
            correlations_task = loop.run_in_executor(
                self.executor,
                self.calculate_correlations,
                df
            )
            
            # Calculate column statistics for each column
            column_stats_tasks = []
            for col in df.columns:
                task = loop.run_in_executor(
                    self.executor,
                    self.calculate_column_statistics,
                    df[col],
                    col
                )
                column_stats_tasks.append(task)
            
            # Wait for all tasks
            data_quality = await quality_task
            correlations = await correlations_task
            columns_statistics = await asyncio.gather(*column_stats_tasks)
            
            # General statistics
            general_stats = {
                "memory_usage_mb": round(memory_usage_mb, 2),
                "shape": df.shape,
                "dtypes_summary": df.dtypes.value_counts().to_dict(),
                "missing_data_summary": {
                    "total_missing_cells": df.isnull().sum().sum(),
                    "missing_percentage": round(df.isnull().sum().sum() / (df.shape[0] * df.shape[1]) * 100, 2)
                }
            }
            
            end_time = datetime.now()
            
            return {
                "dataset_id": dataset_id,
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "memory_usage_mb": round(memory_usage_mb, 2),
                "columns_statistics": columns_statistics,
                "correlations": correlations,
                "general_stats": general_stats,
                "data_quality": data_quality,
                "analysis_timestamp": end_time
            }
            
        except Exception as e:
            logger.error("Error in complete dataset analysis", error=str(e))
            end_time = datetime.now()
            
            return {
                "dataset_id": dataset_id,
                "total_rows": 0,
                "total_columns": 0,
                "memory_usage_mb": 0.0,
                "columns_statistics": [],
                "correlations": None,
                "general_stats": {},
                "data_quality": {
                    "total_rows": 0,
                    "total_columns": 0,
                    "overall_quality_score": 0,
                    "recommendations": ["Erro na análise dos dados"],
                    "issues": ["Erro interno na análise"]
                },
                "analysis_timestamp": end_time
            }
