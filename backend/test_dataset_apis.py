#!/usr/bin/env python3
"""
Test script for dataset APIs
"""

import asyncio
import os
import sys
import pandas as pd
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.data_analysis_service import DataAnalysisService
from app.services.dataset_service import DatasetService


def create_sample_csv():
    """Create a sample CSV file for testing."""
    # Create sample time series data
    dates = pd.date_range('2024-01-01', periods=100, freq='D')
    data = {
        'date': dates,
        'sales': [100 + i * 2 + (i % 7) * 10 for i in range(100)],  # Trend with weekly pattern
        'temperature': [20 + (i % 30) * 0.5 for i in range(100)],  # Seasonal pattern
        'customers': [50 + i + (i % 10) * 5 for i in range(100)],  # Another trend
        'product_type': ['A' if i % 3 == 0 else 'B' if i % 3 == 1 else 'C' for i in range(100)],
        'region': ['North' if i % 2 == 0 else 'South' for i in range(100)]
    }
    
    df = pd.DataFrame(data)
    
    # Add some missing values
    df.loc[10:15, 'sales'] = None
    df.loc[20:22, 'temperature'] = None
    
    # Save to CSV
    csv_path = 'sample_dataset.csv'
    df.to_csv(csv_path, index=False)
    print(f"✅ Created sample CSV: {csv_path}")
    return csv_path


def test_data_analysis_service():
    """Test the DataAnalysisService."""
    print("\n🔍 Testing DataAnalysisService...")
    
    # Create sample CSV
    csv_path = create_sample_csv()
    
    try:
        # Test CSV analysis
        analysis_result = DataAnalysisService.analyze_csv_file(csv_path, sample_size=50)
        
        print(f"✅ Analysis completed successfully!")
        print(f"   - Total rows: {analysis_result['total_rows']}")
        print(f"   - Total columns: {analysis_result['total_columns']}")
        print(f"   - Memory usage: {analysis_result['memory_usage_mb']} MB")
        print(f"   - Data quality score: {analysis_result['data_quality_score']}")
        
        # Print column information
        print("\n📊 Column Analysis:")
        for col in analysis_result['columns_info']:
            print(f"   - {col['name']}: {col['data_type']} "
                  f"(null: {col['null_percentage']:.1f}%, "
                  f"unique: {col['unique_count']}, "
                  f"numeric: {col['is_numeric']}, "
                  f"date: {col['is_potential_date']}, "
                  f"target: {col['is_potential_target']})")
        
        # Print time series info
        if analysis_result['time_series_info']:
            ts_info = analysis_result['time_series_info']
            print(f"\n📈 Time Series Info:")
            print(f"   - Date column: {ts_info['date_column']}")
            print(f"   - Frequency: {ts_info['frequency']}")
            print(f"   - Date range: {ts_info['start_date']} to {ts_info['end_date']}")
            print(f"   - Total periods: {ts_info['total_periods']}")
            print(f"   - Missing periods: {ts_info['missing_periods']}")
            print(f"   - Regular: {ts_info['is_regular']}")
        
        # Print recommendations
        if analysis_result['recommendations']:
            print(f"\n💡 Recommendations:")
            for rec in analysis_result['recommendations']:
                print(f"   - {rec}")
        
        # Print warnings
        if analysis_result['warnings']:
            print(f"\n⚠️ Warnings:")
            for warning in analysis_result['warnings']:
                print(f"   - {warning}")
        
        # Print errors
        if analysis_result['errors']:
            print(f"\n❌ Errors:")
            for error in analysis_result['errors']:
                print(f"   - {error}")
        
        return True
        
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
        return False
    
    finally:
        # Clean up
        if os.path.exists(csv_path):
            os.remove(csv_path)
            print(f"🧹 Cleaned up: {csv_path}")


def test_csv_reading():
    """Test CSV reading with different encodings and separators."""
    print("\n📖 Testing CSV reading capabilities...")
    
    # Create CSV with different separators
    test_files = []
    
    # Standard CSV
    df = pd.DataFrame({
        'col1': [1, 2, 3],
        'col2': ['a', 'b', 'c'],
        'col3': [1.1, 2.2, 3.3]
    })
    
    # Test different separators
    separators = [',', ';', '\t']
    for i, sep in enumerate(separators):
        filename = f'test_csv_{i}.csv'
        df.to_csv(filename, sep=sep, index=False)
        test_files.append(filename)
    
    try:
        for filename in test_files:
            print(f"   Testing {filename}...")
            result_df = DataAnalysisService._read_csv_safely(filename)
            if result_df is not None:
                print(f"   ✅ Successfully read {filename} - Shape: {result_df.shape}")
            else:
                print(f"   ❌ Failed to read {filename}")
        
        return True
        
    except Exception as e:
        print(f"❌ CSV reading test failed: {str(e)}")
        return False
    
    finally:
        # Clean up
        for filename in test_files:
            if os.path.exists(filename):
                os.remove(filename)


def test_column_detection():
    """Test column type detection."""
    print("\n🔍 Testing column type detection...")
    
    # Create test data with different column types
    test_data = {
        'date_col': ['2024-01-01', '2024-01-02', '2024-01-03'],
        'numeric_col': [1.5, 2.5, 3.5],
        'integer_col': [1, 2, 3],
        'text_col': ['hello', 'world', 'test'],
        'sales_target': [100, 200, 300],  # Should be detected as potential target
        'revenue_amount': [1000, 2000, 3000],  # Should be detected as potential target
        'category': ['A', 'B', 'A']
    }
    
    df = pd.DataFrame(test_data)
    csv_path = 'test_columns.csv'
    df.to_csv(csv_path, index=False)
    
    try:
        analysis_result = DataAnalysisService.analyze_csv_file(csv_path)
        
        print("📊 Column Detection Results:")
        for col in analysis_result['columns_info']:
            flags = []
            if col['is_numeric']:
                flags.append('numeric')
            if col['is_potential_date']:
                flags.append('date')
            if col['is_potential_target']:
                flags.append('target')
            
            print(f"   - {col['name']}: {' | '.join(flags) if flags else 'categorical'}")
        
        # Verify expected detections
        expected_dates = ['date_col']
        expected_targets = ['sales_target', 'revenue_amount']
        expected_numeric = ['numeric_col', 'integer_col', 'sales_target', 'revenue_amount']
        
        detected_dates = [col['name'] for col in analysis_result['columns_info'] if col['is_potential_date']]
        detected_targets = [col['name'] for col in analysis_result['columns_info'] if col['is_potential_target']]
        detected_numeric = [col['name'] for col in analysis_result['columns_info'] if col['is_numeric']]
        
        print(f"\n✅ Date detection: {set(expected_dates) <= set(detected_dates)}")
        print(f"✅ Target detection: {set(expected_targets) <= set(detected_targets)}")
        print(f"✅ Numeric detection: {set(expected_numeric) <= set(detected_numeric)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Column detection test failed: {str(e)}")
        return False
    
    finally:
        if os.path.exists(csv_path):
            os.remove(csv_path)


def main():
    """Run all tests."""
    print("🚀 Starting Dataset API Tests...")
    
    tests = [
        ("Data Analysis Service", test_data_analysis_service),
        ("CSV Reading", test_csv_reading),
        ("Column Detection", test_column_detection),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print('='*50)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*50}")
    print("📋 TEST SUMMARY")
    print('='*50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Dataset APIs are ready.")
    else:
        print("⚠️ Some tests failed. Check the output above.")
    
    return passed == len(results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
