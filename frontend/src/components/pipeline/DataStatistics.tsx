import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Calculator, Activity, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DataStatisticsProps {
  data: any[];
  columns: string[];
  targetColumn?: string;
}

interface ColumnStats {
  column: string;
  count: number;
  nullCount: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  uniqueValues?: number;
  dataType: 'numeric' | 'categorical' | 'text';
}

// Configurações de performance
const MAX_SAMPLE_SIZE = 1000; // Máximo de linhas para análise detalhada
const TYPE_DETECTION_SAMPLE = 100; // Amostra para detectar tipos

const DataStatistics: React.FC<DataStatisticsProps> = ({ data, columns, targetColumn }) => {
  
  // Amostragem inteligente para análise
  const { sampleData, isLargeDataset } = useMemo(() => {
    const isLarge = data.length > MAX_SAMPLE_SIZE;
    
    if (!isLarge) {
      return { sampleData: data, isLargeDataset: false };
    }
    
    // Amostragem estratificada
    const step = Math.max(1, Math.floor(data.length / MAX_SAMPLE_SIZE));
    const sample = data.filter((_, index) => index % step === 0);
    
    return { sampleData: sample, isLargeDataset: true };
  }, [data]);

  // Função otimizada para detectar tipo de dados
  const detectDataType = useMemo(() => {
    const cache: { [key: string]: 'numeric' | 'categorical' | 'text' } = {};
    
    return (columnName: string): 'numeric' | 'categorical' | 'text' => {
      if (cache[columnName]) return cache[columnName];
      
      // Use amostra ainda menor para detecção de tipos
      const typeDetectionData = data.slice(0, TYPE_DETECTION_SAMPLE);
      const values = typeDetectionData
        .map(row => row[columnName])
        .filter(v => v !== null && v !== undefined && v !== '');
      
      if (values.length === 0) {
        cache[columnName] = 'text';
        return 'text';
      }
      
      const numericValues = values.filter(v => !isNaN(Number(v)));
      const numericRatio = numericValues.length / values.length;
      
      if (numericRatio > 0.8) {
        cache[columnName] = 'numeric';
        return 'numeric';
      }
      
      const uniqueCount = new Set(values).size;
      const totalCount = values.length;
      
      if (uniqueCount / totalCount < 0.1 && uniqueCount < 20) {
        cache[columnName] = 'categorical';
        return 'categorical';
      }
      
      cache[columnName] = 'text';
      return 'text';
    };
  }, [data]);

  // Função otimizada para calcular estatísticas numéricas
  const calculateNumericStats = useMemo(() => {
    const cache: { [key: string]: any } = {};
    
    return (columnName: string) => {
      if (cache[columnName]) return cache[columnName];
      
      const values = sampleData
        .map(row => Number(row[columnName]))
        .filter(v => !isNaN(v));
      
      if (values.length === 0) {
        cache[columnName] = null;
        return null;
      }
      
      // Estatísticas básicas sem ordenação para performance
      const sum = values.reduce((acc, val) => acc + val, 0);
      const mean = sum / values.length;
      
      let min = values[0];
      let max = values[0];
      let sumSquaredDiffs = 0;
      
      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        if (val < min) min = val;
        if (val > max) max = val;
        sumSquaredDiffs += Math.pow(val - mean, 2);
      }
      
      const variance = sumSquaredDiffs / values.length;
      const std = Math.sqrt(variance);
      
      // Mediana aproximada (mais rápida que ordenação completa)
      const median = values.length < 1000 
        ? (() => {
            const sorted = values.slice().sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0
              ? (sorted[mid - 1] + sorted[mid]) / 2
              : sorted[mid];
          })()
        : mean; // Para datasets grandes, use média como aproximação
      
      const stats = {
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        std: Number(std.toFixed(2)),
        min,
        max
      };
      
      cache[columnName] = stats;
      return stats;
    };
  }, [sampleData]);

  // Calcular estatísticas para cada coluna (otimizado)
  const columnStats: ColumnStats[] = useMemo(() => {
    return columns.map(column => {
      const dataType = detectDataType(column);
      
      // Contar valores nulos usando apenas amostra para datasets grandes
      const dataToAnalyze = isLargeDataset ? sampleData : data;
      const values = dataToAnalyze
        .map(row => row[column])
        .filter(v => v !== null && v !== undefined && v !== '');
      
      const nullCount = isLargeDataset 
        ? Math.round((dataToAnalyze.length - values.length) * (data.length / dataToAnalyze.length))
        : data.length - values.length;

      const stats: ColumnStats = {
        column,
        count: data.length,
        nullCount,
        uniqueValues: isLargeDataset 
          ? Math.min(new Set(values).size * (data.length / dataToAnalyze.length), data.length)
          : new Set(values).size,
        dataType
      };

      if (dataType === 'numeric') {
        const numStats = calculateNumericStats(column);
        if (numStats) {
          Object.assign(stats, numStats);
        }
      }

      return stats;
    });
  }, [columns, data, sampleData, isLargeDataset, detectDataType, calculateNumericStats]);

  // Estatísticas gerais do dataset
  const generalStats = useMemo(() => {
    const numericColumns = columnStats.filter(s => s.dataType === 'numeric').length;
    const categoricalColumns = columnStats.filter(s => s.dataType === 'categorical').length;
    const totalMissingValues = columnStats.reduce((sum, col) => sum + col.nullCount, 0);
    const totalCells = data.length * columns.length;
    const completeness = totalCells > 0 
      ? ((totalCells - totalMissingValues) / totalCells * 100).toFixed(1)
      : '0.0';

    return {
      totalRows: data.length,
      totalColumns: columns.length,
      numericColumns,
      categoricalColumns,
      missingValues: totalMissingValues,
      completeness
    };
  }, [data.length, columns.length, columnStats]);

  return (
    <div className="space-y-6">
      {/* Aviso sobre amostragem */}
      {isLargeDataset && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Dataset grande detectado:</strong> Estatísticas calculadas em amostra de {sampleData.length.toLocaleString()} 
            registros de {data.length.toLocaleString()} totais para melhor performance. 
            Os resultados são representativos do dataset completo.
          </AlertDescription>
        </Alert>
      )}

      {/* Estatísticas Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Estatísticas Gerais do Dataset
          </CardTitle>
          <CardDescription>
            Visão geral dos dados carregados
            {isLargeDataset && ` (baseado em amostra de ${sampleData.length.toLocaleString()} registros)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{generalStats.totalRows.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Linhas</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{generalStats.totalColumns}</div>
              <div className="text-sm text-gray-600">Colunas</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{generalStats.numericColumns}</div>
              <div className="text-sm text-gray-600">Numéricas</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{generalStats.completeness}%</div>
              <div className="text-sm text-gray-600">Completude</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Destaque da Coluna Alvo */}
      {targetColumn && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Análise da Variável Alvo: {targetColumn}
            </CardTitle>
            <CardDescription>
              {isLargeDataset && `Estatísticas baseadas em amostra de ${sampleData.length.toLocaleString()} registros`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const targetStats = columnStats.find(s => s.column === targetColumn);
              if (!targetStats) return <div>Estatísticas não disponíveis</div>;
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {targetStats.dataType === 'numeric' ? (
                    <>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold">{targetStats.mean}</div>
                        <div className="text-sm text-gray-600">Média</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold">{targetStats.median}</div>
                        <div className="text-sm text-gray-600">Mediana</div>
                        {isLargeDataset && targetStats.median === targetStats.mean && (
                          <div className="text-xs text-gray-500">(aproximada)</div>
                        )}
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold">{targetStats.std}</div>
                        <div className="text-sm text-gray-600">Desvio Padrão</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold">{targetStats.max! - targetStats.min!}</div>
                        <div className="text-sm text-gray-600">Amplitude</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold">{targetStats.uniqueValues?.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Valores Únicos</div>
                        {isLargeDataset && <div className="text-xs text-gray-500">(estimativa)</div>}
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold">{targetStats.nullCount.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Valores Faltantes</div>
                        {isLargeDataset && <div className="text-xs text-gray-500">(estimativa)</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Estatísticas por Coluna */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Estatísticas por Coluna
          </CardTitle>
          <CardDescription>
            Análise detalhada de cada variável
            {isLargeDataset && ` (estatísticas estimadas baseadas em amostra)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Coluna</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Tipo</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Contagem</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Nulos</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Únicos</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Média</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Mediana</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Desvio</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Min</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Max</th>
                </tr>
              </thead>
              <tbody>
                {columnStats.map((stat, index) => (
                  <tr key={stat.column} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2 font-medium">
                      {stat.column}
                      {stat.column === targetColumn && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          ALVO
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stat.dataType === 'numeric' 
                          ? 'bg-green-100 text-green-700'
                          : stat.dataType === 'categorical'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {stat.dataType}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {stat.count.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {stat.nullCount.toLocaleString()}
                      {stat.nullCount > 0 && (
                        <div className="text-xs text-red-600">
                          ({((stat.nullCount / stat.count) * 100).toFixed(1)}%)
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {stat.uniqueValues?.toLocaleString() || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {stat.mean || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {stat.median || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {stat.std || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {stat.min || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {stat.max || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resumo de Qualidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Resumo de Qualidade dos Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {columnStats.filter(s => s.nullCount === 0).length}
              </div>
              <div className="text-sm text-gray-600">Colunas Completas</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">
                {columnStats.filter(s => s.nullCount > 0 && s.nullCount / s.count < 0.3).length}
              </div>
              <div className="text-sm text-gray-600">Colunas com Poucos Nulos</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">
                {columnStats.filter(s => s.nullCount / s.count >= 0.3).length}
              </div>
              <div className="text-sm text-gray-600">Colunas com Muitos Nulos</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataStatistics; 