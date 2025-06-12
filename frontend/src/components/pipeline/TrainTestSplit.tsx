import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Users, Calendar, BarChart3, RefreshCw, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import Plot from 'react-plotly.js';

interface SplitValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

const TrainTestSplit = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  
  const [useValidation, setUseValidation] = useState(true);
  const [trainSize, setTrainSize] = useState(70);
  const [validationSize, setValidationSize] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(false);

  // Calcular tamanho do teste automaticamente
  const testSize = useMemo(() => {
    return useValidation ? 100 - trainSize - validationSize : 100 - trainSize;
  }, [trainSize, validationSize, useValidation]);

  // Validação em tempo real
  const validation = useMemo((): SplitValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validações básicas
    if (trainSize < 50) {
      errors.push('Conjunto de treino muito pequeno (< 50%)');
    }
    
    if (trainSize > 85) {
      warnings.push('Conjunto de treino muito grande (> 85%)');
    }

    if (useValidation && validationSize < 10) {
      warnings.push('Conjunto de validação pequeno (< 10%)');
    }

    if (testSize < 10) {
      warnings.push('Conjunto de teste pequeno (< 10%)');
    }

    // Verificar se há dados suficientes
    const totalRows = pipelineData.data?.length || 0;
    if (totalRows < 100) {
      warnings.push(`Dataset pequeno (${totalRows} registros)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }, [trainSize, validationSize, testSize, useValidation, pipelineData.data]);

  // Auto-otimização baseada no tamanho do dataset
  useEffect(() => {
    if (autoOptimize && pipelineData.data) {
      const totalRows = pipelineData.data.length;
      
      if (totalRows < 200) {
        // Dataset pequeno: sem validação
        setUseValidation(false);
        setTrainSize(75);
      } else if (totalRows < 500) {
        // Dataset médio: validação pequena
        setUseValidation(true);
        setTrainSize(70);
        setValidationSize(10);
      } else if (totalRows < 2000) {
        // Dataset grande: configuração padrão
        setUseValidation(true);
        setTrainSize(70);
        setValidationSize(15);
      } else {
        // Dataset muito grande: mais dados para treino
        setUseValidation(true);
        setTrainSize(75);
        setValidationSize(15);
      }
      
      setAutoOptimize(false);
      toast({
        title: "Configuração otimizada!",
        description: `Divisão ajustada para dataset de ${totalRows} registros`,
      });
    }
  }, [autoOptimize, pipelineData.data, toast]);

  // Gerar dados para visualização
  const generateSplitData = useMemo(() => {
    if (!pipelineData.data || !pipelineData.targetColumn) return null;

    const data = pipelineData.data;
    const targetValues = data.map(row => Number(row[pipelineData.targetColumn])).filter(v => !isNaN(v));
    
    if (targetValues.length === 0) return null;

    // Calcular pontos de divisão
    const trainEnd = Math.floor((trainSize / 100) * targetValues.length);
    const validationEnd = useValidation ? 
      trainEnd + Math.floor((validationSize / 100) * targetValues.length) : trainEnd;

    // Preparar dados para plotagem com transições suaves
    const indices = Array.from({ length: targetValues.length }, (_, i) => i);
    
    return {
      indices,
      values: targetValues,
      trainEnd,
      validationEnd,
      splits: {
        train: targetValues.slice(0, trainEnd),
        validation: useValidation ? targetValues.slice(trainEnd, validationEnd) : [],
        test: targetValues.slice(validationEnd)
      },
      colors: {
        train: '#3b82f6',
        validation: '#eab308',
        test: '#8b5cf6'
      }
    };
  }, [pipelineData.data, pipelineData.targetColumn, trainSize, validationSize, testSize, useValidation]);

  // Estatísticas dos conjuntos
  const splitStats = useMemo(() => {
    if (!generateSplitData || !pipelineData.data) return null;

    const calculateStats = (values: number[]) => {
      if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      return {
        mean: Number(mean.toFixed(2)),
        std: Number(Math.sqrt(variance).toFixed(2)),
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    };

    return {
      train: calculateStats(generateSplitData.splits.train),
      validation: calculateStats(generateSplitData.splits.validation),
      test: calculateStats(generateSplitData.splits.test),
      totalRows: pipelineData.data.length
    };
  }, [generateSplitData, pipelineData.data]);

  const handleContinue = async () => {
    if (!validation.isValid) {
      toast({
        title: "Configuração inválida",
        description: "Corrija os erros antes de continuar",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1200));
    
      updatePipelineData({
        trainSize,
        validationSize: useValidation ? validationSize : 0,
        testSize,
        useValidation
      });

    completeStep('split');
      
      toast({
        title: "Divisão configurada!",
        description: `Treino: ${trainSize}%, Validação: ${useValidation ? validationSize : 0}%, Teste: ${testSize}%`,
      });
    } catch (error) {
      toast({
        title: "Erro na configuração",
        description: "Erro ao configurar divisão dos dados",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToDefaults = () => {
    setUseValidation(true);
    setTrainSize(70);
    setValidationSize(15);
    toast({
      title: "Configurações resetadas",
      description: "Valores restaurados para os padrões recomendados"
    });
  };

  const getValidationBadge = () => {
    if (!validation.isValid) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Erros</Badge>;
    }
    if (validation.warnings.length > 0) {
      return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Avisos</Badge>;
    }
    return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Válido</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Divisão dos Dados</h2>
          <p className="text-muted-foreground">
            Configure a divisão temporal dos dados para treino, validação e teste
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getValidationBadge()}
          <Button onClick={handleContinue} disabled={!validation.isValid || isProcessing}>
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {isProcessing ? 'Configurando...' : 'Continuar para Pré-processamento'}
          </Button>
        </div>
      </div>

      {/* Status e Validação */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((error, index) => (
            <Alert key={`error-${index}`} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ))}
          
          {validation.warnings.map((warning, index) => (
            <Alert key={`warning-${index}`}>
              <Info className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Configuração Principal */}
      <div className="grid grid-cols-5 gap-6">
        {/* Painel de Configuração - 2/5 */}
        <div className="col-span-2 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Configuração da Divisão
          </CardTitle>
          <CardDescription>
                Ajuste as proporções dos conjuntos de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
              {/* Auto-otimização */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
                  <Label className="text-sm font-medium">Otimização Automática</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Ajustar baseado no tamanho do dataset
                  </p>
                </div>
                <Button 
                  onClick={() => setAutoOptimize(true)} 
                  variant="outline" 
                  size="sm"
                  disabled={isProcessing}
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Otimizar
                </Button>
              </div>

              {/* Switch de Validação */}
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Switch
                  id="use-validation"
                  checked={useValidation}
                  onCheckedChange={setUseValidation}
                  disabled={isProcessing}
                />
                <div className="flex-1">
                  <Label htmlFor="use-validation" className="text-sm font-medium">
                    Usar conjunto de validação
              </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Recomendado para ajuste de hiperparâmetros
                  </p>
                </div>
              </div>

              {/* Sliders de Configuração */}
              <div className="space-y-4">
                {/* Treino */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-blue-700">
                      Treino: {trainSize}%
                    </Label>
                    <span className="text-xs text-gray-500">
                      {splitStats ? `${splitStats.train.count} registros` : ''}
                    </span>
                  </div>
                  <Slider
                    value={[trainSize]}
                    onValueChange={([value]) => {
                      const maxTrain = useValidation ? Math.min(85, 100 - validationSize - 10) : 90;
                      const newTrainSize = Math.min(value, maxTrain);
                      setTrainSize(newTrainSize);
                    }}
                    min={40}
                    max={useValidation ? 85 : 90}
                    step={1}
                    className="w-full"
                    disabled={isProcessing}
                  />
                  <div className="w-full h-2 bg-gray-100 rounded-full">
                    <div 
                      className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${trainSize}%` }}
                    />
                  </div>
                </div>

                {/* Validação */}
                {useValidation && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium text-yellow-700">
                        Validação: {validationSize}%
                      </Label>
                      <span className="text-xs text-gray-500">
                        {splitStats ? `${splitStats.validation.count} registros` : ''}
                      </span>
                    </div>
                    <Slider
                      value={[validationSize]}
                      onValueChange={([value]) => {
                        const maxValidation = Math.min(30, 100 - trainSize - 10);
                        const newValidationSize = Math.min(value, maxValidation);
                        setValidationSize(newValidationSize);
                      }}
                      min={5}
                      max={30}
                      step={1}
                      className="w-full"
                      disabled={isProcessing}
                    />
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div 
                        className="h-2 bg-yellow-500 rounded-full transition-all duration-300"
                        style={{ width: `${validationSize}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Teste (somente leitura) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-purple-700">
                      Teste: {testSize}% (calculado)
                    </Label>
                    <span className="text-xs text-gray-500">
                      {splitStats ? `${splitStats.test.count} registros` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full">
                    <div 
                      className="h-2 bg-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${testSize}%` }}
                    />
                  </div>
                </div>

                {/* Barra de Progresso Total */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-gray-700">
                      Total: {trainSize + (useValidation ? validationSize : 0) + testSize}%
                    </Label>
                    <span className="text-xs text-gray-500">
                      {trainSize + (useValidation ? validationSize : 0) + testSize === 100 ? '✓ Válido' : '⚠ Ajustar'}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                    <div 
                      className="h-3 bg-blue-500 transition-all duration-300"
                      style={{ width: `${trainSize}%` }}
                    />
                    {useValidation && (
                      <div 
                        className="h-3 bg-yellow-500 transition-all duration-300"
                        style={{ width: `${validationSize}%` }}
                      />
                    )}
                    <div 
                      className="h-3 bg-purple-500 transition-all duration-300"
                      style={{ width: `${testSize}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Resumo dos Conjuntos */}
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded text-sm">
                  <span className="font-medium text-blue-700">Treino</span>
                  <span className="text-blue-600">{trainSize}%</span>
                </div>
                {useValidation && (
                  <div className="flex justify-between items-center py-2 px-3 bg-yellow-50 rounded text-sm">
                    <span className="font-medium text-yellow-700">Validação</span>
                    <span className="text-yellow-600">{validationSize}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 px-3 bg-purple-50 rounded text-sm">
                  <span className="font-medium text-purple-700">Teste</span>
                  <span className="text-purple-600">{testSize}%</span>
            </div>
          </div>

              {/* Botão Reset */}
              <Button 
                onClick={resetToDefaults} 
                variant="outline" 
                className="w-full"
                disabled={isProcessing}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restaurar Padrões
          </Button>
        </CardContent>
      </Card>
        </div>

        {/* Painel de Visualização - 3/5 */}
        <div className="col-span-3 space-y-4">
          {/* Estatísticas dos Conjuntos */}
          {splitStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Estatísticas dos Conjuntos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-700 mb-1">Treino</div>
                    <div className="text-lg font-bold text-blue-600">{splitStats.train.count}</div>
                    <div className="text-xs text-gray-600">registros</div>
                    <div className="text-xs text-gray-500 mt-1">
                      μ: {splitStats.train.mean} | σ: {splitStats.train.std}
                    </div>
                  </div>
                  {useValidation && (
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm font-medium text-yellow-700 mb-1">Validação</div>
                      <div className="text-lg font-bold text-yellow-600">{splitStats.validation.count}</div>
                      <div className="text-xs text-gray-600">registros</div>
                      <div className="text-xs text-gray-500 mt-1">
                        μ: {splitStats.validation.mean} | σ: {splitStats.validation.std}
                      </div>
                    </div>
                  )}
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm font-medium text-purple-700 mb-1">Teste</div>
                    <div className="text-lg font-bold text-purple-600">{splitStats.test.count}</div>
                    <div className="text-xs text-gray-600">registros</div>
                    <div className="text-xs text-gray-500 mt-1">
                      μ: {splitStats.test.mean} | σ: {splitStats.test.std}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

      {/* Visualização da Divisão */}
          {generateSplitData && (
      <Card>
        <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Visualização da Divisão Temporal
                </CardTitle>
          <CardDescription>
                  Distribuição dos dados ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
                <div className="h-96">
                  <Plot
                    data={[
                      // Linha completa de referência
                      {
                        x: generateSplitData.indices,
                        y: generateSplitData.values,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Dados Completos',
                        line: { 
                          color: '#e5e7eb', 
                          width: 1,
                          dash: 'dot'
                        },
                        showlegend: true,
                        hovertemplate: 'Índice: %{x}<br>Valor: %{y:.2f}<extra></extra>'
                      },
                      // Linha de treino
                      {
                        x: generateSplitData.indices.slice(0, generateSplitData.trainEnd),
                        y: generateSplitData.values.slice(0, generateSplitData.trainEnd),
                        type: 'scatter',
                        mode: 'lines',
                        name: `Treino (${trainSize}%)`,
                        line: { 
                          color: generateSplitData.colors.train, 
                          width: 3
                        },
                        hovertemplate: 'Treino<br>Índice: %{x}<br>Valor: %{y:.2f}<extra></extra>'
                      },
                      // Linha de validação (se ativa)
                      ...(useValidation ? [{
                        x: generateSplitData.indices.slice(generateSplitData.trainEnd, generateSplitData.validationEnd),
                        y: generateSplitData.values.slice(generateSplitData.trainEnd, generateSplitData.validationEnd),
                        type: 'scatter' as const,
                        mode: 'lines' as const,
                        name: `Validação (${validationSize}%)`,
                        line: { 
                          color: generateSplitData.colors.validation, 
                          width: 3
                        },
                        hovertemplate: 'Validação<br>Índice: %{x}<br>Valor: %{y:.2f}<extra></extra>'
                      }] : []),
                      // Linha de teste
                      {
                        x: generateSplitData.indices.slice(generateSplitData.validationEnd),
                        y: generateSplitData.values.slice(generateSplitData.validationEnd),
                        type: 'scatter',
                        mode: 'lines',
                        name: `Teste (${testSize}%)`,
                        line: { 
                          color: generateSplitData.colors.test, 
                          width: 3
                        },
                        hovertemplate: 'Teste<br>Índice: %{x}<br>Valor: %{y:.2f}<extra></extra>'
                      }
                    ]}
                    layout={{
                      title: {
                        text: `Divisão Temporal - ${pipelineData.targetColumn}`,
                        font: { size: 14 }
                      },
                      xaxis: { 
                        title: 'Índice Temporal',
                        showgrid: true,
                        gridcolor: '#f3f4f6'
                      },
                      yaxis: { 
                        title: 'Valor',
                        showgrid: true,
                        gridcolor: '#f3f4f6'
                      },
                      height: 350,
                      margin: { l: 60, r: 40, t: 50, b: 60 },
                      legend: { 
                        x: 0, 
                        y: 1,
                        bgcolor: 'rgba(255,255,255,0.8)'
                      },
                      hovermode: 'x unified',
                      showlegend: true,
                      plot_bgcolor: 'white',
                      font: { size: 11 },
                      // Adicionar linhas verticais para marcar divisões
                      shapes: [
                        {
                          type: 'line',
                          x0: generateSplitData.trainEnd,
                          x1: generateSplitData.trainEnd,
                          y0: 0,
                          y1: 1,
                          yref: 'paper',
                          line: { color: generateSplitData.colors.train, width: 2, dash: 'dash' }
                        },
                        ...(useValidation ? [{
                          type: 'line' as const,
                          x0: generateSplitData.validationEnd,
                          x1: generateSplitData.validationEnd,
                          y0: 0,
                          y1: 1,
                          yref: 'paper' as const,
                          line: { color: generateSplitData.colors.validation, width: 2, dash: 'dash' }
                        }] : [])
                      ]
                    }}
                    config={{ 
                      responsive: true, 
                      displayModeBar: true,
                      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                      displaylogo: false
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
          </div>
        </CardContent>
      </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainTestSplit;
