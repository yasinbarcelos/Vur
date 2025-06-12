import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Activity, TrendingUp, ScatterChart, AlertTriangle, Waves, BarChart2, Info, GitBranch } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSticky } from '@/hooks/useSticky';

interface DataVisualizationProps {
  data: any[];
  columns: string[];
  targetColumn?: string;
  dateColumn?: string;
}

// Configurações de performance
const MAX_POINTS_VISUALIZATION = 1000; // Limite para gráficos
const MAX_POINTS_HISTOGRAM = 5000; // Limite para histograma
const SAMPLE_STEP = 10; // A cada quantos pontos amostrar
const MAX_LAGS_ACF = 50; // Máximo de lags para autocorrelação

// Função para calcular autocorrelação
const calculateAutocorrelation = (data: number[], maxLags: number = MAX_LAGS_ACF): { lags: number[], acf: number[] } => {
  if (data.length === 0) return { lags: [], acf: [] };
  
  const n = data.length;
  const mean = data.reduce((sum, val) => sum + val, 0) / n;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  
  if (variance === 0) return { lags: [], acf: [] };
  
  const lags: number[] = [];
  const acf: number[] = [];
  
  // Limitar maxLags para não exceder metade do tamanho dos dados
  const actualMaxLags = Math.min(maxLags, Math.floor(n / 4));
  
  for (let lag = 0; lag <= actualMaxLags; lag++) {
    let covariance = 0;
    const usableLength = n - lag;
    
    for (let i = 0; i < usableLength; i++) {
      covariance += (data[i] - mean) * (data[i + lag] - mean);
    }
    
    covariance /= n; // Normalizar pelo tamanho total
    const correlation = covariance / variance;
    
    lags.push(lag);
    acf.push(correlation);
  }
  
  return { lags, acf };
};

// Função para calcular correlação parcial (aproximação usando Yule-Walker)
const calculatePartialAutocorrelation = (data: number[], maxLags: number = MAX_LAGS_ACF): { lags: number[], pacf: number[] } => {
  if (data.length === 0) return { lags: [], pacf: [] };
  
  const { acf } = calculateAutocorrelation(data, maxLags);
  if (acf.length <= 1) return { lags: [], pacf: [] };
  
  const lags: number[] = [];
  const pacf: number[] = [];
  
  // PACF(0) é sempre 1
  lags.push(0);
  pacf.push(1);
  
  // Calcular PACF usando equações de Yule-Walker
  for (let k = 1; k < acf.length && k <= maxLags; k++) {
    if (k === 1) {
      // PACF(1) = ACF(1)
      lags.push(k);
      pacf.push(acf[1]);
    } else {
      // Para k > 1, usar aproximação iterativa
      try {
        // Construir sistema de equações Yule-Walker
        const R = Array(k).fill(0).map(() => Array(k).fill(0));
        const r = Array(k).fill(0);
        
        // Preencher matriz de autocorrelação
        for (let i = 0; i < k; i++) {
          r[i] = acf[i + 1];
          for (let j = 0; j < k; j++) {
            R[i][j] = acf[Math.abs(i - j)];
          }
        }
        
        // Resolver usando método simplificado (última equação)
        let numerator = acf[k];
        for (let j = 0; j < k - 1; j++) {
          numerator -= pacf[j + 1] * acf[k - 1 - j];
        }
        
        let denominator = 1;
        for (let j = 0; j < k - 1; j++) {
          denominator -= pacf[j + 1] * acf[j + 1];
        }
        
        const pacfValue = denominator !== 0 ? numerator / denominator : 0;
        
        lags.push(k);
        pacf.push(Math.max(-1, Math.min(1, pacfValue))); // Limitar entre -1 e 1
      } catch (error) {
        // Em caso de erro, usar aproximação simples
        lags.push(k);
        pacf.push(0);
      }
    }
  }
  
  return { lags, pacf };
};

// Função para calcular Informação Mútua
const calculateMutualInformation = (data: number[], maxLags: number = 30): { lags: number[], mi: number[] } => {
  if (data.length < 20) return { lags: [], mi: [] };
  
  const lags: number[] = [];
  const mi: number[] = [];
  
  // Função para discretizar dados em bins
  const discretize = (values: number[], bins: number = 10) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) return values.map(() => 0);
    
    return values.map(val => Math.min(bins - 1, Math.floor((val - min) / range * bins)));
  };
  
  // Função para calcular entropia
  const entropy = (discreteValues: number[]) => {
    const counts = new Map<number, number>();
    discreteValues.forEach(val => {
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    
    const total = discreteValues.length;
    let h = 0;
    counts.forEach(count => {
      const p = count / total;
      if (p > 0) h -= p * Math.log2(p);
    });
    
    return h;
  };
  
  // Função para calcular entropia conjunta
  const jointEntropy = (x: number[], y: number[]) => {
    const jointCounts = new Map<string, number>();
    for (let i = 0; i < x.length; i++) {
      const key = `${x[i]},${y[i]}`;
      jointCounts.set(key, (jointCounts.get(key) || 0) + 1);
    }
    
    const total = x.length;
    let h = 0;
    jointCounts.forEach(count => {
      const p = count / total;
      if (p > 0) h -= p * Math.log2(p);
    });
    
    return h;
  };
  
  const actualMaxLags = Math.min(maxLags, Math.floor(data.length / 4));
  
  for (let lag = 0; lag <= actualMaxLags; lag++) {
    if (lag === 0) {
      lags.push(lag);
      mi.push(0); // MI consigo mesmo no lag 0 é tecnicamente infinito, mas usamos 0 para visualização
      continue;
    }
    
    const usableLength = data.length - lag;
    const x = data.slice(0, usableLength);
    const y = data.slice(lag, lag + usableLength);
    
    if (x.length < 10) break;
    
    try {
      const xDiscrete = discretize(x);
      const yDiscrete = discretize(y);
      
      const hX = entropy(xDiscrete);
      const hY = entropy(yDiscrete);
      const hXY = jointEntropy(xDiscrete, yDiscrete);
      
      const mutualInfo = hX + hY - hXY;
      
      lags.push(lag);
      mi.push(Math.max(0, mutualInfo)); // Garantir que MI seja não-negativa
    } catch (error) {
      lags.push(lag);
      mi.push(0);
    }
  }
  
  return { lags, mi };
};

// Função para calcular Parâmetro de Hurst usando método R/S
const calculateHurstExponent = (data: number[]): { scales: number[], rs: number[], hurst: number } => {
  if (data.length < 50) return { scales: [], rs: [], hurst: 0.5 };
  
  const scales: number[] = [];
  const rs: number[] = [];
  
  // Gerar escalas logarítmicas
  const minScale = 10;
  const maxScale = Math.floor(data.length / 4);
  const numScales = 10;
  
  for (let i = 0; i < numScales; i++) {
    const scale = Math.floor(minScale * Math.pow(maxScale / minScale, i / (numScales - 1)));
    if (scale >= minScale && scale <= maxScale) {
      scales.push(scale);
    }
  }
  
  // Calcular R/S para cada escala
  scales.forEach(n => {
    try {
      const numSegments = Math.floor(data.length / n);
      let avgRS = 0;
      
      for (let seg = 0; seg < numSegments; seg++) {
        const segment = data.slice(seg * n, (seg + 1) * n);
        
        // Calcular média do segmento
        const mean = segment.reduce((sum, val) => sum + val, 0) / segment.length;
        
        // Calcular desvios cumulativos
        const deviations = segment.map(val => val - mean);
        const cumulativeDeviations = deviations.reduce((acc, dev, i) => {
          acc.push((acc[i - 1] || 0) + dev);
          return acc;
        }, [] as number[]);
        
        // Calcular range
        const maxCumDev = Math.max(...cumulativeDeviations);
        const minCumDev = Math.min(...cumulativeDeviations);
        const range = maxCumDev - minCumDev;
        
        // Calcular desvio padrão
        const variance = deviations.reduce((sum, dev) => sum + dev * dev, 0) / deviations.length;
        const stdDev = Math.sqrt(variance);
        
        // R/S ratio
        const rsRatio = stdDev > 0 ? range / stdDev : 0;
        avgRS += rsRatio;
      }
      
      avgRS /= numSegments;
      rs.push(avgRS);
    } catch (error) {
      rs.push(1);
    }
  });
  
  // Calcular expoente de Hurst usando regressão linear em log-log
  let hurst = 0.5;
  if (scales.length >= 3 && rs.length >= 3) {
    try {
      const logScales = scales.map(s => Math.log(s));
      const logRS = rs.map(r => Math.log(Math.max(1e-10, r)));
      
      // Regressão linear simples
      const n = logScales.length;
      const sumX = logScales.reduce((sum, x) => sum + x, 0);
      const sumY = logRS.reduce((sum, y) => sum + y, 0);
      const sumXY = logScales.reduce((sum, x, i) => sum + x * logRS[i], 0);
      const sumX2 = logScales.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      hurst = Math.max(0, Math.min(1, slope)); // Limitar entre 0 e 1
    } catch (error) {
      hurst = 0.5;
    }
  }
  
  return { scales, rs, hurst };
};

const DataVisualization: React.FC<DataVisualizationProps> = ({ 
  data, 
  columns, 
  targetColumn, 
  dateColumn 
}) => {
  const [selectedColumn, setSelectedColumn] = React.useState<string>(targetColumn || columns[0] || '');
  const [selectedColumn2, setSelectedColumn2] = React.useState<string>('');
  
  // Hook para controle do sticky
  const { isSticky, elementRef: controlsRef, containerRef, elementHeight } = useSticky({
    offsetTop: 0,
    threshold: 0
  });

  // Amostragem inteligente dos dados para melhor performance
  const sampledData = useMemo(() => {
    if (data.length <= MAX_POINTS_VISUALIZATION) return data;
    
    // Amostragem uniforme
    const step = Math.max(1, Math.floor(data.length / MAX_POINTS_VISUALIZATION));
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  // Detectar colunas numéricas (otimizado)
  const numericColumns = useMemo(() => {
    if (!data.length) return [];
    
    // Use apenas uma amostra para detectar tipos (muito mais rápido)
    const sampleSize = Math.min(100, data.length);
    const sampleData = data.slice(0, sampleSize);
    
    return columns.filter(col => {
      const values = sampleData.map(row => row[col])
        .filter(v => v !== null && v !== undefined && v !== '');
      
      if (values.length === 0) return false;
      
      const numericValues = values.filter(v => !isNaN(Number(v)));
      return numericValues.length / values.length > 0.8;
    });
  }, [data, columns]);

  // Função otimizada para obter dados da coluna
  const getColumnData = useMemo(() => {
    const cache: { [key: string]: number[] } = {};
    
    return (columnName: string, limit?: number) => {
      const cacheKey = `${columnName}_${limit || 'full'}`;
      
      if (cache[cacheKey]) return cache[cacheKey];
      
      const sourceData = limit ? data.slice(0, limit) : sampledData;
      const values = sourceData
        .map(row => Number(row[columnName]))
        .filter(v => !isNaN(v));
      
      cache[cacheKey] = values;
      return values;
    };
  }, [data, sampledData]);

  // Aviso sobre amostragem
  const showSamplingWarning = data.length > MAX_POINTS_VISUALIZATION;

  // Gráfico de Histograma (otimizado)
  const histogramPlot = useMemo(() => {
    if (!selectedColumn || !numericColumns.includes(selectedColumn)) return null;
    
    const values = getColumnData(selectedColumn, MAX_POINTS_HISTOGRAM);
    if (values.length === 0) return null;
    
    return (
      <Plot
        data={[
          {
            x: values,
            type: 'histogram',
            nbinsx: Math.min(30, Math.max(10, Math.floor(values.length / 50))),
            marker: {
              color: 'rgba(59, 130, 246, 0.7)',
              line: {
                color: 'rgba(59, 130, 246, 1)',
                width: 1
              }
            },
            name: 'Distribuição'
          }
        ]}
        layout={{
          title: `Distribuição de ${selectedColumn}`,
          xaxis: { title: selectedColumn },
          yaxis: { title: 'Frequência' },
          height: 400,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          font: { size: 12 }
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%' }}
      />
    );
  }, [selectedColumn, numericColumns, getColumnData]);

  // Gráfico de Boxplot (otimizado)
  const boxPlot = useMemo(() => {
    if (!selectedColumn || !numericColumns.includes(selectedColumn)) return null;
    
    const values = getColumnData(selectedColumn);
    if (values.length === 0) return null;
    
    return (
      <Plot
        data={[
          {
            y: values,
            type: 'box',
            name: selectedColumn,
            marker: { color: 'rgba(34, 197, 94, 0.7)' },
            boxpoints: values.length < 1000 ? 'outliers' : false // Não mostrar outliers para datasets grandes
          }
        ]}
        layout={{
          title: `Boxplot de ${selectedColumn}`,
          yaxis: { title: selectedColumn },
          height: 400,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          font: { size: 12 }
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%' }}
      />
    );
  }, [selectedColumn, numericColumns, getColumnData]);

  // Gráfico de Dispersão (otimizado)
  const scatterPlot = useMemo(() => {
    if (!selectedColumn || !selectedColumn2 || 
        !numericColumns.includes(selectedColumn) || 
        !numericColumns.includes(selectedColumn2)) return null;
    
    const xValues = getColumnData(selectedColumn);
    const yValues = getColumnData(selectedColumn2);
    
    // Garantir que ambos os arrays tenham o mesmo tamanho
    const minLength = Math.min(xValues.length, yValues.length);
    const xData = xValues.slice(0, minLength);
    const yData = yValues.slice(0, minLength);
    
    if (xData.length === 0 || yData.length === 0) return null;
    
    return (
      <Plot
        data={[
          {
            x: xData,
            y: yData,
            mode: 'markers',
            type: 'scatter',
            marker: {
              color: 'rgba(168, 85, 247, 0.7)',
              size: Math.min(8, Math.max(3, 1000 / xData.length)), // Tamanho adaptativo
              line: {
                color: 'rgba(168, 85, 247, 1)',
                width: 1
              }
            },
            name: 'Pontos'
          }
        ]}
        layout={{
          title: `${selectedColumn} vs ${selectedColumn2}`,
          xaxis: { title: selectedColumn },
          yaxis: { title: selectedColumn2 },
          height: 400,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          font: { size: 12 }
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%' }}
      />
    );
  }, [selectedColumn, selectedColumn2, numericColumns, getColumnData]);

  // Gráfico de Série Temporal (otimizado)
  const timeSeriesPlot = useMemo(() => {
    // Use selectedColumn se for numérica, senão use targetColumn
    const columnToUse = selectedColumn && numericColumns.includes(selectedColumn) 
      ? selectedColumn 
      : targetColumn;
    
    if (!dateColumn || !columnToUse || !numericColumns.includes(columnToUse)) return null;
    
    const dates = sampledData.map(row => row[dateColumn]);
    const values = getColumnData(columnToUse);
    
    if (dates.length === 0 || values.length === 0) return null;
    
    return (
      <Plot
        data={[
          {
            x: dates,
            y: values,
            type: 'scatter',
            mode: sampledData.length > 500 ? 'lines' : 'lines+markers', // Só mostrar markers para datasets pequenos
            marker: { color: 'rgba(239, 68, 68, 0.7)' },
            line: { color: 'rgba(239, 68, 68, 1)' },
            name: columnToUse
          }
        ]}
        layout={{
          title: `Série Temporal: ${columnToUse}`,
          xaxis: { 
            title: dateColumn,
            type: 'date'
          },
          yaxis: { title: columnToUse },
          height: 400,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          font: { size: 12 }
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%' }}
      />
    );
  }, [dateColumn, selectedColumn, targetColumn, sampledData, numericColumns, getColumnData]);

  // Gráfico de Autocorrelação
  const autocorrelationPlot = useMemo(() => {
    if (!selectedColumn || !numericColumns.includes(selectedColumn)) return null;
    
    const values = getColumnData(selectedColumn);
    if (values.length < 10) return null; // Precisa de dados suficientes
    
    const { lags, acf } = calculateAutocorrelation(values);
    if (lags.length === 0) return null;
    
    // Calcular limites de confiança (aproximação)
    const n = values.length;
    const confidenceLimit = 1.96 / Math.sqrt(n); // 95% de confiança
    
    return (
      <Plot
        data={[
          {
            x: lags,
            y: acf,
            type: 'scatter',
            mode: 'lines+markers',
            line: { 
              color: 'rgba(239, 68, 68, 1)', 
              width: 2 
            },
            marker: {
              color: 'rgba(239, 68, 68, 0.8)',
              size: 6,
              line: { color: 'rgba(239, 68, 68, 1)', width: 1 }
            },
            name: 'Autocorrelação'
          },
          // Linha de limite superior de confiança
          {
            x: lags,
            y: Array(lags.length).fill(confidenceLimit),
            type: 'scatter',
            mode: 'lines',
            line: { color: 'red', dash: 'dash', width: 1 },
            name: 'Limite 95%',
            showlegend: false
          },
          // Linha de limite inferior de confiança
          {
            x: lags,
            y: Array(lags.length).fill(-confidenceLimit),
            type: 'scatter',
            mode: 'lines',
            line: { color: 'red', dash: 'dash', width: 1 },
            name: 'Limite 95%',
            showlegend: false
          }
        ]}
        layout={{
          title: `Autocorrelação - ${selectedColumn}`,
          xaxis: { 
            title: 'Lag',
            range: [-0.5, Math.min(30, lags.length - 1) + 0.5]
          },
          yaxis: { 
            title: 'Autocorrelação',
            range: [-1.1, 1.1]
          },
          height: 400,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          font: { size: 12 },
          showlegend: true
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%' }}
      />
    );
  }, [selectedColumn, numericColumns, getColumnData]);

  // Gráfico de Correlação Parcial
  const partialAutocorrelationPlot = useMemo(() => {
    if (!selectedColumn || !numericColumns.includes(selectedColumn)) return null;
    
    const values = getColumnData(selectedColumn);
    if (values.length < 10) return null; // Precisa de dados suficientes
    
    const { lags, pacf } = calculatePartialAutocorrelation(values);
    if (lags.length === 0) return null;
    
    // Calcular limites de confiança (aproximação)
    const n = values.length;
    const confidenceLimit = 1.96 / Math.sqrt(n); // 95% de confiança
    
    return (
      <Plot
        data={[
          {
            x: lags,
            y: pacf,
            type: 'scatter',
            mode: 'lines+markers',
            line: { 
              color: 'rgba(34, 197, 94, 1)', 
              width: 2 
            },
            marker: {
              color: 'rgba(34, 197, 94, 0.8)',
              size: 6,
              line: { color: 'rgba(34, 197, 94, 1)', width: 1 }
            },
            name: 'Correlação Parcial'
          },
          // Linha de limite superior de confiança
          {
            x: lags,
            y: Array(lags.length).fill(confidenceLimit),
            type: 'scatter',
            mode: 'lines',
            line: { color: 'red', dash: 'dash', width: 1 },
            name: 'Limite 95%',
            showlegend: false
          },
          // Linha de limite inferior de confiança
          {
            x: lags,
            y: Array(lags.length).fill(-confidenceLimit),
            type: 'scatter',
            mode: 'lines',
            line: { color: 'red', dash: 'dash', width: 1 },
            name: 'Limite 95%',
            showlegend: false
          }
        ]}
        layout={{
          title: `Correlação Parcial - ${selectedColumn}`,
          xaxis: { 
            title: 'Lag',
            range: [-0.5, Math.min(30, lags.length - 1) + 0.5]
          },
          yaxis: { 
            title: 'Correlação Parcial',
            range: [-1.1, 1.1]
          },
          height: 400,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          font: { size: 12 },
          showlegend: true
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%' }}
      />
    );
  }, [selectedColumn, numericColumns, getColumnData]);

  // Gráfico de Informação Mútua
  const mutualInformationPlot = useMemo(() => {
    if (!selectedColumn || !numericColumns.includes(selectedColumn)) return null;
    
    const values = getColumnData(selectedColumn);
    if (values.length < 20) return null; // Precisa de dados suficientes
    
    const { lags, mi } = calculateMutualInformation(values);
    if (lags.length === 0) return null;
    
    return (
      <Plot
        data={[
          {
            x: lags,
            y: mi,
            type: 'scatter',
            mode: 'lines+markers',
            line: { 
              color: 'rgba(168, 85, 247, 1)', 
              width: 2 
            },
            marker: {
              color: 'rgba(168, 85, 247, 0.8)',
              size: 6,
              line: { color: 'rgba(168, 85, 247, 1)', width: 1 }
            },
            name: 'Informação Mútua'
          }
        ]}
        layout={{
          title: `Informação Mútua - ${selectedColumn}`,
          xaxis: { 
            title: 'Lag',
            range: [-0.5, Math.min(30, lags.length - 1) + 0.5]
          },
          yaxis: { 
            title: 'Informação Mútua (bits)',
            range: [0, Math.max(...mi) * 1.1]
          },
          height: 400,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          font: { size: 12 },
          showlegend: true
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%' }}
      />
    );
  }, [selectedColumn, numericColumns, getColumnData]);

  // Gráfico do Parâmetro de Hurst
  const hurstExponentPlot = useMemo(() => {
    if (!selectedColumn || !numericColumns.includes(selectedColumn)) return null;
    
    const values = getColumnData(selectedColumn);
    if (values.length < 50) return null; // Precisa de dados suficientes
    
    const { scales, rs, hurst } = calculateHurstExponent(values);
    if (scales.length === 0 || rs.length === 0) return null;
    
    // Criar linha de regressão teórica
    const logScales = scales.map(s => Math.log(s));
    const logRS = rs.map(r => Math.log(Math.max(1e-10, r)));
    const minLogScale = Math.min(...logScales);
    const maxLogScale = Math.max(...logScales);
    const regressionX = [minLogScale, maxLogScale];
    const regressionY = regressionX.map(x => {
      // y = hurst * x + intercept
      const intercept = logRS[0] - hurst * logScales[0];
      return hurst * x + intercept;
    });
    
    return (
      <Plot
        data={[
          {
            x: logScales,
            y: logRS,
            type: 'scatter',
            mode: 'lines+markers',
            line: { 
              color: 'rgba(245, 158, 11, 1)', 
              width: 2 
            },
            marker: {
              color: 'rgba(245, 158, 11, 0.8)',
              size: 8,
              line: { color: 'rgba(245, 158, 11, 1)', width: 1 }
            },
            name: 'R/S Observado'
          },
          {
            x: regressionX,
            y: regressionY,
            type: 'scatter',
            mode: 'lines',
            line: { 
              color: 'rgba(239, 68, 68, 1)', 
              width: 2,
              dash: 'dot'
            },
            name: `Regressão (H=${hurst.toFixed(3)})`
          }
        ]}
        layout={{
          title: `Análise de Hurst - ${selectedColumn}`,
          xaxis: { 
            title: 'log(Escala)',
            type: 'linear'
          },
          yaxis: { 
            title: 'log(R/S)',
            type: 'linear'
          },
          height: 400,
          margin: { l: 50, r: 50, t: 50, b: 50 },
          font: { size: 12 },
          showlegend: true,
          annotations: [
            {
              x: 0.02,
              y: 0.98,
              xref: 'paper',
              yref: 'paper',
              text: `<b>Expoente de Hurst: ${hurst.toFixed(3)}</b><br>` +
                    `${hurst < 0.5 ? 'Anti-persistente' : hurst > 0.5 ? 'Persistente' : 'Aleatório'}<br>` +
                    `${hurst < 0.5 ? '(Tendência de reversão)' : hurst > 0.5 ? '(Tendência de persistência)' : '(Caminhada aleatória)'}`,
              showarrow: false,
              align: 'left',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              bordercolor: 'rgba(0, 0, 0, 0.2)',
              borderwidth: 1
            }
          ]
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: '100%' }}
      />
    );
  }, [selectedColumn, numericColumns, getColumnData]);

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Aviso sobre amostragem */}
      {showSamplingWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Dados grandes detectados:</strong> Mostrando amostra de {sampledData.length.toLocaleString()} 
            pontos de {data.length.toLocaleString()} totais para melhor performance. 
            As visualizações são representativas do dataset completo.
          </AlertDescription>
        </Alert>
      )}

      {/* Controles de Seleção - Agora com comportamento sticky */}
      <div
        ref={controlsRef}
        className={`transition-all duration-200 ${
          isSticky 
            ? 'fixed top-0 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-4' 
            : 'relative'
        }`}
      >
        <Card className={`${isSticky ? 'shadow-lg border-2 border-blue-200 bg-white/95 backdrop-blur-sm' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Controles de Visualização
              {isSticky && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Fixado
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Selecione as variáveis para visualizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Variável Principal</label>
                <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma coluna numérica" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dateColumn && (
                  <div className="text-xs text-gray-500 mt-1">
                    Esta variável será usada na série temporal
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Variável Secundária (para Scatter)</label>
                <Select value={selectedColumn2} onValueChange={setSelectedColumn2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione segunda coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.filter(col => col !== selectedColumn).map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Espaçamento quando os controles estão sticky */}
      {isSticky && <div style={{ height: `${Math.max(elementHeight, 160)}px` }} />}

      {/* Série Temporal */}
      {dateColumn && (selectedColumn || targetColumn) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Análise de Série Temporal
            </CardTitle>
            <CardDescription>
              Evolução da variável {selectedColumn && numericColumns.includes(selectedColumn) ? selectedColumn : targetColumn} ao longo do tempo
              {showSamplingWarning && ` (${sampledData.length.toLocaleString()} pontos)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeSeriesPlot || (
              <div className="h-96 flex items-center justify-center text-gray-500">
                {!dateColumn && "Nenhuma coluna de data definida"}
                {dateColumn && !selectedColumn && !targetColumn && "Selecione uma variável numérica"}
                {dateColumn && selectedColumn && !numericColumns.includes(selectedColumn) && "A variável selecionada não é numérica"}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histograma e Boxplot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Distribuição
            </CardTitle>
            <CardDescription>
              Histograma da variável selecionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {histogramPlot || (
              <div className="h-96 flex items-center justify-center text-gray-500">
                Selecione uma coluna numérica para visualizar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Análise de Outliers
            </CardTitle>
            <CardDescription>
              Boxplot para identificar valores atípicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {boxPlot || (
              <div className="h-96 flex items-center justify-center text-gray-500">
                Selecione uma coluna numérica para visualizar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Dispersão */}
      {selectedColumn && selectedColumn2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScatterChart className="w-5 h-5" />
              Análise de Correlação
            </CardTitle>
            <CardDescription>
              Relação entre duas variáveis numéricas
              {showSamplingWarning && ` (${sampledData.length.toLocaleString()} pontos)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scatterPlot}
          </CardContent>
        </Card>
      )}

      {/* Autocorrelação e Correlação Parcial */}
      {selectedColumn && numericColumns.includes(selectedColumn) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="w-5 h-5" />
                Autocorrelação (ACF)
              </CardTitle>
              <CardDescription>
                Correlação da série temporal consigo mesma em diferentes lags
                {showSamplingWarning && ` (${sampledData.length.toLocaleString()} pontos)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {autocorrelationPlot || (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  {!selectedColumn && "Selecione uma coluna numérica"}
                  {selectedColumn && !numericColumns.includes(selectedColumn) && "A variável selecionada não é numérica"}
                  {selectedColumn && numericColumns.includes(selectedColumn) && getColumnData(selectedColumn).length < 10 && "Dados insuficientes (mínimo 10 pontos)"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                Correlação Parcial (PACF)
              </CardTitle>
              <CardDescription>
                Correlação entre valores após remover efeitos de lags intermediários
                {showSamplingWarning && ` (${sampledData.length.toLocaleString()} pontos)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {partialAutocorrelationPlot || (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  {!selectedColumn && "Selecione uma coluna numérica"}
                  {selectedColumn && !numericColumns.includes(selectedColumn) && "A variável selecionada não é numérica"}
                  {selectedColumn && numericColumns.includes(selectedColumn) && getColumnData(selectedColumn).length < 10 && "Dados insuficientes (mínimo 10 pontos)"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Informação Mútua e Parâmetro de Hurst */}
      {selectedColumn && numericColumns.includes(selectedColumn) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Informação Mútua
              </CardTitle>
              <CardDescription>
                Medida de dependência não-linear entre a série e suas versões defasadas
                {showSamplingWarning && ` (${sampledData.length.toLocaleString()} pontos)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mutualInformationPlot || (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  {!selectedColumn && "Selecione uma coluna numérica"}
                  {selectedColumn && !numericColumns.includes(selectedColumn) && "A variável selecionada não é numérica"}
                  {selectedColumn && numericColumns.includes(selectedColumn) && getColumnData(selectedColumn).length < 20 && "Dados insuficientes (mínimo 20 pontos)"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Expoente de Hurst
              </CardTitle>
              <CardDescription>
                Análise de persistência e comportamento fractal da série temporal
                {showSamplingWarning && ` (${sampledData.length.toLocaleString()} pontos)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hurstExponentPlot || (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  {!selectedColumn && "Selecione uma coluna numérica"}
                  {selectedColumn && !numericColumns.includes(selectedColumn) && "A variável selecionada não é numérica"}
                  {selectedColumn && numericColumns.includes(selectedColumn) && getColumnData(selectedColumn).length < 50 && "Dados insuficientes (mínimo 50 pontos)"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Informações sobre dados */}
      <Card>
        <CardHeader>
          <CardTitle>Informações dos Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Total de registros:</span>
              <div className="text-lg font-bold text-blue-600">{data.length.toLocaleString()}</div>
              {showSamplingWarning && (
                <div className="text-xs text-gray-500">Visualizando: {sampledData.length.toLocaleString()}</div>
              )}
            </div>
            <div>
              <span className="font-medium">Colunas numéricas:</span>
              <div className="text-lg font-bold text-green-600">{numericColumns.length}</div>
            </div>
            <div>
              <span className="font-medium">Coluna alvo:</span>
              <div className="text-lg font-bold text-purple-600">{targetColumn || 'Não definida'}</div>
            </div>
            <div>
              <span className="font-medium">Coluna temporal:</span>
              <div className="text-lg font-bold text-orange-600">{dateColumn || 'Não definida'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataVisualization;
