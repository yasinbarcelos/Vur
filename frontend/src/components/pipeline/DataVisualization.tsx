import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Activity, TrendingUp, ScatterChart, AlertTriangle } from 'lucide-react';
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
