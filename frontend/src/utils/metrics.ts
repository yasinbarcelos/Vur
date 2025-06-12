/**
 * Funções de cálculo de métricas para avaliação de modelos de séries temporais
 */

export interface MetricResult {
  name: string;
  value: number;
  description: string;
  betterWhen: 'lower' | 'higher';
}

export interface GlobalScoreConfig {
  errorWeight: number;      // Peso para métricas de erro (MAE, RMSE, MAPE, etc.)
  directionWeight: number;  // Peso para POCID
  correlationWeight: number; // Peso para R²
  inequalityWeight: number; // Peso para Theil U1/U2
}

/**
 * Mean Absolute Error
 */
export function calculateMAE(actual: number[], predicted: number[]): MetricResult {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays devem ter o mesmo tamanho');
  }
  
  const mae = actual.reduce((sum, act, i) => sum + Math.abs(act - predicted[i]), 0) / actual.length;
  
  return {
    name: 'MAE',
    value: mae,
    description: 'Mean Absolute Error - Erro médio absoluto',
    betterWhen: 'lower'
  };
}

/**
 * Root Mean Square Error
 */
export function calculateRMSE(actual: number[], predicted: number[]): MetricResult {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays devem ter o mesmo tamanho');
  }
  
  const mse = actual.reduce((sum, act, i) => sum + Math.pow(act - predicted[i], 2), 0) / actual.length;
  const rmse = Math.sqrt(mse);
  
  return {
    name: 'RMSE',
    value: rmse,
    description: 'Root Mean Square Error - Raiz do erro quadrático médio',
    betterWhen: 'lower'
  };
}

/**
 * Mean Absolute Percentage Error
 */
export function calculateMAPE(actual: number[], predicted: number[]): MetricResult {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays devem ter o mesmo tamanho');
  }
  
  const mape = actual.reduce((sum, act, i) => {
    if (act === 0) return sum; // Evita divisão por zero
    return sum + Math.abs((act - predicted[i]) / act);
  }, 0) / actual.length * 100;
  
  return {
    name: 'MAPE',
    value: mape,
    description: 'Mean Absolute Percentage Error - Erro percentual médio absoluto',
    betterWhen: 'lower'
  };
}

/**
 * Symmetric Mean Absolute Percentage Error
 */
export function calculateSMAPE(actual: number[], predicted: number[]): MetricResult {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays devem ter o mesmo tamanho');
  }
  
  const smape = actual.reduce((sum, act, i) => {
    const denominator = (Math.abs(act) + Math.abs(predicted[i])) / 2;
    if (denominator === 0) return sum;
    return sum + Math.abs(act - predicted[i]) / denominator;
  }, 0) / actual.length * 100;
  
  return {
    name: 'SMAPE',
    value: smape,
    description: 'Symmetric Mean Absolute Percentage Error - MAPE simétrico',
    betterWhen: 'lower'
  };
}

/**
 * Mean Absolute Scaled Error
 */
export function calculateMASE(actual: number[], predicted: number[], seasonalPeriod: number = 1): MetricResult {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays devem ter o mesmo tamanho');
  }
  
  // Calcula o erro médio absoluto da previsão naive sazonal
  let naiveError = 0;
  let count = 0;
  
  for (let i = seasonalPeriod; i < actual.length; i++) {
    naiveError += Math.abs(actual[i] - actual[i - seasonalPeriod]);
    count++;
  }
  
  if (count === 0) {
    throw new Error('Não há dados suficientes para calcular MASE');
  }
  
  const meanNaiveError = naiveError / count;
  const mae = calculateMAE(actual, predicted).value;
  const mase = mae / meanNaiveError;
  
  return {
    name: 'MASE',
    value: mase,
    description: 'Mean Absolute Scaled Error - Erro médio absoluto escalonado',
    betterWhen: 'lower'
  };
}

/**
 * Prediction of Change in Direction (POCID)
 */
export function calculatePOCID(actual: number[], predicted: number[]): MetricResult {
  if (actual.length !== predicted.length || actual.length < 2) {
    throw new Error('Arrays devem ter o mesmo tamanho e pelo menos 2 elementos');
  }
  
  let correctDirections = 0;
  let totalDirections = 0;
  
  for (let i = 1; i < actual.length; i++) {
    const actualDirection = actual[i] - actual[i - 1];
    const predictedDirection = predicted[i] - predicted[i - 1];
    
    // Considera apenas mudanças significativas (não zero)
    if (actualDirection !== 0 && predictedDirection !== 0) {
      if ((actualDirection > 0 && predictedDirection > 0) || 
          (actualDirection < 0 && predictedDirection < 0)) {
        correctDirections++;
      }
      totalDirections++;
    }
  }
  
  const pocid = totalDirections > 0 ? (correctDirections / totalDirections) * 100 : 0;
  
  return {
    name: 'POCID',
    value: pocid,
    description: 'Prediction of Change in Direction - Previsão correta da direção da mudança (%)',
    betterWhen: 'higher'
  };
}

/**
 * Coefficient of Determination (R²)
 */
export function calculateR2(actual: number[], predicted: number[]): MetricResult {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays devem ter o mesmo tamanho');
  }
  
  const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
  
  const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
  const residualSumSquares = actual.reduce((sum, act, i) => sum + Math.pow(act - predicted[i], 2), 0);
  
  const r2 = totalSumSquares === 0 ? 1 : 1 - (residualSumSquares / totalSumSquares);
  
  return {
    name: 'R²',
    value: r2,
    description: 'Coefficient of Determination - Coeficiente de determinação',
    betterWhen: 'higher'
  };
}

/**
 * Theil Inequality Coefficient U1
 */
export function calculateTheilU1(actual: number[], predicted: number[]): MetricResult {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays devem ter o mesmo tamanho');
  }
  
  const rmse = calculateRMSE(actual, predicted).value;
  
  const actualRMS = Math.sqrt(actual.reduce((sum, val) => sum + Math.pow(val, 2), 0) / actual.length);
  const predictedRMS = Math.sqrt(predicted.reduce((sum, val) => sum + Math.pow(val, 2), 0) / predicted.length);
  
  const theilU1 = rmse / (actualRMS + predictedRMS);
  
  return {
    name: 'Theil U1',
    value: theilU1,
    description: 'Theil Inequality Coefficient 1 - Coeficiente de desigualdade de Theil 1',
    betterWhen: 'lower'
  };
}

/**
 * Theil Inequality Coefficient U2
 */
export function calculateTheilU2(actual: number[], predicted: number[]): MetricResult {
  if (actual.length !== predicted.length || actual.length < 2) {
    throw new Error('Arrays devem ter o mesmo tamanho e pelo menos 2 elementos');
  }
  
  // Calcula RMSE da previsão
  const forecastRMSE = calculateRMSE(actual, predicted).value;
  
  // Calcula RMSE da previsão naive (valor anterior)
  const naiveActual = actual.slice(1);
  const naivePredicted = actual.slice(0, -1);
  const naiveRMSE = calculateRMSE(naiveActual, naivePredicted).value;
  
  const theilU2 = naiveRMSE === 0 ? 0 : forecastRMSE / naiveRMSE;
  
  return {
    name: 'Theil U2',
    value: theilU2,
    description: 'Theil Inequality Coefficient 2 - Coeficiente de desigualdade de Theil 2',
    betterWhen: 'lower'
  };
}

/**
 * Função de Avaliação Global
 * Combina múltiplas métricas em um score único de 0-100 (maior = melhor)
 */
export function calculateGlobalScore(
  actual: number[], 
  predicted: number[], 
  selectedMetrics: string[],
  config: GlobalScoreConfig = {
    errorWeight: 0.4,
    directionWeight: 0.3,
    correlationWeight: 0.2,
    inequalityWeight: 0.1
  }
): MetricResult {
  if (actual.length !== predicted.length) {
    throw new Error('Arrays devem ter o mesmo tamanho');
  }
  
  let totalScore = 0;
  let totalWeight = 0;
  
  // Métricas de erro (menor = melhor, normalizar para 0-100)
  const errorMetrics = ['mae', 'rmse', 'mape', 'smape', 'mase'];
  const selectedErrorMetrics = selectedMetrics.filter(m => errorMetrics.includes(m));
  
  if (selectedErrorMetrics.length > 0 && config.errorWeight > 0) {
    let errorScore = 0;
    let errorCount = 0;
    
    selectedErrorMetrics.forEach(metric => {
      let metricResult: MetricResult;
      
      switch (metric) {
        case 'mae':
          metricResult = calculateMAE(actual, predicted);
          break;
        case 'rmse':
          metricResult = calculateRMSE(actual, predicted);
          break;
        case 'mape':
          metricResult = calculateMAPE(actual, predicted);
          break;
        case 'smape':
          metricResult = calculateSMAPE(actual, predicted);
          break;
        case 'mase':
          metricResult = calculateMASE(actual, predicted);
          break;
        default:
          return;
      }
      
      // Normaliza erro para score (0-100, onde 100 = erro zero)
      // Usa função exponencial decrescente para penalizar erros grandes
      const normalizedScore = Math.max(0, 100 * Math.exp(-metricResult.value / 10));
      errorScore += normalizedScore;
      errorCount++;
    });
    
    if (errorCount > 0) {
      totalScore += (errorScore / errorCount) * config.errorWeight;
      totalWeight += config.errorWeight;
    }
  }
  
  // POCID (maior = melhor, já em %)
  if (selectedMetrics.includes('pocid') && config.directionWeight > 0) {
    const pocid = calculatePOCID(actual, predicted);
    totalScore += pocid.value * config.directionWeight;
    totalWeight += config.directionWeight;
  }
  
  // R² (maior = melhor, converter para %)
  if (selectedMetrics.includes('r2') && config.correlationWeight > 0) {
    const r2 = calculateR2(actual, predicted);
    const r2Score = Math.max(0, Math.min(100, r2.value * 100)); // Limita entre 0-100
    totalScore += r2Score * config.correlationWeight;
    totalWeight += config.correlationWeight;
  }
  
  // Theil U1 e U2 (menor = melhor)
  const inequalityMetrics = ['theil_u1', 'theil_u2'];
  const selectedInequalityMetrics = selectedMetrics.filter(m => inequalityMetrics.includes(m));
  
  if (selectedInequalityMetrics.length > 0 && config.inequalityWeight > 0) {
    let inequalityScore = 0;
    let inequalityCount = 0;
    
    selectedInequalityMetrics.forEach(metric => {
      let metricResult: MetricResult;
      
      switch (metric) {
        case 'theil_u1':
          metricResult = calculateTheilU1(actual, predicted);
          break;
        case 'theil_u2':
          metricResult = calculateTheilU2(actual, predicted);
          break;
        default:
          return;
      }
      
      // Normaliza para score (0-100, onde 100 = coeficiente zero)
      const normalizedScore = Math.max(0, 100 * Math.exp(-metricResult.value));
      inequalityScore += normalizedScore;
      inequalityCount++;
    });
    
    if (inequalityCount > 0) {
      totalScore += (inequalityScore / inequalityCount) * config.inequalityWeight;
      totalWeight += config.inequalityWeight;
    }
  }
  
  // Normaliza o score final
  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  return {
    name: 'Global Score',
    value: Math.round(finalScore * 100) / 100, // Arredonda para 2 casas decimais
    description: 'Score Global - Combina todas as métricas selecionadas (0-100, maior = melhor)',
    betterWhen: 'higher'
  };
}

/**
 * Calcula todas as métricas selecionadas
 */
export function calculateAllMetrics(
  actual: number[], 
  predicted: number[], 
  selectedMetrics: string[],
  seasonalPeriod: number = 1
): MetricResult[] {
  const results: MetricResult[] = [];
  
  selectedMetrics.forEach(metric => {
    try {
      let result: MetricResult;
      
      switch (metric) {
        case 'mae':
          result = calculateMAE(actual, predicted);
          break;
        case 'rmse':
          result = calculateRMSE(actual, predicted);
          break;
        case 'mape':
          result = calculateMAPE(actual, predicted);
          break;
        case 'smape':
          result = calculateSMAPE(actual, predicted);
          break;
        case 'mase':
          result = calculateMASE(actual, predicted, seasonalPeriod);
          break;
        case 'pocid':
          result = calculatePOCID(actual, predicted);
          break;
        case 'r2':
          result = calculateR2(actual, predicted);
          break;
        case 'theil_u1':
          result = calculateTheilU1(actual, predicted);
          break;
        case 'theil_u2':
          result = calculateTheilU2(actual, predicted);
          break;
        case 'global_score':
          result = calculateGlobalScore(actual, predicted, selectedMetrics.filter(m => m !== 'global_score'));
          break;
        default:
          return;
      }
      
      results.push(result);
    } catch (error) {
      console.warn(`Erro ao calcular métrica ${metric}:`, error);
    }
  });
  
  return results;
}

/**
 * Formata o valor da métrica para exibição
 */
export function formatMetricValue(metric: MetricResult): string {
  if (metric.name === 'POCID' || metric.name === 'Global Score') {
    return `${metric.value.toFixed(1)}%`;
  } else if (metric.name === 'R²') {
    return metric.value.toFixed(3);
  } else if (metric.name.includes('Theil')) {
    return metric.value.toFixed(4);
  } else {
    return metric.value.toFixed(2);
  }
} 