/**
 * Exemplo de uso das métricas de avaliação de séries temporais
 */

import { 
  calculateAllMetrics, 
  formatMetricValue, 
  MetricResult,
  GlobalScoreConfig 
} from './metrics';

// Dados de exemplo para demonstração
const actualValues = [100, 105, 98, 110, 115, 108, 120, 125, 118, 130];
const predictedValues = [102, 103, 100, 108, 117, 110, 118, 127, 120, 128];

// Exemplo 1: Calculando métricas básicas
export function exampleBasicMetrics() {
  const basicMetrics = ['mae', 'rmse', 'mape', 'r2'];
  const results = calculateAllMetrics(actualValues, predictedValues, basicMetrics);
  
  console.log('=== MÉTRICAS BÁSICAS ===');
  results.forEach(metric => {
    console.log(`${metric.name}: ${formatMetricValue(metric)} (${metric.description})`);
  });
  
  return results;
}

// Exemplo 2: Calculando métricas avançadas
export function exampleAdvancedMetrics() {
  const advancedMetrics = ['mae', 'rmse', 'mape', 'smape', 'mase', 'pocid', 'r2', 'theil_u1', 'theil_u2'];
  const results = calculateAllMetrics(actualValues, predictedValues, advancedMetrics);
  
  console.log('\n=== MÉTRICAS AVANÇADAS ===');
  results.forEach(metric => {
    const indicator = metric.betterWhen === 'higher' ? '↑' : '↓';
    console.log(`${metric.name} ${indicator}: ${formatMetricValue(metric)}`);
    console.log(`   ${metric.description}`);
  });
  
  return results;
}

// Exemplo 3: Score global com configuração personalizada
export function exampleGlobalScore() {
  const allMetrics = ['mae', 'rmse', 'mape', 'smape', 'mase', 'pocid', 'r2', 'theil_u1', 'theil_u2', 'global_score'];
  
  // Configuração personalizada dos pesos
  const customConfig: GlobalScoreConfig = {
    errorWeight: 0.5,      // 50% para métricas de erro
    directionWeight: 0.25, // 25% para POCID
    correlationWeight: 0.15, // 15% para R²
    inequalityWeight: 0.1   // 10% para Theil
  };
  
  const results = calculateAllMetrics(actualValues, predictedValues, allMetrics);
  
  console.log('\n=== SCORE GLOBAL ===');
  const globalScore = results.find(r => r.name === 'Global Score');
  if (globalScore) {
    console.log(`Score Global: ${formatMetricValue(globalScore)}`);
    console.log(`Interpretação: ${getScoreInterpretation(globalScore.value)}`);
  }
  
  // Mostra breakdown das métricas
  console.log('\n=== BREAKDOWN DAS MÉTRICAS ===');
  results.filter(r => r.name !== 'Global Score').forEach(metric => {
    const performance = getMetricPerformance(metric);
    console.log(`${metric.name}: ${formatMetricValue(metric)} - ${performance}`);
  });
  
  return results;
}

// Função auxiliar para interpretar o score global
function getScoreInterpretation(score: number): string {
  if (score >= 90) return 'Excelente - Modelo muito preciso';
  if (score >= 80) return 'Muito Bom - Modelo confiável';
  if (score >= 70) return 'Bom - Modelo aceitável';
  if (score >= 60) return 'Regular - Modelo precisa melhorar';
  if (score >= 50) return 'Ruim - Modelo com problemas significativos';
  return 'Muito Ruim - Modelo inadequado';
}

// Função auxiliar para avaliar performance individual das métricas
function getMetricPerformance(metric: MetricResult): string {
  const { name, value, betterWhen } = metric;
  
  // Critérios específicos por métrica
  switch (name) {
    case 'MAE':
    case 'RMSE':
      if (value < 5) return 'Excelente';
      if (value < 10) return 'Bom';
      if (value < 20) return 'Regular';
      return 'Ruim';
      
    case 'MAPE':
    case 'SMAPE':
      if (value < 5) return 'Excelente';
      if (value < 10) return 'Bom';
      if (value < 20) return 'Regular';
      return 'Ruim';
      
    case 'MASE':
      if (value < 0.5) return 'Excelente';
      if (value < 1.0) return 'Bom';
      if (value < 1.5) return 'Regular';
      return 'Ruim';
      
    case 'POCID':
      if (value > 80) return 'Excelente';
      if (value > 70) return 'Bom';
      if (value > 60) return 'Regular';
      return 'Ruim';
      
    case 'R²':
      if (value > 0.9) return 'Excelente';
      if (value > 0.8) return 'Bom';
      if (value > 0.6) return 'Regular';
      return 'Ruim';
      
    case 'Theil U1':
    case 'Theil U2':
      if (value < 0.3) return 'Excelente';
      if (value < 0.6) return 'Bom';
      if (value < 1.0) return 'Regular';
      return 'Ruim';
      
    default:
      return 'N/A';
  }
}

// Exemplo 4: Comparação entre diferentes modelos
export function exampleModelComparison() {
  // Simulando resultados de 3 modelos diferentes
  const models = [
    {
      name: 'ARIMA',
      predicted: [101, 104, 99, 109, 116, 109, 119, 126, 119, 129]
    },
    {
      name: 'LSTM',
      predicted: [100, 105, 98, 110, 115, 108, 120, 125, 118, 130]
    },
    {
      name: 'Prophet',
      predicted: [103, 102, 101, 107, 118, 111, 117, 128, 121, 127]
    }
  ];
  
  const selectedMetrics = ['mae', 'rmse', 'pocid', 'r2', 'global_score'];
  
  console.log('\n=== COMPARAÇÃO DE MODELOS ===');
  
  models.forEach(model => {
    console.log(`\n--- ${model.name} ---`);
    const results = calculateAllMetrics(actualValues, model.predicted, selectedMetrics);
    
    results.forEach(metric => {
      console.log(`${metric.name}: ${formatMetricValue(metric)}`);
    });
  });
}

// Função para executar todos os exemplos
export function runAllExamples() {
  console.log('🔍 DEMONSTRAÇÃO DAS MÉTRICAS DE AVALIAÇÃO\n');
  
  exampleBasicMetrics();
  exampleAdvancedMetrics();
  exampleGlobalScore();
  exampleModelComparison();
  
  console.log('\n✅ Demonstração concluída!');
}

// Exporta dados de exemplo para uso em outros componentes
export const sampleData = {
  actual: actualValues,
  predicted: predictedValues,
  metrics: ['mae', 'rmse', 'mape', 'smape', 'mase', 'pocid', 'r2', 'theil_u1', 'theil_u2', 'global_score']
}; 