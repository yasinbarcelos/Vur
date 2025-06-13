import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle, 
  Download, 
  TrendingUp, 
  Check, 
  Database,
  FileText,
  Settings,
  Target,
  Zap,
  Brain,
  Layers,
  Clock,
  BarChart3,
  Users,
  Filter,
  Cpu,
  Info,
  Activity,
  Save,
  Upload
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

const ModelTraining = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  const [isTraining, setIsTraining] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);
  const [pipelineCreated, setPipelineCreated] = useState(false);
  const [createdPipelineId, setCreatedPipelineId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    rmse: 0,
    mae: 0,
    mape: 0,
    r2: 0
  });

  // Dados simulados para o gráfico
  const predictionData = [
    { date: '2024-01', real: 100, predicted: 98 },
    { date: '2024-02', real: 120, predicted: 118 },
    { date: '2024-03', real: 95, predicted: 97 },
    { date: '2024-04', real: 150, predicted: 145 },
    { date: '2024-05', real: 110, predicted: 112 },
    { date: '2024-06', real: 130, predicted: 128 }
  ];

  // Função para obter nome do algoritmo
  const getAlgorithmName = (algorithm: string) => {
    const algorithms: { [key: string]: string } = {
      'arima': 'ARIMA',
      'sarima': 'SARIMA',
      'exponential_smoothing': 'Exponential Smoothing',
      'prophet': 'Prophet',
      'random_forest': 'Random Forest',
      'xgboost': 'XGBoost',
      'svr': 'Support Vector Regression',
      'linear_regression': 'Regressão Linear',
      'lstm': 'LSTM',
      'gru': 'GRU',
      'transformer': 'Transformer',
      'custom': 'Modelo Personalizado'
    };
    return algorithms[algorithm] || algorithm;
  };

  // Função para obter categoria do algoritmo
  const getAlgorithmCategory = (algorithm: string) => {
    const classical = ['arima', 'sarima', 'exponential_smoothing', 'prophet'];
    const ml = ['random_forest', 'xgboost', 'svr', 'linear_regression'];
    const dl = ['lstm', 'gru', 'transformer', 'custom'];
    
    if (classical.includes(algorithm)) return { name: 'Clássico', color: 'bg-blue-100 text-blue-800' };
    if (ml.includes(algorithm)) return { name: 'Machine Learning', color: 'bg-green-100 text-green-800' };
    if (dl.includes(algorithm)) return { name: 'Deep Learning', color: 'bg-purple-100 text-purple-800' };
    return { name: 'Outro', color: 'bg-gray-100 text-gray-800' };
  };

  // Função para renderizar resumo do modelo custom
  const renderCustomModelSummary = () => {
    const customModel = pipelineData.modelConfig?.customModel;
    if (!customModel) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" />
          <span className="font-medium text-purple-800">Arquitetura Neural</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Camadas */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Camadas ({customModel.layers.length})</h4>
            <div className="space-y-1">
              {customModel.layers.map((layer, index) => (
                <div key={layer.id} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                  <span className="font-medium">{index + 1}. {layer.type.toUpperCase()}</span>
                  <span className="text-gray-600">
                    {layer.type === 'dense' && `${layer.config.units} units`}
                    {layer.type === 'lstm' && `${layer.config.units} units`}
                    {layer.type === 'gru' && `${layer.config.units} units`}
                    {layer.type === 'conv1d' && `${layer.config.filters} filters`}
                    {layer.type === 'dropout' && `${(layer.config.rate * 100).toFixed(0)}%`}
                    {layer.type === 'maxpool1d' && `pool ${layer.config.pool_size}`}
                    {layer.type === 'batchnorm' && 'normalização'}
                    {layer.type === 'attention' && `${layer.config.units} units`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Configurações */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Configurações</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Otimizador:</span>
                <span className="font-medium">{customModel.optimizer.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Learning Rate:</span>
                <span className="font-medium">{customModel.optimizer.learningRate.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span>Loss Function:</span>
                <span className="font-medium">{customModel.compilation.loss.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Épocas:</span>
                <span className="font-medium">{customModel.training.epochs}</span>
              </div>
              <div className="flex justify-between">
                <span>Batch Size:</span>
                <span className="font-medium">{customModel.training.batchSize}</span>
              </div>
              <div className="flex justify-between">
                <span>Early Stopping:</span>
                <span className="font-medium">
                  {customModel.training.earlyStopping.enabled ? 
                    `Sim (${customModel.training.earlyStopping.patience})` : 'Não'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const startTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingLogs([]);

    const logs = [
      'Iniciando treinamento...',
      'Carregando dados de treino...',
      'Configurando hiperparâmetros...',
      'Executando validação cruzada...',
      'Otimizando modelo...',
      'Calculando métricas...',
      'Treinamento concluído!'
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setTrainingLogs(prev => [...prev, logs[i]]);
      setTrainingProgress((i + 1) / logs.length * 100);
    }

    // Simular métricas finais
    setMetrics({
      rmse: 12.45,
      mae: 8.32,
      mape: 5.67,
      r2: 0.89
    });

    setIsTraining(false);
    setTrainingComplete(true);
    
    toast({
      title: "Treinamento concluído!",
      description: "Modelo treinado com sucesso",
    });
  };

  const saveModel = () => {
    // Simular salvamento do modelo
    const modelData = {
      type: pipelineData.algorithm,
      metrics,
      timestamp: new Date().toISOString()
    };
    
    updatePipelineData({ trainedModel: modelData });
    
    toast({
      title: "Modelo salvo!",
      description: "Modelo disponível para uso",
    });
  };

  const handleContinue = () => {
    completeStep('training');
    toast({
      title: "Etapa concluída!",
      description: "Modelo treinado e pronto para monitoramento",
    });
  };

  const createPipeline = async () => {
    setIsCreatingPipeline(true);
    
    try {
      // Verificar se o usuário está autenticado
      const token = localStorage.getItem('vur_auth_token');
      if (!token) {
        throw new Error('Usuário não autenticado. Faça login para continuar.');
      }

      // 1. Criar o pipeline inicial
      const pipelineCreateData = {
        name: `Pipeline ${pipelineData.datasetName || 'Sem Nome'} - ${new Date().toLocaleDateString()}`,
        description: `Pipeline criado automaticamente para o dataset ${pipelineData.datasetName || 'N/A'}`,
        pipeline_type: (pipelineData.features?.length || 0) > 1 ? 'multivariate' : 'univariate',
        ...(pipelineData.targetColumn && { target_column: pipelineData.targetColumn }),
        ...(pipelineData.dateColumn && { date_column: pipelineData.dateColumn }),
        ...(pipelineData.features && pipelineData.features.length > 0 && { features: pipelineData.features }),
        ...(pipelineData.algorithm && { algorithm: pipelineData.algorithm }),
        ...(pipelineData.modelConfig?.hyperparameters && Object.keys(pipelineData.modelConfig.hyperparameters).length > 0 && { 
          hyperparameters: pipelineData.modelConfig.hyperparameters 
        }),
        ...(pipelineData.datasetId && { dataset_id: pipelineData.datasetId })
      };

      console.log('Dados sendo enviados para criar pipeline:', pipelineCreateData);

      const createdPipeline = await api.pipelines.create(pipelineCreateData);
      const pipelineId = createdPipeline.id;
      setCreatedPipelineId(pipelineId);

      // 2. Atualizar etapa de Upload
      if (pipelineData.datasetId) {
        const uploadStepData = {
          dataset_id: pipelineData.datasetId,
          dataset_name: pipelineData.datasetName || 'Dataset',
          total_rows: pipelineData.totalRows || pipelineData.data?.length || 0,
          total_columns: pipelineData.columns?.length || 0,
          file_size: pipelineData.file?.size || 0,
          file_type: 'csv',
          upload_timestamp: new Date().toISOString()
        };
        await api.pipelines.updateUploadStep(pipelineId, uploadStepData);
        await api.pipelines.completeStep(pipelineId, 'upload');
      }

      // 3. Atualizar etapa de Preview
      if (pipelineData.columns && pipelineData.data) {
        const previewStepData = {
          columns: pipelineData.columns,
          sample_data: pipelineData.data.slice(0, 5), // Primeiras 5 linhas como amostra
          data_types: pipelineData.columns.reduce((acc, col) => {
            // Inferir tipo baseado nos dados
            const sampleValue = pipelineData.data?.[0]?.[col];
            if (typeof sampleValue === 'number') acc[col] = 'float';
            else if (col === pipelineData.dateColumn) acc[col] = 'datetime';
            else acc[col] = 'string';
            return acc;
          }, {} as Record<string, string>),
          missing_values: pipelineData.columns.reduce((acc, col) => {
            // Calcular valores faltantes (simulado)
            acc[col] = 0;
            return acc;
          }, {} as Record<string, number>),
          date_column: pipelineData.dateColumn,
          target_column: pipelineData.targetColumn,
          column_suggestions: {
            date_columns: pipelineData.dateColumn ? [pipelineData.dateColumn] : [],
            target_columns: pipelineData.targetColumn ? [pipelineData.targetColumn] : []
          },
          data_quality_score: 0.95,
          quality_issues: []
        };
        await api.pipelines.updatePreviewStep(pipelineId, previewStepData);
        await api.pipelines.completeStep(pipelineId, 'preview');
      }

      // 4. Atualizar etapa de Divisão
      const divisaoStepData = {
        train_size: (pipelineData.trainSize || 70) / 100,
        validation_size: (pipelineData.validationSize || 15) / 100,
        test_size: (pipelineData.testSize || 15) / 100,
        split_method: 'temporal',
        split_date: null,
        cross_validation_config: {
          method: pipelineData.modelConfig?.validation?.method || 'holdout',
          n_splits: 5
        },
        train_rows: Math.floor((pipelineData.totalRows || 0) * (pipelineData.trainSize || 70) / 100),
        validation_rows: Math.floor((pipelineData.totalRows || 0) * (pipelineData.validationSize || 15) / 100),
        test_rows: Math.floor((pipelineData.totalRows || 0) * (pipelineData.testSize || 15) / 100)
      };
      await api.pipelines.updateDivisaoStep(pipelineId, divisaoStepData);
      await api.pipelines.completeStep(pipelineId, 'divisao');

      // 5. Atualizar etapa de Preprocessing
      const preprocessingStepData = {
        normalization: pipelineData.preprocessing?.normalization || 'minmax',
        transformation: pipelineData.preprocessing?.transformation || 'none',
        outlier_detection: pipelineData.preprocessing?.outliers !== 'none',
        outlier_method: pipelineData.preprocessing?.outliers || 'iqr',
        outlier_threshold: 1.5,
        missing_value_handling: pipelineData.preprocessing?.missingValues || 'interpolate',
        seasonal_decomposition: pipelineData.preprocessing?.seasonalDecomposition || false,
        smoothing: pipelineData.preprocessing?.smoothing || false,
        smoothing_window: 5,
        applied_transformations: [
          pipelineData.preprocessing?.normalization || 'minmax',
          pipelineData.preprocessing?.transformation || 'none'
        ].filter(t => t !== 'none')
      };
      await api.pipelines.updatePreprocessingStep(pipelineId, preprocessingStepData);
      await api.pipelines.completeStep(pipelineId, 'preprocessing');

      // 6. Atualizar etapa de Features
      const featuresStepData = {
        selected_features: pipelineData.features || [],
        feature_engineering: {
          lag_features: [1, 7, 30],
          rolling_features: [
            { window: 7, operation: 'mean' },
            { window: 30, operation: 'std' }
          ]
        },
        input_window_size: pipelineData.steps || 35,
        forecast_horizon: 15,
        feature_selection_method: 'mutual_information',
        feature_importance: {},
        feature_correlations: {},
        lag_features: [1, 7, 30],
        rolling_features: [
          { window: 7, operation: 'mean' },
          { window: 14, operation: 'std' }
        ]
      };
      await api.pipelines.updateFeaturesStep(pipelineId, featuresStepData);
      await api.pipelines.completeStep(pipelineId, 'features');

      // 7. Atualizar etapa de Modelo
      const modeloStepData = {
        algorithm: pipelineData.algorithm || 'lstm',
        algorithm_category: getAlgorithmCategory(pipelineData.algorithm || '').name.toLowerCase().replace(' ', '_'),
        hyperparameters: pipelineData.modelConfig?.hyperparameters || {},
        model_type: (pipelineData.features?.length || 0) > 1 ? 'multivariate' : 'univariate',
        validation_method: pipelineData.modelConfig?.validation?.method || 'holdout',
        metrics_config: {
          primary_metric: 'mse',
          additional_metrics: pipelineData.modelConfig?.metrics || ['mae', 'mape', 'rmse']
        },
        auto_hyperparameter_tuning: pipelineData.modelConfig?.optimization?.enabled || false,
        tuning_method: pipelineData.modelConfig?.optimization?.method || 'bayesian'
      };
      await api.pipelines.updateModeloStep(pipelineId, modeloStepData);
      await api.pipelines.completeStep(pipelineId, 'modelo');

      setPipelineCreated(true);
      
      toast({
        title: "Pipeline criado com sucesso!",
        description: `Pipeline ID: ${pipelineId} foi criado no backend com todos os parâmetros configurados.`,
      });

      // Salvar o ID do pipeline no contexto para referência futura
      updatePipelineData({ pipelineId: pipelineId });

    } catch (error) {
      console.error('Erro ao criar pipeline:', error);
      
      let errorMessage = "Erro desconhecido ao criar pipeline no backend";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Detectar diferentes tipos de erro
        if (error.message.includes('403') || error.message.includes('Not authenticated')) {
          errorMessage = "Erro de autenticação: Faça login novamente para continuar.";
        } else if (error.message.includes('422') || error.message.includes('Unprocessable') || error.message.includes('inválidos')) {
          errorMessage = `Erro de validação: ${error.message}. Verifique se todos os campos obrigatórios estão preenchidos corretamente.`;
        } else if (error.message.includes('404')) {
          errorMessage = "Recurso não encontrado. Verifique se o dataset existe.";
        } else if (error.message.includes('500')) {
          errorMessage = "Erro interno do servidor. Tente novamente mais tarde.";
        }
      }
      
      toast({
        title: "Erro ao criar pipeline",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreatingPipeline(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Treinamento do Modelo</h2>
          <p className="text-muted-foreground">
            Revise o pipeline configurado e execute o treinamento
          </p>
        </div>
        <div className="flex items-center gap-3">
          {trainingComplete && (
            <Badge className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Treinado
            </Badge>
          )}
          <Button onClick={handleContinue} disabled={!trainingComplete}>
            <Check className="w-4 h-4 mr-2" />
            Continuar para Monitoramento
          </Button>
        </div>
      </div>

      {/* Resumo do Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Resumo do Pipeline
          </CardTitle>
          <CardDescription>
            Visão geral de todas as etapas configuradas do pipeline de machine learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Dados */}
            <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Dados</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Registros:</span>
                  <span className="font-medium">{pipelineData.data?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Features:</span>
                  <span className="font-medium">{pipelineData.features?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">
                    {(pipelineData.features?.length || 0) > 1 ? 'Multivariado' : 'Univariado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target:</span>
                  <span className="font-medium text-xs">{pipelineData.target || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Divisão */}
            <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Divisão</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Treino:</span>
                  <span className="font-medium">{pipelineData.trainSize || 70}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Validação:</span>
                  <span className="font-medium">{pipelineData.validationSize || 15}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Teste:</span>
                  <span className="font-medium">{pipelineData.testSize || 15}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Método:</span>
                  <span className="font-medium text-xs">
                    {pipelineData.modelConfig?.validation?.method === 'holdout' ? 'Holdout' :
                     pipelineData.modelConfig?.validation?.method === 'time_series_split' ? 'Time Series' :
                     pipelineData.modelConfig?.validation?.method === 'walk_forward' ? 'Walk-Forward' : 'Holdout'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pré-processamento */}
            <div className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800">Pré-processamento</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Normalização:</span>
                  <span className="font-medium">
                    {pipelineData.preprocessing?.normalization || 'MinMax'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Missing Values:</span>
                  <span className="font-medium">
                    {pipelineData.preprocessing?.missingValues || 'Forward Fill'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outliers:</span>
                  <span className="font-medium">
                    {pipelineData.preprocessing?.outliers || 'IQR'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Features Eng.:</span>
                  <span className="font-medium">
                    {pipelineData.preprocessing?.featureEngineering ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
            </div>

            {/* Validação */}
            <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-800">Validação</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Métricas:</span>
                  <span className="font-medium">{pipelineData.modelConfig?.metrics?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Otimização:</span>
                  <span className="font-medium">
                    {pipelineData.modelConfig?.optimization?.enabled ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Método Otim.:</span>
                  <span className="font-medium text-xs">
                    {pipelineData.modelConfig?.optimization?.method || 'Bayesian'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Iterações:</span>
                  <span className="font-medium">
                    {pipelineData.modelConfig?.optimization?.iterations || 50}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas Selecionadas */}
          {pipelineData.modelConfig?.metrics && pipelineData.modelConfig.metrics.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-800">Métricas de Avaliação</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pipelineData.modelConfig.metrics.map((metric) => (
                  <Badge key={metric} variant="secondary" className="text-xs">
                    {metric.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do Modelo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            Resumo do Modelo
          </CardTitle>
          <CardDescription>
            Detalhes da configuração do modelo selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Informações Básicas do Modelo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-indigo-800">Algoritmo</h3>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-bold text-indigo-900">
                    {getAlgorithmName(pipelineData.algorithm || '')}
                  </div>
                  <Badge className={getAlgorithmCategory(pipelineData.algorithm || '').color}>
                    {getAlgorithmCategory(pipelineData.algorithm || '').name}
                  </Badge>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gradient-to-br from-teal-50 to-teal-100">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-teal-600" />
                  <h3 className="font-semibold text-teal-800">Hiperparâmetros</h3>
                </div>
                <div className="space-y-1 text-sm">
                  {pipelineData.modelConfig?.hyperparameters && 
                   Object.keys(pipelineData.modelConfig.hyperparameters).length > 0 ? (
                    Object.entries(pipelineData.modelConfig.hyperparameters).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-500 text-xs">Configuração padrão</span>
                  )}
                  {pipelineData.modelConfig?.hyperparameters && 
                   Object.keys(pipelineData.modelConfig.hyperparameters).length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{Object.keys(pipelineData.modelConfig.hyperparameters).length - 3} mais...
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">Otimização</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">
                      {pipelineData.modelConfig?.optimization?.enabled ? 'Habilitada' : 'Desabilitada'}
                    </span>
                  </div>
                  {pipelineData.modelConfig?.optimization?.enabled && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Método:</span>
                        <span className="font-medium text-xs">
                          {pipelineData.modelConfig.optimization.method === 'bayesian' ? 'Bayesian' :
                           pipelineData.modelConfig.optimization.method === 'grid_search' ? 'Grid Search' :
                           pipelineData.modelConfig.optimization.method === 'random_search' ? 'Random Search' : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Iterações:</span>
                        <span className="font-medium">{pipelineData.modelConfig.optimization.iterations}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modelo Custom - Detalhes Específicos */}
            {pipelineData.algorithm === 'custom' && pipelineData.modelConfig?.customModel && (
              <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
                {renderCustomModelSummary()}
              </div>
            )}

            {/* Estimativa de Tempo e Recursos */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Estimativas de Treinamento</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tempo estimado:</span>
                  <span className="font-medium">
                    {pipelineData.algorithm === 'custom' ? '5-15 min' :
                     ['lstm', 'gru', 'transformer'].includes(pipelineData.algorithm || '') ? '3-10 min' :
                     ['xgboost', 'random_forest'].includes(pipelineData.algorithm || '') ? '1-5 min' : '< 1 min'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Complexidade:</span>
                  <span className="font-medium">
                    {pipelineData.algorithm === 'custom' ? 'Alta' :
                     ['lstm', 'gru', 'transformer'].includes(pipelineData.algorithm || '') ? 'Alta' :
                     ['xgboost', 'random_forest'].includes(pipelineData.algorithm || '') ? 'Média' : 'Baixa'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uso de GPU:</span>
                  <span className="font-medium">
                    {['custom', 'lstm', 'gru', 'transformer'].includes(pipelineData.algorithm || '') ? 'Recomendado' : 'Não necessário'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Memória:</span>
                  <span className="font-medium">
                    {pipelineData.algorithm === 'custom' ? 'Alta' :
                     ['lstm', 'gru', 'transformer'].includes(pipelineData.algorithm || '') ? 'Média-Alta' : 'Baixa'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controle de Treinamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Controle de Treinamento
          </CardTitle>
          <CardDescription>
            Inicie o treinamento e acompanhe o progresso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status do Treinamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  Modelo: {getAlgorithmName(pipelineData.algorithm || '')}
                </h3>
                <p className="text-sm text-gray-600">
                  {trainingComplete ? 'Treinamento concluído' : 
                   isTraining ? 'Treinando...' : 'Pronto para treinar'}
                </p>
              </div>
            </div>

            {isTraining && (
              <div className="space-y-2">
                <Progress value={trainingProgress} className="w-full" />
                <p className="text-sm text-gray-600">
                  Progresso: {Math.round(trainingProgress)}%
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={startTraining} 
                disabled={isTraining || trainingComplete || !pipelineData.algorithm}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isTraining ? 'Treinando...' : 'Iniciar Treinamento'}
              </Button>
              
              {trainingComplete && (
                <Button 
                  onClick={saveModel} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Salvar Modelo
                </Button>
              )}
            </div>
          </div>

          {/* Logs de Treinamento */}
          {trainingLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logs de Treinamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-48 overflow-y-auto">
                  {trainingLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      [{new Date().toLocaleTimeString()}] {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Métricas de Performance */}
      {trainingComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Métricas de Performance
            </CardTitle>
            <CardDescription>
              Avaliação da qualidade do modelo treinado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{metrics.rmse}</div>
                <div className="text-sm text-gray-600">RMSE</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics.mae}</div>
                <div className="text-sm text-gray-600">MAE</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{metrics.mape}%</div>
                <div className="text-sm text-gray-600">MAPE</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{metrics.r2}</div>
                <div className="text-sm text-gray-600">R²</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Previsão vs Real */}
      {trainingComplete && (
        <Card>
          <CardHeader>
            <CardTitle>Previsão vs Valores Reais</CardTitle>
            <CardDescription>
              Comparação das previsões do modelo com os valores reais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="real" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Real"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Predito"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão para criar o pipeline no backend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Criar Pipeline no Backend
          </CardTitle>
          <CardDescription>
            Crie o pipeline no backend com todos os parâmetros das etapas anteriores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status do Pipeline */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">
                {pipelineCreated ? 'Pipeline Criado' : 'Pipeline não criado'}
              </h3>
              <p className="text-sm text-gray-600">
                {pipelineCreated 
                  ? `ID: ${createdPipelineId} - Todas as etapas configuradas`
                  : isCreatingPipeline 
                    ? 'Criando pipeline e configurando etapas...' 
                    : 'Pronto para criar pipeline no backend'
                }
              </p>
            </div>
            {pipelineCreated && (
              <Badge className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Criado
              </Badge>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button 
              onClick={createPipeline}
              disabled={isCreatingPipeline || pipelineCreated || !pipelineData.algorithm}
              className="flex items-center gap-2"
            >
              {isCreatingPipeline ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Criando Pipeline...
                </>
              ) : pipelineCreated ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Pipeline Criado
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Criar Pipeline
                </>
              )}
            </Button>
            
            {pipelineCreated && createdPipelineId && (
              <Button 
                variant="outline"
                onClick={() => {
                  // Copiar ID do pipeline para clipboard
                  navigator.clipboard.writeText(createdPipelineId.toString());
                  toast({
                    title: "ID copiado!",
                    description: `ID do pipeline ${createdPipelineId} copiado para a área de transferência.`,
                  });
                }}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Copiar ID
              </Button>
            )}
          </div>

          {/* Informações do Pipeline Criado */}
          {pipelineCreated && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">Pipeline Configurado com Sucesso</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-medium">{createdPipelineId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Algoritmo:</span>
                  <span className="font-medium">{getAlgorithmName(pipelineData.algorithm || '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dataset:</span>
                  <span className="font-medium text-xs">{pipelineData.datasetName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Etapas:</span>
                  <span className="font-medium">6/6 Completas</span>
                </div>
              </div>
            </div>
          )}

          {/* Requisitos para Criação */}
          {!pipelineCreated && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Requisitos para Criação</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {pipelineData.algorithm ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <div className="w-3 h-3 border border-gray-400 rounded-full" />
                  )}
                  <span className={pipelineData.algorithm ? 'text-green-700' : 'text-gray-600'}>
                    Algoritmo selecionado
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pipelineData.datasetId ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <div className="w-3 h-3 border border-gray-400 rounded-full" />
                  )}
                  <span className={pipelineData.datasetId ? 'text-green-700' : 'text-gray-600'}>
                    Dataset carregado
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pipelineData.targetColumn ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <div className="w-3 h-3 border border-gray-400 rounded-full" />
                  )}
                  <span className={pipelineData.targetColumn ? 'text-green-700' : 'text-gray-600'}>
                    Coluna alvo definida
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelTraining;
