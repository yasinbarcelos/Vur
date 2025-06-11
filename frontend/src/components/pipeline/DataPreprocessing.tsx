import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, BarChart3, Activity, TrendingUp, RefreshCw, Eye, EyeOff, Zap, Info, AlertTriangle } from 'lucide-react';
import Plot from 'react-plotly.js';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import PreprocessingConfig from './PreprocessingConfig';
import { PreprocessingConfig as ConfigType } from '@/hooks/usePreprocessing';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Check } from 'lucide-react';

interface PreprocessingConfig {
  normalization: 'none' | 'minmax' | 'zscore' | 'robust';
  transformation: 'none' | 'log' | 'sqrt' | 'difference' | 'boxcox';
  outlierDetection: boolean;
  outlierMethod: 'iqr' | 'zscore' | 'isolation';
  outlierThreshold: number;
  missingValueHandling: 'drop' | 'interpolate' | 'forward_fill' | 'backward_fill' | 'mean';
  seasonalDecomposition: boolean;
  smoothing: boolean;
  smoothingWindow: number;
}

interface PreprocessingPreview {
  original: number[];
  processed: number[];
  outliers?: number[];
  statistics: {
    original: { mean: number; std: number; min: number; max: number };
    processed: { mean: number; std: number; min: number; max: number };
    impact: {
      meanChange: number;
      stdChange: number;
      outliersRemoved: number;
    };
  };
}

const DataPreprocessing = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<PreprocessingConfig>({
    normalization: 'minmax',
    transformation: 'difference',
    outlierDetection: false,
    outlierMethod: 'iqr',
    outlierThreshold: 1.5,
    missingValueHandling: 'interpolate',
    seasonalDecomposition: false,
    smoothing: false,
    smoothingWindow: 5
  });
  
  const [selectedVariable, setSelectedVariable] = useState<string>('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<PreprocessingPreview | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Obter dados originais
  const originalData = pipelineData.data || [];
  const columns = pipelineData.columns || [];
  
  // Filtrar colunas numéricas para processamento
  const numericColumns = useMemo(() => {
    return columns.filter(col => {
      const values = originalData.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = values.filter(v => !isNaN(Number(v)));
      return numericValues.length / values.length > 0.8;
    });
  }, [originalData, columns]);

  // Definir variável selecionada automaticamente se não estiver definida
  React.useEffect(() => {
    if (!selectedVariable && numericColumns.length > 0) {
      setSelectedVariable(pipelineData.targetColumn || numericColumns[0]);
    }
  }, [selectedVariable, numericColumns, pipelineData.targetColumn]);

  // Calcular estatísticas básicas
  const calculateStats = (values: number[]) => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { mean, std, min, max };
  };

  // Aplicar normalização
  const applyNormalization = (values: number[], method: string): number[] => {
    switch (method) {
      case 'minmax':
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        return range === 0 ? values : values.map(v => (v - min) / range);
      
      case 'zscore':
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        return std === 0 ? values : values.map(v => (v - mean) / std);
      
      case 'robust':
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const median = sorted[Math.floor(sorted.length * 0.5)];
        return iqr === 0 ? values : values.map(v => (v - median) / iqr);
      
      default:
        return values;
    }
  };

  // Aplicar transformação
  const applyTransformation = (values: number[], method: string): number[] => {
    switch (method) {
      case 'log':
        return values.map(v => v > 0 ? Math.log(v) : 0);
      
      case 'sqrt':
        return values.map(v => v >= 0 ? Math.sqrt(v) : 0);
      
      case 'difference':
        return values.length > 1 ? [0, ...values.slice(1).map((v, i) => v - values[i])] : values;
      
      case 'boxcox':
        // Implementação simplificada da transformação Box-Cox (lambda = 0.5)
        return values.map(v => v > 0 ? (Math.pow(v, 0.5) - 1) / 0.5 : 0);
      
      default:
        return values;
    }
  };

  // Detectar outliers
  const detectOutliers = (values: number[], method: string, threshold: number): number[] => {
    switch (method) {
      case 'iqr':
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - threshold * iqr;
        const upperBound = q3 + threshold * iqr;
        return values.map((v, i) => (v < lowerBound || v > upperBound) ? i : -1).filter(i => i !== -1);
      
      case 'zscore':
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        return values.map((v, i) => Math.abs((v - mean) / std) > threshold ? i : -1).filter(i => i !== -1);
      
      default:
        return [];
    }
  };

  // Aplicar suavização
  const applySmoothing = (values: number[], window: number): number[] => {
    if (window <= 1) return values;
    
    return values.map((_, index) => {
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(values.length, index + Math.ceil(window / 2));
      const windowValues = values.slice(start, end);
      return windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
    });
  };

  // Gerar preview em tempo real
  const generatePreview = useMemo(() => {
    if (!pipelineData.data || !pipelineData.targetColumn) return null;

    try {
      const originalValues = pipelineData.data
        .map(row => Number(row[pipelineData.targetColumn]))
        .filter(v => !isNaN(v));

      if (originalValues.length === 0) return null;

      let processedValues = [...originalValues];

      // Aplicar transformação primeiro
      if (config.transformation !== 'none') {
        processedValues = applyTransformation(processedValues, config.transformation);
      }

      // Detectar outliers
      let outlierIndices: number[] = [];
      if (config.outlierDetection) {
        outlierIndices = detectOutliers(processedValues, config.outlierMethod, config.outlierThreshold);
        // Remover outliers (substitui por média dos vizinhos)
        outlierIndices.forEach(index => {
          const prev = index > 0 ? processedValues[index - 1] : processedValues[index + 1] || 0;
          const next = index < processedValues.length - 1 ? processedValues[index + 1] : processedValues[index - 1] || 0;
          processedValues[index] = (prev + next) / 2;
        });
      }

      // Aplicar suavização
      if (config.smoothing) {
        processedValues = applySmoothing(processedValues, config.smoothingWindow);
      }

      // Aplicar normalização por último
      if (config.normalization !== 'none') {
        processedValues = applyNormalization(processedValues, config.normalization);
      }

      const originalStats = calculateStats(originalValues);
      const processedStats = calculateStats(processedValues);

      return {
        original: originalValues.slice(0, 200), // Limitar para performance
        processed: processedValues.slice(0, 200),
        outliers: outlierIndices.filter(i => i < 200),
        statistics: {
          original: originalStats,
          processed: processedStats,
          impact: {
            meanChange: ((processedStats.mean - originalStats.mean) / originalStats.mean) * 100,
            stdChange: ((processedStats.std - originalStats.std) / originalStats.std) * 100,
            outliersRemoved: outlierIndices.length
          }
        }
      };
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      return null;
    }
  }, [pipelineData.data, pipelineData.targetColumn, config]);

  // Atualizar preview quando configuração muda
  useEffect(() => {
    if (generatePreview) {
      setPreview(generatePreview);
    }
  }, [generatePreview]);

  const updateConfig = (updates: Partial<PreprocessingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    setConfig({
      normalization: 'none',
      transformation: 'none',
      outlierDetection: false,
      outlierMethod: 'iqr',
      outlierThreshold: 1.5,
      missingValueHandling: 'interpolate',
      seasonalDecomposition: false,
      smoothing: false,
      smoothingWindow: 5
    });
    toast({
      title: "Configurações resetadas",
      description: "Todas as configurações foram restauradas para os valores padrão"
    });
  };

  const handleContinue = async () => {
    if (!pipelineData.data || !pipelineData.targetColumn) {
      toast({
        title: "Dados não encontrados",
        description: "Por favor, carregue os dados primeiro",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      updatePipelineData({ preprocessingConfig: config });
      completeStep('preprocessing');
      
      toast({
        title: "Pré-processamento configurado!",
        description: "As configurações foram salvas e aplicadas aos dados"
      });
    } catch (error) {
      toast({
        title: "Erro no processamento",
        description: "Erro ao aplicar pré-processamento",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Preparar dados para visualização
  const getVisualizationData = () => {
    if (!selectedVariable || originalData.length === 0) return { original: [], processed: [], dates: [] };
    
    const original = originalData.map(row => Number(row[selectedVariable])).filter(v => !isNaN(v));
    const processed = hasProcessed ? 
      processedData.map(row => row[`${selectedVariable}_processed`] || 0) : 
      original;
    const dates = pipelineData.dateColumn ? 
      originalData.map(row => row[pipelineData.dateColumn]) :
      original.map((_, index) => `Ponto ${index + 1}`);

    return { original, processed, dates };
  };

  const { original, processed, dates } = getVisualizationData();

  // Calcular estatísticas
  const getStatistics = (values: number[]) => {
    if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { 
      mean: Number(mean.toFixed(3)), 
      std: Number(std.toFixed(3)), 
      min: Number(min.toFixed(3)), 
      max: Number(max.toFixed(3)) 
    };
  };

  const originalStats = getStatistics(original);
  const processedStats = getStatistics(processed);

  if (originalData.length === 0) {
  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Pré-processamento de Dados
          </CardTitle>
          <CardDescription>
            Nenhum dado foi carregado ainda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Por favor, carregue dados na etapa anterior para continuar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pré-processamento de Dados</h2>
          <p className="text-muted-foreground">
            Configure transformações e visualize o impacto em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          {preview && (
            <Badge variant={preview.statistics.impact.outliersRemoved > 0 ? "destructive" : "default"}>
              <Eye className="w-3 h-3 mr-1" />
              Preview Ativo
            </Badge>
          )}
          <Button onClick={handleContinue} disabled={isProcessing}>
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {isProcessing ? 'Processando...' : 'Continuar para Engenharia de Features'}
          </Button>
        </div>
      </div>

      {/* Configurações de Pré-processamento - Layout Horizontal Compacto */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações de Transformação
          </CardTitle>
          <CardDescription>
            Ajuste os parâmetros de pré-processamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Normalização */}
            <div className="space-y-2">
              <Label>Normalização</Label>
              <Select 
                value={config.normalization} 
                onValueChange={(value: any) => updateConfig({ normalization: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="minmax">Min-Max (0 a 1)</SelectItem>
                  <SelectItem value="zscore">Z-Score (média 0, desvio 1)</SelectItem>
                  <SelectItem value="robust">Robusta (mediana e IQR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transformação */}
            <div className="space-y-2">
              <Label>Transformação de Dados</Label>
              <Select 
                value={config.transformation} 
                onValueChange={(value: any) => updateConfig({ transformation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="log">Logarítmica</SelectItem>
                  <SelectItem value="sqrt">Raiz Quadrada</SelectItem>
                  <SelectItem value="difference">Diferenciação</SelectItem>
                  <SelectItem value="boxcox">Box-Cox</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tratamento de Valores Ausentes */}
            <div className="space-y-2">
              <Label>Valores Ausentes</Label>
              <Select 
                value={config.missingValueHandling} 
                onValueChange={(value: any) => updateConfig({ missingValueHandling: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drop">Remover linhas</SelectItem>
                  <SelectItem value="interpolate">Interpolação linear</SelectItem>
                  <SelectItem value="forward_fill">Preenchimento para frente</SelectItem>
                  <SelectItem value="backward_fill">Preenchimento para trás</SelectItem>
                  <SelectItem value="mean">Média</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Reset */}
            <div className="space-y-2 flex flex-col justify-end">
              <Button onClick={handleReset} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Restaurar Padrões
              </Button>
            </div>
          </div>

          {/* Configurações Avançadas - Em linha horizontal */}
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detecção de Outliers */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="outlier-detection"
                    checked={config.outlierDetection}
                    onCheckedChange={(checked) => updateConfig({ outlierDetection: checked })}
                  />
                  <Label htmlFor="outlier-detection">Detectar e tratar outliers</Label>
                </div>
                
                {config.outlierDetection && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Método</Label>
                      <Select 
                        value={config.outlierMethod} 
                        onValueChange={(value: any) => updateConfig({ outlierMethod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iqr">IQR (Quartis)</SelectItem>
                          <SelectItem value="zscore">Z-Score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Threshold: {config.outlierThreshold}</Label>
                      <Slider
                        value={[config.outlierThreshold]}
                        onValueChange={([value]) => updateConfig({ outlierThreshold: value })}
                        min={1}
                        max={4}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Suavização */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smoothing"
                    checked={config.smoothing}
                    onCheckedChange={(checked) => updateConfig({ smoothing: checked })}
                  />
                  <Label htmlFor="smoothing">Aplicar suavização</Label>
                </div>
                
                {config.smoothing && (
                  <div className="space-y-2">
                    <Label className="text-sm">Janela de suavização: {config.smoothingWindow}</Label>
                    <Slider
                      value={[config.smoothingWindow]}
                      onValueChange={([value]) => updateConfig({ smoothingWindow: value })}
                      min={3}
                      max={15}
                      step={2}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização Comparativa - Melhor aproveitamento do espaço */}
      {preview && showPreview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Comparação: Antes vs Depois
            </CardTitle>
            <CardDescription>
              Séries temporais mostrando o impacto do pré-processamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Dois gráficos de séries temporais lado a lado - Maior */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gráfico ANTES (Dados Originais) */}
                <div className="space-y-2">
                  <h4 className="font-medium text-red-700 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    ANTES - Dados Originais
                  </h4>
                  <div className="border rounded-lg p-2 bg-red-50/30">
                    <Plot
                      data={[
                        {
                          x: Array.from({ length: preview.original.length }, (_, i) => i),
                          y: preview.original,
                          type: 'scatter',
                          mode: 'lines+markers',
                          name: 'Dados Originais',
                          line: { color: '#ef4444', width: 2 },
                          marker: { size: 3, color: '#ef4444' },
                          connectgaps: true
                        }
                      ]}
                      layout={{
                        title: {
                          text: 'Série Temporal Original',
                          font: { size: 14, color: '#dc2626' }
                        },
                        xaxis: { 
                          title: 'Índice de Tempo',
                          gridcolor: '#fee2e2',
                          titlefont: { size: 11 }
                        },
                        yaxis: { 
                          title: 'Valor',
                          gridcolor: '#fee2e2',
                          titlefont: { size: 11 }
                        },
                        height: 350,
                        margin: { l: 60, r: 20, t: 50, b: 50 },
                        showlegend: false,
                        font: { size: 10 },
                        plot_bgcolor: '#fffbfb',
                        paper_bgcolor: 'rgba(0,0,0,0)'
                      }}
                      config={{ responsive: true, displayModeBar: false }}
                      style={{ width: '100%' }}
                    />
                    
                    {/* Estatísticas do ANTES - Compactas */}
                    <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                      <div className="bg-white/80 p-1.5 rounded border border-red-200 text-center">
                        <div className="font-medium text-red-700">Média</div>
                        <div className="text-red-600">{preview.statistics.original.mean.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-red-200 text-center">
                        <div className="font-medium text-red-700">Desvio</div>
                        <div className="text-red-600">{preview.statistics.original.std.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-red-200 text-center">
                        <div className="font-medium text-red-700">Min</div>
                        <div className="text-red-600">{preview.statistics.original.min.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-red-200 text-center">
                        <div className="font-medium text-red-700">Max</div>
                        <div className="text-red-600">{preview.statistics.original.max.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico DEPOIS (Dados Processados) */}
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-700 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    DEPOIS - Dados Processados
                  </h4>
                  <div className="border rounded-lg p-2 bg-blue-50/30">
                    <Plot
                      data={[
                        {
                          x: Array.from({ length: preview.processed.length }, (_, i) => i),
                          y: preview.processed,
                          type: 'scatter',
                          mode: 'lines+markers',
                          name: 'Dados Processados',
                          line: { color: '#3b82f6', width: 2 },
                          marker: { size: 3, color: '#3b82f6' },
                          connectgaps: true
                        }
                      ]}
                      layout={{
                        title: {
                          text: 'Série Temporal Processada',
                          font: { size: 14, color: '#2563eb' }
                        },
                        xaxis: { 
                          title: 'Índice de Tempo',
                          gridcolor: '#dbeafe',
                          titlefont: { size: 11 }
                        },
                        yaxis: { 
                          title: 'Valor',
                          gridcolor: '#dbeafe',
                          titlefont: { size: 11 }
                        },
                        height: 350,
                        margin: { l: 60, r: 20, t: 50, b: 50 },
                        showlegend: false,
                        font: { size: 10 },
                        plot_bgcolor: '#f8fafc',
                        paper_bgcolor: 'rgba(0,0,0,0)'
                      }}
                      config={{ responsive: true, displayModeBar: false }}
                      style={{ width: '100%' }}
                    />
                    
                    {/* Estatísticas do DEPOIS - Compactas */}
                    <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                      <div className="bg-white/80 p-1.5 rounded border border-blue-200 text-center">
                        <div className="font-medium text-blue-700">Média</div>
                        <div className="text-blue-600">{preview.statistics.processed.mean.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-blue-200 text-center">
                        <div className="font-medium text-blue-700">Desvio</div>
                        <div className="text-blue-600">{preview.statistics.processed.std.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-blue-200 text-center">
                        <div className="font-medium text-blue-700">Min</div>
                        <div className="text-blue-600">{preview.statistics.processed.min.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-blue-200 text-center">
                        <div className="font-medium text-blue-700">Max</div>
                        <div className="text-blue-600">{preview.statistics.processed.max.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráficos de Distribuição - Mais compactos */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Comparação de Distribuições
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="bg-red-50/50 p-2 rounded-lg border border-red-200">
                    <Plot
                      data={[
                        {
                          x: preview.original,
                          type: 'histogram',
                          nbinsx: 25,
                          name: 'Original',
                          marker: { 
                            color: 'rgba(239, 68, 68, 0.8)',
                            line: { color: '#dc2626', width: 1 }
                          }
                        }
                      ]}
                      layout={{
                        title: { 
                          text: 'Distribuição Original', 
                          font: { size: 13, color: '#dc2626' }
                        },
                        height: 200,
                        margin: { l: 50, r: 20, t: 40, b: 40 },
                        xaxis: { 
                          title: { text: 'Valor', font: { size: 10 } },
                          gridcolor: '#fee2e2'
                        },
                        yaxis: { 
                          title: { text: 'Frequência', font: { size: 10 } },
                          gridcolor: '#fee2e2'
                        },
                        showlegend: false,
                        font: { size: 9 },
                        plot_bgcolor: '#fffbfb',
                        paper_bgcolor: 'rgba(0,0,0,0)'
                      }}
                      config={{ responsive: true, displayModeBar: false }}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-200">
                    <Plot
                      data={[
                        {
                          x: preview.processed,
                          type: 'histogram',
                          nbinsx: 25,
                          name: 'Processado',
                          marker: { 
                            color: 'rgba(59, 130, 246, 0.8)',
                            line: { color: '#2563eb', width: 1 }
                          }
                        }
                      ]}
                      layout={{
                        title: { 
                          text: 'Distribuição Processada', 
                          font: { size: 13, color: '#2563eb' }
                        },
                        height: 200,
                        margin: { l: 50, r: 20, t: 40, b: 40 },
                        xaxis: { 
                          title: { text: 'Valor', font: { size: 10 } },
                          gridcolor: '#dbeafe'
                        },
                        yaxis: { 
                          title: { text: 'Frequência', font: { size: 10 } },
                          gridcolor: '#dbeafe'
                        },
                        showlegend: false,
                        font: { size: 9 },
                        plot_bgcolor: '#f8fafc',
                        paper_bgcolor: 'rgba(0,0,0,0)'
                      }}
                      config={{ responsive: true, displayModeBar: false }}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataPreprocessing;
