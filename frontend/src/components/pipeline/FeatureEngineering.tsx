import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { Zap, Calendar, Check, TrendingUp, BarChart3, Eye, Settings } from 'lucide-react';

interface FeatureConfig {
  // Séries selecionadas para entrada
  inputSeries: string[];
  useAllInputSeries: boolean;
  
  // Série(s) a prever
  targetSeries: string[];
  predictAllSeries: boolean;
  
  // Horizonte de previsão
  forecastHorizon: number;
  
  // Parâmetros básicos
  inputWindowSize: number;
  windowSizeMethod: 'acf' | 'mutual_info' | 'custom';
}

const FeatureEngineering = () => {
  const { pipelineData, updatePipelineData, completeStep, updateStepData, completeStepRemote } = usePipeline();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<FeatureConfig>({
    inputSeries: [],
    useAllInputSeries: false,
    targetSeries: [],
    predictAllSeries: false,
    forecastHorizon: 15,
    inputWindowSize: 35,
    windowSizeMethod: 'acf',
  });

  // Obter colunas numéricas disponíveis
  const availableSeries = useMemo(() => {
    if (!pipelineData.columns || !pipelineData.data) return [];
    
    return pipelineData.columns.filter(col => {
      if (col === pipelineData.dateColumn) return false;
      
      // Verificar se é numérica
      const values = pipelineData.data!.slice(0, 100).map(row => row[col]);
      const numericCount = values.filter(v => !isNaN(Number(v))).length;
      return numericCount / values.length > 0.8;
    });
  }, [pipelineData.columns, pipelineData.data, pipelineData.dateColumn]);

  // Funções de pré-processamento (replicadas do DataPreprocessing.tsx)
  const calculateStats = (values: number[]) => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { mean, std, min, max };
  };

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

  const applyTransformation = (values: number[], method: string): number[] => {
    switch (method) {
      case 'log':
        return values.map(v => v > 0 ? Math.log(v) : 0);
      case 'sqrt':
        return values.map(v => v >= 0 ? Math.sqrt(v) : 0);
      case 'difference':
        return values.map((v, i) => i > 0 ? v - values[i - 1] : 0);
      case 'boxcox':
        // Implementação simplificada do Box-Cox (lambda = 0.5)
        return values.map(v => v > 0 ? (Math.pow(v, 0.5) - 1) / 0.5 : 0);
      default:
        return values;
    }
  };

  const detectOutliers = (values: number[], method: string, threshold: number): number[] => {
    const outliers: number[] = [];
    
    if (method === 'iqr') {
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - threshold * iqr;
      const upperBound = q3 + threshold * iqr;
      
      values.forEach((value, index) => {
        if (value < lowerBound || value > upperBound) {
          outliers.push(index);
        }
      });
    } else if (method === 'zscore') {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      
      values.forEach((value, index) => {
        const zScore = Math.abs((value - mean) / std);
        if (zScore > threshold) {
          outliers.push(index);
        }
      });
    }
    
    return outliers;
  };

  const applySmoothing = (values: number[], window: number): number[] => {
    if (window <= 1) return values;
    
    return values.map((_, index) => {
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(values.length, index + Math.ceil(window / 2));
      const windowValues = values.slice(start, end);
      return windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
    });
  };

  // Aplicar pré-processamento aos dados usando a configuração salva
  const applyPreprocessingToData = useMemo(() => {
    if (!pipelineData.data || !pipelineData.preprocessingConfig) {
      return pipelineData.data || [];
    }

    const config = pipelineData.preprocessingConfig;
    const processedData = pipelineData.data.map(row => ({ ...row }));

    // Aplicar pré-processamento a todas as colunas numéricas
    availableSeries.forEach(column => {
      const originalValues = pipelineData.data!
        .map(row => Number(row[column]))
        .filter(v => !isNaN(v));

      if (originalValues.length === 0) return;

      let processedValues = [...originalValues];

      try {
        // Aplicar transformação primeiro
        if (config.transformation && config.transformation !== 'none') {
          processedValues = applyTransformation(processedValues, config.transformation);
        }

        // Detectar e tratar outliers
        if (config.outlierDetection) {
          const outlierIndices = detectOutliers(processedValues, config.outlierMethod || 'iqr', config.outlierThreshold || 1.5);
          outlierIndices.forEach(index => {
            const prev = index > 0 ? processedValues[index - 1] : processedValues[index + 1] || 0;
            const next = index < processedValues.length - 1 ? processedValues[index + 1] : processedValues[index - 1] || 0;
            processedValues[index] = (prev + next) / 2;
          });
        }

        // Aplicar suavização
        if (config.smoothing) {
          processedValues = applySmoothing(processedValues, config.smoothingWindow || 5);
        }

        // Aplicar normalização por último
        if (config.normalization && config.normalization !== 'none') {
          processedValues = applyNormalization(processedValues, config.normalization);
        }

        // Atualizar os dados processados
        processedValues.forEach((value, index) => {
          if (index < processedData.length) {
            processedData[index][column] = value;
          }
        });
      } catch (error) {
        console.error(`Erro ao processar coluna ${column}:`, error);
      }
    });

    return processedData;
  }, [pipelineData.data, pipelineData.preprocessingConfig, availableSeries]);

  // Gerar dados para visualização usando dados reais
  const generateVisualizationData = useMemo(() => {
    // Usar dados preprocessados aplicados se há configuração de pré-processamento, senão usar dados originais
    const dataToUse = pipelineData.preprocessingConfig 
      ? applyPreprocessingToData 
      : pipelineData.data;
    
    if (!dataToUse || !pipelineData.columns || dataToUse.length === 0) {
      return [];
    }

    const totalPoints = dataToUse.length;
    const data = [];
    
    // Mostrar apenas janela de entrada + horizonte de previsão
    const startIndex = Math.max(0, totalPoints - config.inputWindowSize);
    const endIndex = totalPoints + config.forecastHorizon;
    
    for (let i = startIndex; i < endIndex; i++) {
      const point: any = {
        index: i - startIndex, // Reindexar para começar do 0
        originalIndex: i, // Manter índice original para referência
        time: i < totalPoints && pipelineData.dateColumn 
          ? dataToUse[i][pipelineData.dateColumn] 
          : `T${i}`,
        isHistorical: i < totalPoints,
        isForecast: i >= totalPoints,
        isInputWindow: i >= totalPoints - config.inputWindowSize && i < totalPoints,
        isTraining: i < Math.floor(totalPoints * 70 / 100),
        isValidation: i >= Math.floor(totalPoints * 70 / 100) && 
                     i < Math.floor(totalPoints * (70 + 15) / 100),
        isTest: i >= Math.floor(totalPoints * (70 + 15) / 100) && i < totalPoints
      };

      // Usar valores reais para dados históricos
      const seriesToShow = config.inputSeries.length > 0 ? config.inputSeries : availableSeries;

      seriesToShow.forEach((series) => {
        if (series && i < totalPoints) {
          // Usar dados preprocessados aplicados
          const realValue = dataToUse[i][series];
          
          point[series] = realValue !== null && realValue !== undefined && realValue !== '' 
            ? Number(realValue) 
            : null;
        } else if (series && i >= totalPoints) {
          // Para pontos futuros, usar null (serão previstos)
          point[series] = null;
        }
        
        // Adicionar valores previstos simulados para séries alvo
        if (series && (config.targetSeries.includes(series) || config.predictAllSeries) && i >= totalPoints) {
          // Simular previsão baseada nos últimos valores reais da janela
          const windowData = dataToUse.slice(totalPoints - config.inputWindowSize, totalPoints);
          const lastValues = windowData.map(row => Number(row[series])).filter(v => !isNaN(v));
          if (lastValues.length > 0) {
            const avgLast = lastValues.reduce((a, b) => a + b, 0) / lastValues.length;
            const trend = lastValues.length > 1 ? (lastValues[lastValues.length - 1] - lastValues[0]) / lastValues.length : 0;
            const futureStep = i - totalPoints + 1;
            
            // Simular previsão com tendência e um pouco de ruído
            point[`${series}_forecast`] = avgLast + (trend * futureStep) + (Math.random() - 0.5) * avgLast * 0.1;
          }
        }
      });

      data.push(point);
    }
    
    return data;
  }, [config, availableSeries, pipelineData.data, pipelineData.preprocessingConfig, pipelineData.columns, pipelineData.dateColumn, applyPreprocessingToData]);

  // Cores para as séries
  const seriesColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
  ];

  // Inicializar séries se ainda não foram definidas
  React.useEffect(() => {
    if (availableSeries.length > 0 && config.inputSeries.length === 0) {
      setConfig(prev => ({
        ...prev,
        inputSeries: [pipelineData.targetColumn || availableSeries[0]],
        targetSeries: [pipelineData.targetColumn || availableSeries[0]]
      }));
    }
  }, [availableSeries, config.inputSeries.length, pipelineData.targetColumn]);

  const handleInputSeriesChange = (series: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      inputSeries: checked 
        ? [...prev.inputSeries, series]
        : prev.inputSeries.filter(s => s !== series)
    }));
  };

  const handleTargetSeriesChange = (series: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      targetSeries: checked 
        ? [...prev.targetSeries, series]
        : prev.targetSeries.filter(s => s !== series)
    }));
  };

  const getVisualizationData = () => {
    // Usar dados preprocessados aplicados se há configuração de pré-processamento, senão usar dados originais
    const dataToUse = pipelineData.preprocessingConfig 
      ? applyPreprocessingToData 
      : pipelineData.data;
       
    const totalPoints = dataToUse?.length || 100;
    
    // Usar divisões padrão
    const trainSplit = 70;
    const validationSplit = 15;
    const testSplit = 15;
    
    const trainEnd = Math.floor(totalPoints * trainSplit / 100);
    const validEnd = trainEnd + Math.floor(totalPoints * validationSplit / 100);
    
    return {
      train: { start: 0, end: trainEnd },
      validation: { start: trainEnd, end: validEnd },
      test: { start: validEnd, end: totalPoints },
      windowSize: Math.floor(totalPoints * config.inputWindowSize / 100),
      horizon: Math.floor(totalPoints * config.forecastHorizon / 100),
      totalPoints,
      usingProcessedData: !!(pipelineData.preprocessingConfig),
      trainSplit,
      validationSplit,
      testSplit
    };
  };

  const handleContinue = async () => {
    // Validações
    if (config.inputSeries.length === 0) {
      toast({
        title: "Erro de configuração",
        description: "Selecione pelo menos uma série de entrada",
        variant: "destructive"
      });
      return;
    }

    if (config.targetSeries.length === 0 && !config.predictAllSeries) {
      toast({
        title: "Erro de configuração", 
        description: "Selecione pelo menos uma série para prever",
        variant: "destructive"
      });
      return;
    }

    try {
      // Salvar configuração localmente
      updatePipelineData({ 
        features: config.inputSeries.map(s => `feature_${s}`)
      });

      // Enviar dados para a API se há pipeline ID
      if (pipelineData.pipelineId) {
        const stepData = {
          selected_features: config.inputSeries,
          feature_engineering: {
            input_series: config.inputSeries,
            target_series: config.targetSeries,
            use_all_input_series: config.useAllInputSeries,
            predict_all_series: config.predictAllSeries,
            window_size_method: config.windowSizeMethod
          },
          input_window_size: config.inputWindowSize,
          forecast_horizon: config.forecastHorizon,
          feature_selection_method: "correlation",
          feature_importance: {},
          feature_correlations: {},
          lag_features: [1, 7, 30],
          rolling_features: [
            { window: 7, operation: 'mean' },
            { window: 14, operation: 'std' },
            { window: 30, operation: 'mean' }
          ]
        };

        await updateStepData('features', stepData);
        await completeStepRemote('features');
      }
      
      completeStep('features');
      
      toast({
        title: "Configuração salva!",
        description: "Engenharia de atributos configurada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar engenharia de features:', error);
      toast({
        title: "Erro de configuração",
        description: "Erro ao salvar configurações de features",
        variant: "destructive"
      });
    }
  };

  const vizData = getVisualizationData();

  // Funções para cálculo automático da janela
  const calculateACFWindowSize = (data: any[], series: string[]): number => {
    if (!data || data.length === 0 || series.length === 0) return 35;
    
    try {
      // Usar a primeira série disponível para calcular ACF
      const targetSeries = series[0];
      const values = data.map(row => Number(row[targetSeries])).filter(v => !isNaN(v));
      
      if (values.length < 10) return 35;
      
      // Calcular autocorrelação simples
      const maxLag = Math.min(Math.floor(values.length / 4), 100);
      let bestLag = 35;
      let maxCorr = 0;
      
      for (let lag = 5; lag <= maxLag; lag++) {
        let correlation = 0;
        let count = 0;
        
        for (let i = lag; i < values.length; i++) {
          correlation += values[i] * values[i - lag];
          count++;
        }
        
        if (count > 0) {
          correlation = correlation / count;
          if (Math.abs(correlation) > Math.abs(maxCorr) && lag >= 10) {
            maxCorr = correlation;
            bestLag = lag;
          }
        }
      }
      
      return Math.max(10, Math.min(bestLag, 100));
    } catch (error) {
      console.error('Erro no cálculo ACF:', error);
      return 35;
    }
  };

  const calculateMutualInfoWindowSize = (data: any[], series: string[]): number => {
    if (!data || data.length === 0 || series.length === 0) return 30;
    
    try {
      // Usar a primeira série disponível
      const targetSeries = series[0];
      const values = data.map(row => Number(row[targetSeries])).filter(v => !isNaN(v));
      
      if (values.length < 20) return 30;
      
      // Calcular informação mútua simplificada
      const maxWindow = Math.min(Math.floor(values.length / 3), 80);
      let bestWindow = 30;
      let maxMI = 0;
      
      for (let window = 10; window <= maxWindow; window += 5) {
        // Calcular variância dos valores em janelas
        let totalVariance = 0;
        let windowCount = 0;
        
        for (let i = window; i < values.length; i++) {
          const windowValues = values.slice(i - window, i);
          const mean = windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
          const variance = windowValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowValues.length;
          totalVariance += variance;
          windowCount++;
        }
        
        const avgVariance = windowCount > 0 ? totalVariance / windowCount : 0;
        
        // Usar variância como proxy para informação mútua
        if (avgVariance > maxMI && window >= 15) {
          maxMI = avgVariance;
          bestWindow = window;
        }
      }
      
      return Math.max(15, Math.min(bestWindow, 80));
    } catch (error) {
      console.error('Erro no cálculo de Informação Mútua:', error);
      return 30;
    }
  };

  // Atualizar tamanho da janela quando método muda
  React.useEffect(() => {
    if (config.windowSizeMethod !== 'custom' && pipelineData.data && config.inputSeries.length > 0) {
      const dataToUse = pipelineData.preprocessingConfig 
        ? applyPreprocessingToData 
        : pipelineData.data;
      
      let newWindowSize = 35;
      
      if (config.windowSizeMethod === 'acf') {
        newWindowSize = calculateACFWindowSize(dataToUse, config.inputSeries);
      } else if (config.windowSizeMethod === 'mutual_info') {
        newWindowSize = calculateMutualInfoWindowSize(dataToUse, config.inputSeries);
      }
      
      setConfig(prev => ({
        ...prev,
        inputWindowSize: newWindowSize
      }));
    }
  }, [config.windowSizeMethod, config.inputSeries, pipelineData.data, pipelineData.preprocessingConfig, applyPreprocessingToData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
            <div>
          <h2 className="text-2xl font-bold">Engenharia de Atributos</h2>
          <p className="text-muted-foreground">
            Configure os parâmetros para treinamento de séries temporais
              </p>
            </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleContinue}>
            <Check className="w-4 h-4 mr-2" />
            Continuar para Configuração do Modelo
              </Button>
            </div>
          </div>

      {/* Configurações em Grid Compacto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seleção de Séries de Entrada */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-4 h-4" />
              Séries de Entrada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-all-input"
                  checked={config.useAllInputSeries}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      useAllInputSeries: checked as boolean,
                      inputSeries: checked ? availableSeries : prev.inputSeries
                    }))
                  }
                />
                <Label htmlFor="use-all-input" className="font-medium text-sm">
                  Usar todas as séries como entrada
                </Label>
            </div>
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium whitespace-nowrap">
                  Janela:
                </Label>
                <Select
                  value={config.windowSizeMethod}
                  onValueChange={(value: 'acf' | 'mutual_info' | 'custom') => 
                    setConfig(prev => ({ ...prev, windowSizeMethod: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acf">ACF</SelectItem>
                    <SelectItem value="mutual_info">Info. Mútua</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {config.windowSizeMethod === 'custom' ? (
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={config.inputWindowSize}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev,
                      inputWindowSize: parseInt(e.target.value) || 30 
                    }))}
                    className="w-16"
                    placeholder="35"
                  />
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {config.inputWindowSize}
                </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Séries Específicas</Label>
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {availableSeries.map(series => (
                  <div key={series} className="flex items-center space-x-2">
                    <Checkbox
                      id={`input-${series}`}
                      checked={config.inputSeries.includes(series)}
                      onCheckedChange={(checked) => 
                        handleInputSeriesChange(series, checked as boolean)
                      }
                      disabled={config.useAllInputSeries}
                    />
                    <Label 
                      htmlFor={`input-${series}`} 
                      className={`text-xs ${config.useAllInputSeries ? 'text-gray-500' : ''}`}
                    >
                      {series}
                    </Label>
            </div>
                ))}
          </div>
            </div>
          </CardContent>
        </Card>

        {/* Seleção de Séries a Prever */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-4 h-4" />
              Séries a Prever
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                  <Checkbox
                  id="predict-all"
                  checked={config.predictAllSeries}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                      predictAllSeries: checked as boolean,
                      targetSeries: checked ? availableSeries : prev.targetSeries
                      }))
                    }
                  />
                <Label htmlFor="predict-all" className="font-medium text-sm">
                  Prever todas as séries do conjunto
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="horizon" className="text-sm font-medium whitespace-nowrap">
                  Passos no Futuro
                </Label>
                <Input
                  id="horizon"
                  type="number"
                  min="1"
                  max="365"
                  value={config.forecastHorizon}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    forecastHorizon: parseInt(e.target.value) || 1 
                  }))}
                  className="w-20"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Séries Específicas</Label>
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {availableSeries.map(series => (
                  <div key={series} className="flex items-center space-x-2">
                    <Checkbox
                      id={`target-${series}`}
                      checked={config.targetSeries.includes(series)}
                      onCheckedChange={(checked) =>
                        handleTargetSeriesChange(series, checked as boolean)
                      }
                      disabled={config.predictAllSeries}
                    />
                    <Label 
                      htmlFor={`target-${series}`} 
                      className={`text-xs ${config.predictAllSeries ? 'text-gray-500' : ''}`}
                    >
                      {series}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Visualização Gráfica Dinâmica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Visualização da Configuração
            {vizData.usingProcessedData && (
              <Badge variant="secondary" className="ml-2">
                <Settings className="w-3 h-3 mr-1" />
                Dados Preprocessados
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {vizData.usingProcessedData 
              ? "Visualização usando dados preprocessados da etapa anterior"
              : "Janela de entrada e horizonte de previsão configurados"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!pipelineData.data || pipelineData.data.length === 0) ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum dado carregado</p>
                <p className="text-sm">Faça upload de um arquivo CSV para ver a visualização</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Legenda */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                  <span>Janela de Entrada ({config.inputWindowSize} pontos)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
                  <span>Horizonte de Previsão ({config.forecastHorizon} pontos)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Dados Históricos (Linha Sólida)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded" style={{ borderStyle: 'dashed', borderWidth: '2px' }}></div>
                  <span>Previsões (Linha Tracejada)</span>
                </div>
              </div>

              {/* Gráfico Principal */}
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateVisualizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="index" 
                      domain={[0, config.inputWindowSize + config.forecastHorizon]}
                      type="number"
                      scale="linear"
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `Ponto ${value}`}
                      formatter={(value: any, name: string) => [
                        typeof value === 'number' ? value.toFixed(2) : 'N/A', 
                        name.includes('_forecast') ? `${name.replace('_forecast', '')} (Previsão)` : name
                      ]}
                    />
                    <Legend />
                    
                    {/* Janela de Entrada */}
                    <ReferenceArea
                      x1={0}
                      x2={config.inputWindowSize}
                      fill="#10b981"
                      fillOpacity={0.1}
                      label={{ value: "Janela de Entrada", position: "top" }}
                    />
                    
                    {/* Horizonte de Previsão */}
                    <ReferenceArea
                      x1={config.inputWindowSize}
                      x2={config.inputWindowSize + config.forecastHorizon}
                      fill="#ef4444"
                      fillOpacity={0.1}
                      label={{ value: "Horizonte de Previsão", position: "top" }}
                    />
                    
                    {/* Linha divisória entre histórico e previsão */}
                    <ReferenceLine x={config.inputWindowSize} stroke="#000" strokeDasharray="2 2" />
                    
                    {/* Séries Históricas */}
                    {config.inputSeries.filter(Boolean).map((series, idx) => (
                      <Line
                        key={series}
                        type="monotone"
                        dataKey={series}
                        stroke={seriesColors[idx % seriesColors.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        name={series}
                      />
                    ))}
                    
                    {/* Séries de Previsão */}
                    {(config.predictAllSeries ? availableSeries : config.targetSeries)
                      .filter(series => config.inputSeries.includes(series))
                      .map((series, idx) => (
                      <Line
                        key={`${series}_forecast`}
                        type="monotone"
                        dataKey={`${series}_forecast`}
                        stroke={seriesColors[idx % seriesColors.length]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                        name={`${series} (Previsão)`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Informações da Configuração Atual */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{config.inputWindowSize}</div>
                  <div className="text-xs text-green-700">Janela de Entrada</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{config.forecastHorizon}</div>
                  <div className="text-xs text-red-700">Pontos a Prever</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {config.inputSeries.length}
                  </div>
                  <div className="text-xs text-purple-700">Séries Ativas</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{config.inputWindowSize + config.forecastHorizon}</div>
                  <div className="text-xs text-blue-700">Total de Pontos</div>
            </div>
              </div>

              {/* Informações de Pré-processamento */}
              {vizData.usingProcessedData && pipelineData.preprocessingConfig && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Pré-processamento Aplicado
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {pipelineData.preprocessingConfig.normalization && pipelineData.preprocessingConfig.normalization !== 'none' && (
                      <div className="text-blue-700">
                        <strong>Normalização:</strong> {pipelineData.preprocessingConfig.normalization}
                      </div>
                    )}
                    {pipelineData.preprocessingConfig.transformation && pipelineData.preprocessingConfig.transformation !== 'none' && (
                      <div className="text-blue-700">
                        <strong>Transformação:</strong> {pipelineData.preprocessingConfig.transformation}
                      </div>
                    )}
                    {pipelineData.preprocessingConfig.outlierDetection && (
                      <div className="text-blue-700">
                        <strong>Outliers:</strong> Removidos ({pipelineData.preprocessingConfig.outlierMethod})
                      </div>
                    )}
                    {pipelineData.preprocessingConfig.smoothing && (
                      <div className="text-blue-700">
                        <strong>Suavização:</strong> Janela {pipelineData.preprocessingConfig.smoothingWindow}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureEngineering;
