"""
Time Series Analysis Service
Handles heavy computational tasks for time series analysis
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import warnings
warnings.filterwarnings('ignore')

# Statistical libraries
from scipy import stats
from scipy.signal import periodogram
from sklearn.feature_selection import mutual_info_regression
from sklearn.preprocessing import KBinsDiscretizer
import structlog

logger = structlog.get_logger(__name__)


class TimeSeriesAnalysisService:
    """Service for time series analysis computations."""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    @staticmethod
    def _safe_float_conversion(series: pd.Series) -> np.ndarray:
        """Safely convert series to float array, handling missing values."""
        try:
            # Convert to numeric, coercing errors to NaN
            numeric_series = pd.to_numeric(series, errors='coerce')
            # Drop NaN values
            clean_data = numeric_series.dropna().values
            return clean_data
        except Exception as e:
            logger.error("Error converting series to float", error=str(e))
            return np.array([])
    
    @staticmethod
    def calculate_autocorrelation(data: np.ndarray, max_lags: int = 50) -> Dict[str, Any]:
        """
        Calculate autocorrelation function (ACF) with confidence intervals.
        
        Args:
            data: Time series data
            max_lags: Maximum number of lags to calculate
            
        Returns:
            Dictionary with ACF results
        """
        try:
            if len(data) < 10:
                return {
                    "lags": [],
                    "acf_values": [],
                    "confidence_intervals": [],
                    "significant_lags": [],
                    "ljung_box_statistic": None,
                    "ljung_box_p_value": None
                }
            
            n = len(data)
            max_lags = min(max_lags, n // 4)  # Limit to 1/4 of data length
            
            # Calculate ACF
            mean = np.mean(data)
            c0 = np.mean((data - mean) ** 2)  # Variance
            
            lags = list(range(max_lags + 1))
            acf_values = []
            
            for lag in lags:
                if lag == 0:
                    acf_values.append(1.0)
                else:
                    c_lag = np.mean((data[:-lag] - mean) * (data[lag:] - mean))
                    acf_values.append(c_lag / c0 if c0 > 0 else 0)
            
            # Calculate confidence intervals (95%)
            # For large samples, approximate standard error is 1/sqrt(n)
            se = 1.96 / np.sqrt(n)
            confidence_intervals = [[-se, se] for _ in lags]
            
            # Find significant lags (outside confidence interval)
            significant_lags = [
                lag for lag, acf in zip(lags[1:], acf_values[1:]) 
                if abs(acf) > se
            ]
            
            # Ljung-Box test for autocorrelation
            ljung_box_stat = None
            ljung_box_p = None
            try:
                if len(data) > 20 and max_lags > 1:
                    # Simple Ljung-Box approximation
                    Q = n * (n + 2) * sum(
                        acf_values[i]**2 / (n - i) 
                        for i in range(1, min(max_lags + 1, len(acf_values)))
                    )
                    ljung_box_stat = Q
                    # Chi-square test with max_lags degrees of freedom
                    ljung_box_p = 1 - stats.chi2.cdf(Q, max_lags)
            except Exception as e:
                logger.warning("Error calculating Ljung-Box test", error=str(e))
            
            return {
                "lags": lags,
                "acf_values": acf_values,
                "confidence_intervals": confidence_intervals,
                "significant_lags": significant_lags,
                "ljung_box_statistic": ljung_box_stat,
                "ljung_box_p_value": ljung_box_p
            }
            
        except Exception as e:
            logger.error("Error calculating autocorrelation", error=str(e))
            return {
                "lags": [],
                "acf_values": [],
                "confidence_intervals": [],
                "significant_lags": [],
                "ljung_box_statistic": None,
                "ljung_box_p_value": None
            }
    
    @staticmethod
    def calculate_partial_autocorrelation(data: np.ndarray, max_lags: int = 50) -> Dict[str, Any]:
        """
        Calculate partial autocorrelation function (PACF).
        
        Args:
            data: Time series data
            max_lags: Maximum number of lags to calculate
            
        Returns:
            Dictionary with PACF results
        """
        try:
            if len(data) < 10:
                return {
                    "lags": [],
                    "pacf_values": [],
                    "confidence_intervals": [],
                    "significant_lags": []
                }
            
            n = len(data)
            max_lags = min(max_lags, n // 4)
            
            # Get ACF first
            acf_result = TimeSeriesAnalysisService.calculate_autocorrelation(data, max_lags)
            acf_values = acf_result["acf_values"]
            
            if len(acf_values) <= 1:
                return {
                    "lags": [],
                    "pacf_values": [],
                    "confidence_intervals": [],
                    "significant_lags": []
                }
            
            lags = list(range(max_lags + 1))
            pacf_values = [1.0]  # PACF(0) = 1
            
            # Calculate PACF using Yule-Walker equations
            for k in range(1, max_lags + 1):
                if k >= len(acf_values):
                    break
                    
                if k == 1:
                    pacf_values.append(acf_values[1])
                else:
                    # Solve Yule-Walker equations
                    try:
                        # Build autocorrelation matrix
                        R = np.array([[acf_values[abs(i-j)] for j in range(k)] for i in range(k)])
                        r = np.array([acf_values[i] for i in range(1, k+1)])
                        
                        # Solve R * phi = r
                        if np.linalg.det(R) != 0:
                            phi = np.linalg.solve(R, r)
                            pacf_values.append(phi[-1])
                        else:
                            pacf_values.append(0.0)
                    except Exception:
                        pacf_values.append(0.0)
            
            # Trim lags to match pacf_values length
            lags = lags[:len(pacf_values)]
            
            # Calculate confidence intervals
            se = 1.96 / np.sqrt(n)
            confidence_intervals = [[-se, se] for _ in lags]
            
            # Find significant lags
            significant_lags = [
                lag for lag, pacf in zip(lags[1:], pacf_values[1:]) 
                if abs(pacf) > se
            ]
            
            return {
                "lags": lags,
                "pacf_values": pacf_values,
                "confidence_intervals": confidence_intervals,
                "significant_lags": significant_lags
            }
            
        except Exception as e:
            logger.error("Error calculating partial autocorrelation", error=str(e))
            return {
                "lags": [],
                "pacf_values": [],
                "confidence_intervals": [],
                "significant_lags": []
            }
    
    @staticmethod
    def calculate_mutual_information(data: np.ndarray, max_lags: int = 30) -> Dict[str, Any]:
        """
        Calculate mutual information for different lags.
        
        Args:
            data: Time series data
            max_lags: Maximum number of lags to calculate
            
        Returns:
            Dictionary with MI results
        """
        try:
            if len(data) < 20:
                return {
                    "lags": [],
                    "mi_values": [],
                    "optimal_lag": None,
                    "mi_threshold": 0.0
                }
            
            n = len(data)
            max_lags = min(max_lags, n // 4)
            
            lags = list(range(max_lags + 1))
            mi_values = []
            
            for lag in lags:
                if lag == 0:
                    mi_values.append(0.0)  # MI with itself at lag 0
                    continue
                
                try:
                    # Create lagged series
                    x = data[:-lag].reshape(-1, 1)
                    y = data[lag:]
                    
                    if len(x) < 10:
                        mi_values.append(0.0)
                        continue
                    
                    # Calculate mutual information
                    mi = mutual_info_regression(x, y, discrete_features=False, random_state=42)
                    mi_values.append(float(mi[0]))
                    
                except Exception as e:
                    logger.warning(f"Error calculating MI for lag {lag}", error=str(e))
                    mi_values.append(0.0)
            
            # Find optimal lag (first local minimum after first maximum)
            optimal_lag = None
            if len(mi_values) > 3:
                try:
                    # Find first local minimum after lag 1
                    for i in range(2, len(mi_values) - 1):
                        if (mi_values[i] < mi_values[i-1] and 
                            mi_values[i] < mi_values[i+1]):
                            optimal_lag = lags[i]
                            break
                except Exception:
                    pass
            
            # Calculate threshold (mean + std)
            mi_threshold = np.mean(mi_values) + np.std(mi_values) if mi_values else 0.0
            
            return {
                "lags": lags,
                "mi_values": mi_values,
                "optimal_lag": optimal_lag,
                "mi_threshold": float(mi_threshold)
            }
            
        except Exception as e:
            logger.error("Error calculating mutual information", error=str(e))
            return {
                "lags": [],
                "mi_values": [],
                "optimal_lag": None,
                "mi_threshold": 0.0
            }
    
    @staticmethod
    def calculate_hurst_exponent(data: np.ndarray) -> Dict[str, Any]:
        """
        Calculate Hurst exponent using R/S analysis.
        
        Args:
            data: Time series data
            
        Returns:
            Dictionary with Hurst exponent results
        """
        try:
            if len(data) < 50:
                return {
                    "hurst_exponent": 0.5,
                    "scales": [],
                    "rs_values": [],
                    "regression_slope": 0.0,
                    "regression_intercept": 0.0,
                    "r_squared": 0.0,
                    "interpretation": "insufficient_data"
                }
            
            n = len(data)
            
            # Create scales (powers of 2, up to n/4)
            max_scale = int(np.log2(n // 4))
            scales = [2**i for i in range(2, max_scale + 1)]
            
            if not scales:
                scales = [4, 8, 16]
            
            rs_values = []
            
            for scale in scales:
                if scale >= n:
                    break
                
                try:
                    # Divide data into non-overlapping windows
                    num_windows = n // scale
                    rs_window = []
                    
                    for i in range(num_windows):
                        window = data[i*scale:(i+1)*scale]
                        
                        # Calculate mean
                        mean_window = np.mean(window)
                        
                        # Calculate cumulative deviations
                        deviations = np.cumsum(window - mean_window)
                        
                        # Calculate range
                        R = np.max(deviations) - np.min(deviations)
                        
                        # Calculate standard deviation
                        S = np.std(window)
                        
                        # Calculate R/S ratio
                        if S > 0:
                            rs_window.append(R / S)
                    
                    if rs_window:
                        rs_values.append(np.mean(rs_window))
                    else:
                        rs_values.append(1.0)
                        
                except Exception as e:
                    logger.warning(f"Error calculating R/S for scale {scale}", error=str(e))
                    rs_values.append(1.0)
            
            # Trim scales to match rs_values
            scales = scales[:len(rs_values)]
            
            if len(scales) < 3:
                return {
                    "hurst_exponent": 0.5,
                    "scales": scales,
                    "rs_values": rs_values,
                    "regression_slope": 0.0,
                    "regression_intercept": 0.0,
                    "r_squared": 0.0,
                    "interpretation": "insufficient_scales"
                }
            
            # Perform linear regression on log-log plot
            log_scales = np.log10(scales)
            log_rs = np.log10(rs_values)
            
            # Remove any infinite or NaN values
            valid_indices = np.isfinite(log_scales) & np.isfinite(log_rs)
            log_scales = log_scales[valid_indices]
            log_rs = log_rs[valid_indices]
            
            if len(log_scales) < 3:
                return {
                    "hurst_exponent": 0.5,
                    "scales": scales,
                    "rs_values": rs_values,
                    "regression_slope": 0.0,
                    "regression_intercept": 0.0,
                    "r_squared": 0.0,
                    "interpretation": "invalid_data"
                }
            
            # Linear regression
            slope, intercept, r_value, p_value, std_err = stats.linregress(log_scales, log_rs)
            
            hurst_exponent = slope
            r_squared = r_value ** 2
            
            # Interpret Hurst exponent
            if hurst_exponent < 0.5:
                interpretation = "mean_reverting"
            elif hurst_exponent > 0.5:
                interpretation = "trending"
            else:
                interpretation = "random_walk"
            
            return {
                "hurst_exponent": float(hurst_exponent),
                "scales": [int(s) for s in scales],
                "rs_values": [float(rs) for rs in rs_values],
                "regression_slope": float(slope),
                "regression_intercept": float(intercept),
                "r_squared": float(r_squared),
                "interpretation": interpretation
            }
            
        except Exception as e:
            logger.error("Error calculating Hurst exponent", error=str(e))
            return {
                "hurst_exponent": 0.5,
                "scales": [],
                "rs_values": [],
                "regression_slope": 0.0,
                "regression_intercept": 0.0,
                "r_squared": 0.0,
                "interpretation": "error"
            }
    
    @staticmethod
    def calculate_stationarity_tests(data: np.ndarray) -> Dict[str, Any]:
        """
        Perform stationarity tests (ADF, KPSS, PP).
        
        Args:
            data: Time series data
            
        Returns:
            Dictionary with stationarity test results
        """
        try:
            if len(data) < 20:
                return {
                    "adf_statistic": 0.0,
                    "adf_p_value": 1.0,
                    "adf_critical_values": {"1%": 0, "5%": 0, "10%": 0},
                    "adf_is_stationary": False,
                    "kpss_statistic": None,
                    "kpss_p_value": None,
                    "kpss_critical_values": None,
                    "kpss_is_stationary": None,
                    "pp_statistic": None,
                    "pp_p_value": None,
                    "pp_is_stationary": None
                }
            
            # Augmented Dickey-Fuller test (simplified implementation)
            try:
                # Simple ADF test approximation
                diff_data = np.diff(data)
                lagged_data = data[:-1]
                
                if len(diff_data) > 0 and len(lagged_data) > 0:
                    # Linear regression: diff_data = alpha * lagged_data + error
                    correlation = np.corrcoef(diff_data, lagged_data)[0, 1]
                    
                    # Approximate ADF statistic
                    n = len(data)
                    adf_stat = correlation * np.sqrt(n)
                    
                    # Approximate p-value (very rough approximation)
                    adf_p_value = 2 * (1 - stats.norm.cdf(abs(adf_stat)))
                    
                    # Critical values (approximate)
                    adf_critical = {"1%": -3.43, "5%": -2.86, "10%": -2.57}
                    adf_is_stationary = adf_stat < adf_critical["5%"]
                else:
                    adf_stat = 0.0
                    adf_p_value = 1.0
                    adf_critical = {"1%": 0, "5%": 0, "10%": 0}
                    adf_is_stationary = False
                    
            except Exception as e:
                logger.warning("Error in ADF test", error=str(e))
                adf_stat = 0.0
                adf_p_value = 1.0
                adf_critical = {"1%": 0, "5%": 0, "10%": 0}
                adf_is_stationary = False
            
            return {
                "adf_statistic": float(adf_stat),
                "adf_p_value": float(adf_p_value),
                "adf_critical_values": adf_critical,
                "adf_is_stationary": adf_is_stationary,
                "kpss_statistic": None,  # Would need more complex implementation
                "kpss_p_value": None,
                "kpss_critical_values": None,
                "kpss_is_stationary": None,
                "pp_statistic": None,  # Would need more complex implementation
                "pp_p_value": None,
                "pp_is_stationary": None
            }
            
        except Exception as e:
            logger.error("Error calculating stationarity tests", error=str(e))
            return {
                "adf_statistic": 0.0,
                "adf_p_value": 1.0,
                "adf_critical_values": {"1%": 0, "5%": 0, "10%": 0},
                "adf_is_stationary": False,
                "kpss_statistic": None,
                "kpss_p_value": None,
                "kpss_critical_values": None,
                "kpss_is_stationary": None,
                "pp_statistic": None,
                "pp_p_value": None,
                "pp_is_stationary": None
            }
    
    @staticmethod
    def calculate_seasonality_analysis(data: np.ndarray, max_periods: int = 50) -> Dict[str, Any]:
        """
        Analyze seasonality in time series data.
        
        Args:
            data: Time series data
            max_periods: Maximum periods to check for seasonality
            
        Returns:
            Dictionary with seasonality analysis results
        """
        try:
            if len(data) < 20:
                return {
                    "seasonal_periods": [],
                    "seasonal_strengths": [],
                    "dominant_period": None,
                    "seasonal_decomposition": None,
                    "fourier_peaks": []
                }
            
            n = len(data)
            max_periods = min(max_periods, n // 4)
            
            # Use periodogram to find dominant frequencies
            frequencies, power = periodogram(data)
            
            # Find peaks in power spectrum
            fourier_peaks = []
            if len(power) > 1:
                # Find local maxima
                for i in range(1, len(power) - 1):
                    if power[i] > power[i-1] and power[i] > power[i+1]:
                        if frequencies[i] > 0:  # Avoid DC component
                            period = 1 / frequencies[i] if frequencies[i] > 0 else 0
                            if 2 <= period <= max_periods:
                                fourier_peaks.append({
                                    "frequency": float(frequencies[i]),
                                    "period": float(period),
                                    "magnitude": float(power[i])
                                })
                
                # Sort by magnitude
                fourier_peaks.sort(key=lambda x: x["magnitude"], reverse=True)
                fourier_peaks = fourier_peaks[:5]  # Keep top 5
            
            # Check for common seasonal periods
            seasonal_periods = []
            seasonal_strengths = []
            
            common_periods = [7, 12, 24, 30, 365]  # Daily, monthly, hourly, etc.
            
            for period in common_periods:
                if period >= n // 2:
                    continue
                
                try:
                    # Calculate seasonal strength using autocorrelation at seasonal lag
                    if period < len(data):
                        seasonal_data = data[:-period] if period > 0 else data
                        lagged_data = data[period:] if period > 0 else data
                        
                        if len(seasonal_data) > 0 and len(lagged_data) > 0:
                            correlation = np.corrcoef(seasonal_data, lagged_data)[0, 1]
                            if not np.isnan(correlation):
                                seasonal_periods.append(period)
                                seasonal_strengths.append(abs(correlation))
                except Exception:
                    continue
            
            # Find dominant period
            dominant_period = None
            if seasonal_strengths:
                max_strength_idx = np.argmax(seasonal_strengths)
                if seasonal_strengths[max_strength_idx] > 0.3:  # Threshold for significance
                    dominant_period = seasonal_periods[max_strength_idx]
            
            return {
                "seasonal_periods": seasonal_periods,
                "seasonal_strengths": [float(s) for s in seasonal_strengths],
                "dominant_period": dominant_period,
                "seasonal_decomposition": None,  # Would need more complex implementation
                "fourier_peaks": fourier_peaks
            }
            
        except Exception as e:
            logger.error("Error calculating seasonality analysis", error=str(e))
            return {
                "seasonal_periods": [],
                "seasonal_strengths": [],
                "dominant_period": None,
                "seasonal_decomposition": None,
                "fourier_peaks": []
            }
    
    async def run_complete_analysis(
        self, 
        data: np.ndarray, 
        max_lags: int = 50
    ) -> Dict[str, Any]:
        """
        Run complete time series analysis asynchronously.
        
        Args:
            data: Time series data
            max_lags: Maximum lags for ACF/PACF
            
        Returns:
            Dictionary with all analysis results
        """
        start_time = datetime.now()
        
        try:
            # Run all analyses in parallel using thread pool
            loop = asyncio.get_event_loop()
            
            # Submit all tasks to thread pool
            acf_task = loop.run_in_executor(
                self.executor, 
                self.calculate_autocorrelation, 
                data, max_lags
            )
            
            pacf_task = loop.run_in_executor(
                self.executor, 
                self.calculate_partial_autocorrelation, 
                data, max_lags
            )
            
            mi_task = loop.run_in_executor(
                self.executor, 
                self.calculate_mutual_information, 
                data, min(30, max_lags)
            )
            
            hurst_task = loop.run_in_executor(
                self.executor, 
                self.calculate_hurst_exponent, 
                data
            )
            
            stationarity_task = loop.run_in_executor(
                self.executor, 
                self.calculate_stationarity_tests, 
                data
            )
            
            seasonality_task = loop.run_in_executor(
                self.executor, 
                self.calculate_seasonality_analysis, 
                data
            )
            
            # Wait for all tasks to complete
            acf_result = await acf_task
            pacf_result = await pacf_task
            mi_result = await mi_task
            hurst_result = await hurst_task
            stationarity_result = await stationarity_task
            seasonality_result = await seasonality_task
            
            end_time = datetime.now()
            computation_time = (end_time - start_time).total_seconds()
            
            return {
                "autocorrelation": acf_result,
                "partial_autocorrelation": pacf_result,
                "mutual_information": mi_result,
                "hurst_exponent": hurst_result,
                "stationarity_tests": stationarity_result,
                "seasonality_analysis": seasonality_result,
                "computation_time_seconds": computation_time,
                "analysis_timestamp": end_time
            }
            
        except Exception as e:
            logger.error("Error in complete time series analysis", error=str(e))
            end_time = datetime.now()
            computation_time = (end_time - start_time).total_seconds()
            
            # Return empty results on error
            return {
                "autocorrelation": {"lags": [], "acf_values": [], "confidence_intervals": [], "significant_lags": []},
                "partial_autocorrelation": {"lags": [], "pacf_values": [], "confidence_intervals": [], "significant_lags": []},
                "mutual_information": {"lags": [], "mi_values": [], "optimal_lag": None, "mi_threshold": 0.0},
                "hurst_exponent": {"hurst_exponent": 0.5, "scales": [], "rs_values": [], "interpretation": "error"},
                "stationarity_tests": {"adf_statistic": 0.0, "adf_p_value": 1.0, "adf_critical_values": {}, "adf_is_stationary": False},
                "seasonality_analysis": {"seasonal_periods": [], "seasonal_strengths": [], "dominant_period": None, "fourier_peaks": []},
                "computation_time_seconds": computation_time,
                "analysis_timestamp": end_time
            } 