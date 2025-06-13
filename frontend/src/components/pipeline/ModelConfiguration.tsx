import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Check, 
  Settings, 
  Zap, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Cpu, 
  Clock,
  AlertTriangle,
  Info,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Cog
} from 'lucide-react';

interface ModelConfig {
  algorithm: string;
  hyperparameters: { [key: string]: any };
  validation: {
    method: 'holdout' | 'time_series_split' | 'walk_forward';
    useValidationSet: boolean;
  };
  optimization: {
    enabled: boolean;
    method: 'grid_search' | 'random_search' | 'bayesian';
    iterations: number;
  };
  metrics: string[];
  ensemble: {
    enabled: boolean;
    method: 'voting' | 'stacking';
    models: string[];
  };
  customModel?: CustomModelConfig;
}

interface CustomModelConfig {
  layers: CustomLayer[];
  optimizer: {
    type: 'adam' | 'sgd' | 'rmsprop' | 'adagrad';
    learningRate: number;
    beta1?: number;
    beta2?: number;
    momentum?: number;
    decay?: number;
  };
  compilation: {
    loss: 'mse' | 'mae' | 'huber' | 'logcosh';
    metrics: string[];
  };
  training: {
    epochs: number;
    batchSize: number;
    validationSplit: number;
    earlyStopping: {
      enabled: boolean;
      patience: number;
      monitor: string;
    };
    callbacks: string[];
  };
}

interface CustomLayer {
  id: string;
  type: 'dense' | 'lstm' | 'gru' | 'conv1d' | 'maxpool1d' | 'dropout' | 'batchnorm' | 'attention';
  name: string;
  config: { [key: string]: any };
  position: number;
}

const ModelConfiguration = () => {
  const { pipelineData, updatePipelineData, completeStep, updateStepData, completeStepRemote } = usePipeline();
  const { toast } = useToast();

  const [config, setConfig] = useState<ModelConfig>({
    algorithm: '',
    hyperparameters: {},
    validation: {
      method: 'holdout',
      useValidationSet: true
    },
    optimization: {
      enabled: true,
      method: 'bayesian',
      iterations: 50
    },
    metrics: ['mae', 'rmse', 'mape'],
    ensemble: {
      enabled: false,
      method: 'voting',
      models: []
    }
  });

  const [autoConfig, setAutoConfig] = useState(false);

  // Estado para modelo custom
  const [customModel, setCustomModel] = useState<CustomModelConfig>({
    layers: [
      {
        id: '1',
        type: 'lstm',
        name: 'LSTM Layer 1',
        config: { units: 64, activation: 'tanh', return_sequences: true },
        position: 0
      },
      {
        id: '2',
        type: 'dropout',
        name: 'Dropout 1',
        config: { rate: 0.2 },
        position: 1
      },
      {
        id: '3',
        type: 'dense',
        name: 'Output Layer',
        config: { units: 1, activation: 'linear' },
        position: 2
      }
    ],
    optimizer: {
      type: 'adam',
      learningRate: 0.001,
      beta1: 0.9,
      beta2: 0.999
    },
    compilation: {
      loss: 'mse',
      metrics: ['mae']
    },
    training: {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      earlyStopping: {
        enabled: true,
        patience: 10,
        monitor: 'val_loss'
      },
      callbacks: ['early_stopping']
    }
  });

  // Algoritmos disponíveis com categorias
  const algorithms = {
    classical: [
      { id: 'arima', name: 'ARIMA', description: 'Auto-Regressive Integrated Moving Average' },
      { id: 'sarima', name: 'SARIMA', description: 'Seasonal ARIMA' },
      { id: 'exponential_smoothing', name: 'Exponential Smoothing', description: 'Holt-Winters' },
      { id: 'prophet', name: 'Prophet', description: 'Facebook Prophet' }
    ],
    machine_learning: [
      { id: 'random_forest', name: 'Random Forest', description: 'Ensemble de árvores' },
      { id: 'xgboost', name: 'XGBoost', description: 'Gradient Boosting' },
      { id: 'svr', name: 'Support Vector Regression', description: 'SVM para regressão' },
      { id: 'linear_regression', name: 'Regressão Linear', description: 'Modelo linear simples' }
    ],
    deep_learning: [
      { id: 'lstm', name: 'LSTM', description: 'Long Short-Term Memory' },
      { id: 'gru', name: 'GRU', description: 'Gated Recurrent Unit' },
      { id: 'transformer', name: 'Transformer', description: 'Attention-based model' },
      { id: 'custom', name: 'Custom', description: 'Modelo personalizado configurável' }
    ]
  };

  // Hiperparâmetros específicos por algoritmo
  const getHyperparameters = (algorithm: string) => {
    const hyperparams: { [key: string]: any } = {
      arima: {
        p: { type: 'range', min: 0, max: 5, default: 1, description: 'Ordem autoregressiva' },
        d: { type: 'range', min: 0, max: 2, default: 1, description: 'Grau de diferenciação' },
        q: { type: 'range', min: 0, max: 5, default: 1, description: 'Ordem média móvel' }
      },
      sarima: {
        p: { type: 'range', min: 0, max: 3, default: 1, description: 'Ordem autoregressiva' },
        d: { type: 'range', min: 0, max: 2, default: 1, description: 'Grau de diferenciação' },
        q: { type: 'range', min: 0, max: 3, default: 1, description: 'Ordem média móvel' },
        P: { type: 'range', min: 0, max: 2, default: 1, description: 'Ordem sazonal AR' },
        D: { type: 'range', min: 0, max: 1, default: 1, description: 'Diferenciação sazonal' },
        Q: { type: 'range', min: 0, max: 2, default: 1, description: 'Ordem sazonal MA' },
        s: { type: 'select', options: [7, 12, 24, 52], default: 12, description: 'Período sazonal' }
      },
      lstm: {
        units: { type: 'range', min: 32, max: 256, default: 64, description: 'Neurônios por camada' },
        layers: { type: 'range', min: 1, max: 4, default: 2, description: 'Número de camadas' },
        dropout: { type: 'float', min: 0, max: 0.5, default: 0.2, description: 'Taxa de dropout' },
        epochs: { type: 'range', min: 50, max: 500, default: 100, description: 'Épocas de treinamento' },
        batch_size: { type: 'select', options: [16, 32, 64, 128], default: 32, description: 'Tamanho do batch' }
      },
      random_forest: {
        n_estimators: { type: 'range', min: 50, max: 500, default: 100, description: 'Número de árvores' },
        max_depth: { type: 'range', min: 3, max: 20, default: 10, description: 'Profundidade máxima' },
        min_samples_split: { type: 'range', min: 2, max: 20, default: 5, description: 'Min. amostras para divisão' },
        min_samples_leaf: { type: 'range', min: 1, max: 10, default: 2, description: 'Min. amostras por folha' }
      },
      xgboost: {
        n_estimators: { type: 'range', min: 50, max: 500, default: 100, description: 'Número de estimadores' },
        max_depth: { type: 'range', min: 3, max: 10, default: 6, description: 'Profundidade máxima' },
        learning_rate: { type: 'float', min: 0.01, max: 0.3, default: 0.1, description: 'Taxa de aprendizado' },
        subsample: { type: 'float', min: 0.6, max: 1.0, default: 0.8, description: 'Subamostragem' }
      },
      prophet: {
        seasonality_mode: { type: 'select', options: ['additive', 'multiplicative'], default: 'additive', description: 'Modo de sazonalidade' },
        yearly_seasonality: { type: 'boolean', default: true, description: 'Sazonalidade anual' },
        weekly_seasonality: { type: 'boolean', default: true, description: 'Sazonalidade semanal' },
        daily_seasonality: { type: 'boolean', default: false, description: 'Sazonalidade diária' },
        changepoint_prior_scale: { type: 'float', min: 0.001, max: 0.5, default: 0.05, description: 'Flexibilidade da tendência' }
      },
      custom: {
        // Configuração básica - a interface detalhada será renderizada separadamente
        input_shape: { type: 'range', min: 1, max: 100, default: 10, description: 'Tamanho da janela de entrada' },
        output_units: { type: 'range', min: 1, max: 10, default: 1, description: 'Número de saídas' }
      }
    };

    return hyperparams[algorithm] || {};
  };

  // Auto-configuração baseada nos dados
  const autoConfigureModel = () => {
    if (!pipelineData.data) return;

    const dataSize = pipelineData.data.length;
    const isMultivariate = (pipelineData.features?.length || 0) > 1;
    
    let suggestedAlgorithm = '';
    let suggestedParams = {};

    // Lógica de sugestão baseada no tamanho dos dados
    if (dataSize < 100) {
      suggestedAlgorithm = 'exponential_smoothing';
      toast({
        title: "Algoritmo sugerido: Exponential Smoothing",
        description: "Recomendado para datasets pequenos",
      });
    } else if (dataSize < 500) {
      suggestedAlgorithm = isMultivariate ? 'random_forest' : 'arima';
      toast({
        title: `Algoritmo sugerido: ${isMultivariate ? 'Random Forest' : 'ARIMA'}`,
        description: "Adequado para datasets médios",
      });
    } else if (dataSize < 2000) {
      suggestedAlgorithm = isMultivariate ? 'xgboost' : 'prophet';
      toast({
        title: `Algoritmo sugerido: ${isMultivariate ? 'XGBoost' : 'Prophet'}`,
        description: "Boa performance para datasets grandes",
      });
    } else {
      suggestedAlgorithm = 'lstm';
      toast({
        title: "Algoritmo sugerido: LSTM",
        description: "Ideal para datasets muito grandes",
      });
    }

    // Configurar hiperparâmetros padrão
    const hyperparams = getHyperparameters(suggestedAlgorithm);
    const defaultParams: { [key: string]: any } = {};
    
    Object.keys(hyperparams).forEach(key => {
      defaultParams[key] = hyperparams[key].default;
    });

    setConfig(prev => ({
      ...prev,
      algorithm: suggestedAlgorithm,
      hyperparameters: defaultParams
    }));

    setAutoConfig(false);
  };

  // Executar auto-configuração quando solicitado
  useEffect(() => {
    if (autoConfig) {
      autoConfigureModel();
    }
  }, [autoConfig, pipelineData.data]);

  // Renderizar controle de hiperparâmetro
  const renderHyperparameterControl = (key: string, param: any) => {
    const value = config.hyperparameters[key] || param.default;

    const updateHyperparam = (newValue: any) => {
      setConfig(prev => ({
        ...prev,
        hyperparameters: {
          ...prev.hyperparameters,
          [key]: newValue
        }
      }));
    };

    switch (param.type) {
      case 'range':
        return (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">{key}: {value}</Label>
              <span className="text-xs text-gray-500">{param.description}</span>
            </div>
            <Slider
              value={[value]}
              onValueChange={([newValue]) => updateHyperparam(newValue)}
              min={param.min}
              max={param.max}
              step={1}
              className="w-full"
            />
          </div>
        );

      case 'float':
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm font-medium">{key}</Label>
            <Input
              type="number"
              step="0.01"
              min={param.min}
              max={param.max}
              value={value}
              onChange={(e) => updateHyperparam(parseFloat(e.target.value))}
              placeholder={param.description}
            />
          </div>
        );

      case 'select':
  return (
          <div key={key} className="space-y-2">
            <Label className="text-sm font-medium">{key}</Label>
            <Select value={value.toString()} onValueChange={(val) => updateHyperparam(isNaN(Number(val)) ? val : Number(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {param.options.map((option: any) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'boolean':
        return (
          <div key={key} className="flex items-center justify-between">
            <Label className="text-sm font-medium">{key}</Label>
            <Switch
              checked={value}
              onCheckedChange={updateHyperparam}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const handleContinue = async () => {
    if (!config.algorithm) {
      toast({
        title: "Erro de configuração",
        description: "Selecione um algoritmo antes de continuar",
        variant: "destructive"
      });
      return;
    }

    try {
      // Preparar configuração final
      const finalConfig = { ...config };
      
      // Se for modelo custom, incluir configuração personalizada
      if (config.algorithm === 'custom') {
        finalConfig.customModel = customModel;
      }

      // Salvar configuração completa localmente
      updatePipelineData({
        algorithm: config.algorithm,
        modelConfig: finalConfig,
        modelingType: (pipelineData.features?.length || 0) > 1 ? 'multivariate' : 'univariate'
      });

      // Enviar dados para a API se há pipeline ID
      if (pipelineData.pipelineId) {
        // Mapear algoritmo para categoria
        const getAlgorithmCategory = (algorithm: string) => {
          const categories: { [key: string]: string } = {
            'lstm': 'deep_learning',
            'gru': 'deep_learning',
            'transformer': 'deep_learning',
            'cnn': 'deep_learning',
            'arima': 'statistical',
            'sarima': 'statistical',
            'var': 'statistical',
            'prophet': 'facebook_prophet',
            'xgboost': 'ensemble',
            'random_forest': 'ensemble',
            'svm': 'machine_learning',
            'linear_regression': 'regression',
            'custom': 'custom'
          };
          return categories[algorithm] || 'machine_learning';
        };

        const stepData = {
          algorithm: config.algorithm,
          algorithm_category: getAlgorithmCategory(config.algorithm),
          hyperparameters: config.hyperparameters,
          model_type: (pipelineData.features?.length || 0) > 1 ? 'multivariate' : 'univariate',
          validation_method: config.validation.method,
          metrics_config: {
            primary_metric: 'mse',
            additional_metrics: config.metrics
          },
          auto_hyperparameter_tuning: config.optimization.enabled,
          tuning_method: config.optimization.method
        };

        await updateStepData('model', stepData);
        await completeStepRemote('modelo'); // API usa 'modelo'
      }

      completeStep('model');

      toast({
        title: "Modelo configurado!",
        description: `${config.algorithm === 'custom' ? 'Modelo personalizado' : config.algorithm} configurado com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao salvar configuração do modelo:', error);
      toast({
        title: "Erro de configuração",
        description: "Erro ao salvar configurações do modelo",
        variant: "destructive"
      });
    }
  };

  const currentHyperparams = config.algorithm ? getHyperparameters(config.algorithm) : {};

  // Funções para gerenciar modelo custom
  const addCustomLayer = (type: CustomLayer['type']) => {
    const layers = [...customModel.layers];
    const outputLayerIndex = layers.length - 1; // Última camada é sempre output
    
    const newLayer: CustomLayer = {
      id: Date.now().toString(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer ${layers.length}`,
      config: getDefaultLayerConfig(type),
      position: outputLayerIndex // Insere antes da camada de output
    };

    // Insere a nova camada antes da última (output)
    layers.splice(outputLayerIndex, 0, newLayer);
    
    // Reajusta as posições de todas as camadas
    layers.forEach((layer, index) => {
      layer.position = index;
    });

    setCustomModel(prev => ({
      ...prev,
      layers
    }));
  };

  const removeCustomLayer = (layerId: string) => {
    setCustomModel(prev => ({
      ...prev,
      layers: prev.layers.filter(layer => layer.id !== layerId)
        .map((layer, index) => ({ ...layer, position: index }))
    }));
  };

  const updateCustomLayer = (layerId: string, updates: Partial<CustomLayer>) => {
    setCustomModel(prev => ({
      ...prev,
      layers: prev.layers.map(layer => 
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    }));
  };

  const moveCustomLayer = (layerId: string, direction: 'up' | 'down') => {
    const layers = [...customModel.layers];
    const currentIndex = layers.findIndex(layer => layer.id === layerId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= layers.length) return;
    
    // Troca as posições
    [layers[currentIndex], layers[newIndex]] = [layers[newIndex], layers[currentIndex]];
    
    // Atualiza as posições
    layers.forEach((layer, index) => {
      layer.position = index;
    });
    
    setCustomModel(prev => ({
      ...prev,
      layers
    }));
  };

  const getDefaultLayerConfig = (type: CustomLayer['type']): { [key: string]: any } => {
    switch (type) {
      case 'dense':
        return { units: 64, activation: 'relu' };
      case 'lstm':
        return { units: 64, activation: 'tanh', return_sequences: false };
      case 'gru':
        return { units: 64, activation: 'tanh', return_sequences: false };
      case 'conv1d':
        return { filters: 32, kernel_size: 3, activation: 'relu', padding: 'same' };
      case 'maxpool1d':
        return { pool_size: 2, strides: 1, padding: 'valid' };
      case 'dropout':
        return { rate: 0.2 };
      case 'batchnorm':
        return { momentum: 0.99, epsilon: 0.001 };
      case 'attention':
        return { units: 64, use_scale: true };
      default:
        return {};
    }
  };

  // Renderiza controles específicos para cada tipo de camada
  const renderLayerConfig = (layer: CustomLayer) => {
    const updateLayerConfig = (key: string, value: any) => {
      updateCustomLayer(layer.id, {
        config: { ...layer.config, [key]: value }
      });
    };

    switch (layer.type) {
      case 'dense':
  return (
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
              <Label>Unidades: {layer.config.units}</Label>
              <Slider
                value={[layer.config.units || 64]}
                onValueChange={([value]) => updateLayerConfig('units', value)}
                min={1}
                max={512}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Ativação</Label>
              <Select 
                value={layer.config.activation || 'relu'} 
                onValueChange={(value) => updateLayerConfig('activation', value)}
              >
              <SelectTrigger>
                  <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="relu">ReLU</SelectItem>
                  <SelectItem value="tanh">Tanh</SelectItem>
                  <SelectItem value="sigmoid">Sigmoid</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="softmax">Softmax</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        );

      case 'lstm':
      case 'gru':
        return (
          <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
              <Label>Unidades: {layer.config.units}</Label>
              <Slider
                value={[layer.config.units || 64]}
                onValueChange={([value]) => updateLayerConfig('units', value)}
                min={1}
                max={256}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Ativação</Label>
              <Select 
                value={layer.config.activation || 'tanh'} 
                onValueChange={(value) => updateLayerConfig('activation', value)}
              >
              <SelectTrigger>
                  <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="tanh">Tanh</SelectItem>
                  <SelectItem value="relu">ReLU</SelectItem>
                  <SelectItem value="sigmoid">Sigmoid</SelectItem>
              </SelectContent>
            </Select>
          </div>
            <div className="flex items-center justify-between">
              <Label>Return Sequences</Label>
              <Switch
                checked={layer.config.return_sequences || false}
                onCheckedChange={(checked) => updateLayerConfig('return_sequences', checked)}
              />
            </div>
          </div>
        );

      case 'conv1d':
        return (
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
              <Label>Filtros: {layer.config.filters}</Label>
              <Slider
                value={[layer.config.filters || 32]}
                onValueChange={([value]) => updateLayerConfig('filters', value)}
                min={1}
                max={128}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Kernel Size: {layer.config.kernel_size}</Label>
              <Slider
                value={[layer.config.kernel_size || 3]}
                onValueChange={([value]) => updateLayerConfig('kernel_size', value)}
                min={1}
                max={11}
                step={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Ativação</Label>
              <Select 
                value={layer.config.activation || 'relu'} 
                onValueChange={(value) => updateLayerConfig('activation', value)}
              >
              <SelectTrigger>
                  <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="relu">ReLU</SelectItem>
                  <SelectItem value="tanh">Tanh</SelectItem>
                  <SelectItem value="sigmoid">Sigmoid</SelectItem>
              </SelectContent>
            </Select>
          </div>
            <div className="space-y-2">
              <Label>Padding</Label>
              <Select 
                value={layer.config.padding || 'same'} 
                onValueChange={(value) => updateLayerConfig('padding', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same">Same</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'maxpool1d':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pool Size: {layer.config.pool_size}</Label>
              <Slider
                value={[layer.config.pool_size || 2]}
                onValueChange={([value]) => updateLayerConfig('pool_size', value)}
                min={1}
                max={5}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Strides: {layer.config.strides}</Label>
              <Slider
                value={[layer.config.strides || 1]}
                onValueChange={([value]) => updateLayerConfig('strides', value)}
                min={1}
                max={5}
                step={1}
              />
            </div>
          </div>
        );

      case 'dropout':
        return (
          <div className="space-y-2">
            <Label>Taxa de Dropout: {layer.config.rate}</Label>
            <Slider
              value={[layer.config.rate || 0.2]}
              onValueChange={([value]) => updateLayerConfig('rate', value)}
              min={0}
              max={0.8}
              step={0.05}
            />
          </div>
        );

      case 'batchnorm':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Momentum: {layer.config.momentum}</Label>
              <Slider
                value={[layer.config.momentum || 0.99]}
                onValueChange={([value]) => updateLayerConfig('momentum', value)}
                min={0.1}
                max={0.999}
                step={0.001}
              />
            </div>
            <div className="space-y-2">
              <Label>Epsilon: {layer.config.epsilon}</Label>
              <Input
                type="number"
                step="0.0001"
                value={layer.config.epsilon || 0.001}
                onChange={(e) => updateLayerConfig('epsilon', parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case 'attention':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unidades: {layer.config.units}</Label>
              <Slider
                value={[layer.config.units || 64]}
                onValueChange={([value]) => updateLayerConfig('units', value)}
                min={1}
                max={256}
                step={1}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Use Scale</Label>
              <Switch
                checked={layer.config.use_scale || true}
                onCheckedChange={(checked) => updateLayerConfig('use_scale', checked)}
              />
            </div>
          </div>
        );

      default:
        return <div className="text-gray-500 text-sm">Sem configurações específicas</div>;
    }
  };

  // Versão compacta para melhor aproveitamento do espaço
  const renderLayerConfigCompact = (layer: CustomLayer) => {
    const updateLayerConfig = (key: string, value: any) => {
      updateCustomLayer(layer.id, {
        config: { ...layer.config, [key]: value }
      });
    };

    switch (layer.type) {
      case 'dense':
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Label className="text-xs whitespace-nowrap">Unidades:</Label>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{layer.config.units || 64}</span>
              <div className="flex-1 min-w-16">
                <Slider
                  value={[layer.config.units || 64]}
                  onValueChange={([value]) => updateLayerConfig('units', value)}
                  min={1}
                  max={512}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Ativação:</Label>
              <Select 
                value={layer.config.activation || 'relu'} 
                onValueChange={(value) => updateLayerConfig('activation', value)}
              >
                <SelectTrigger className="h-7 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relu">ReLU</SelectItem>
                  <SelectItem value="tanh">Tanh</SelectItem>
                  <SelectItem value="sigmoid">Sigmoid</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="softmax">Softmax</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'lstm':
      case 'gru':
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Label className="text-xs whitespace-nowrap">Unidades:</Label>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{layer.config.units || 64}</span>
              <div className="flex-1 min-w-16">
                <Slider
                  value={[layer.config.units || 64]}
                  onValueChange={([value]) => updateLayerConfig('units', value)}
                  min={1}
                  max={256}
                  step={1}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Ativação:</Label>
              <Select 
                value={layer.config.activation || 'tanh'} 
                onValueChange={(value) => updateLayerConfig('activation', value)}
              >
                <SelectTrigger className="h-7 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tanh">Tanh</SelectItem>
                  <SelectItem value="relu">ReLU</SelectItem>
                  <SelectItem value="sigmoid">Sigmoid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Return Seq:</Label>
              <Switch
                checked={layer.config.return_sequences || false}
                onCheckedChange={(checked) => updateLayerConfig('return_sequences', checked)}
                className="scale-75"
              />
            </div>
          </div>
        );

      case 'conv1d':
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Filtros:</Label>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{layer.config.filters || 32}</span>
              <div className="w-16">
                <Slider
                  value={[layer.config.filters || 32]}
                  onValueChange={([value]) => updateLayerConfig('filters', value)}
                  min={1}
                  max={128}
                  step={1}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Kernel:</Label>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{layer.config.kernel_size || 3}</span>
              <div className="w-16">
                <Slider
                  value={[layer.config.kernel_size || 3]}
                  onValueChange={([value]) => updateLayerConfig('kernel_size', value)}
                  min={1}
                  max={11}
                  step={2}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Ativação:</Label>
              <Select 
                value={layer.config.activation || 'relu'} 
                onValueChange={(value) => updateLayerConfig('activation', value)}
              >
                <SelectTrigger className="h-7 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relu">ReLU</SelectItem>
                  <SelectItem value="tanh">Tanh</SelectItem>
                  <SelectItem value="sigmoid">Sigmoid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'maxpool1d':
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Pool Size:</Label>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{layer.config.pool_size || 2}</span>
              <div className="w-16">
                <Slider
                  value={[layer.config.pool_size || 2]}
                  onValueChange={([value]) => updateLayerConfig('pool_size', value)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Strides:</Label>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{layer.config.strides || 1}</span>
              <div className="w-16">
                <Slider
                  value={[layer.config.strides || 1]}
                  onValueChange={([value]) => updateLayerConfig('strides', value)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </div>
          </div>
        );

      case 'dropout':
        return (
          <div className="flex items-center gap-3">
            <Label className="text-xs whitespace-nowrap">Taxa de Dropout:</Label>
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{(layer.config.rate || 0.2).toFixed(2)}</span>
            <div className="flex-1 min-w-24">
              <Slider
                value={[layer.config.rate || 0.2]}
                onValueChange={([value]) => updateLayerConfig('rate', value)}
                min={0}
                max={0.8}
                step={0.05}
              />
            </div>
          </div>
        );

      case 'batchnorm':
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Momentum:</Label>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{(layer.config.momentum || 0.99).toFixed(3)}</span>
              <div className="w-20">
                <Slider
                  value={[layer.config.momentum || 0.99]}
                  onValueChange={([value]) => updateLayerConfig('momentum', value)}
                  min={0.1}
                  max={0.999}
                  step={0.001}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Epsilon:</Label>
              <Input
                type="number"
                step="0.0001"
                value={layer.config.epsilon || 0.001}
                onChange={(e) => updateLayerConfig('epsilon', parseFloat(e.target.value))}
                className="h-7 text-xs w-20"
              />
            </div>
          </div>
        );

      case 'attention':
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-xs whitespace-nowrap">Unidades:</Label>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{layer.config.units || 64}</span>
              <div className="flex-1 min-w-16">
                <Slider
                  value={[layer.config.units || 64]}
                  onValueChange={([value]) => updateLayerConfig('units', value)}
                  min={1}
                  max={256}
                  step={1}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Use Scale:</Label>
              <Switch
                checked={layer.config.use_scale || true}
                onCheckedChange={(checked) => updateLayerConfig('use_scale', checked)}
                className="scale-75"
              />
            </div>
          </div>
        );

      default:
        return <div className="text-gray-500 text-xs">Sem configurações específicas</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuração do Modelo</h2>
          <p className="text-muted-foreground">
            Escolha e configure o algoritmo de machine learning para séries temporais
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setAutoConfig(true)} 
            variant="outline"
            disabled={!pipelineData.data}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Auto-Configurar
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!config.algorithm}
          >
            <Check className="w-4 h-4 mr-2" />
            Continuar para Treinamento
          </Button>
        </div>
      </div>

      {/* Informações do Dataset */}
      {pipelineData.data && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Dataset: {pipelineData.data.length} registros | 
            Tipo: {(pipelineData.features?.length || 0) > 1 ? 'Multivariado' : 'Univariado'} | 
            Features: {pipelineData.features?.length || 0}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="algorithm" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="algorithm">Algoritmo</TabsTrigger>
          <TabsTrigger value="hyperparams">Hiperparâmetros</TabsTrigger>
          <TabsTrigger value="validation">Validação</TabsTrigger>
          <TabsTrigger value="optimization">Otimização</TabsTrigger>
        </TabsList>

        {/* Seleção de Algoritmo */}
        <TabsContent value="algorithm" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Algoritmos Clássicos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Clássicos
                </CardTitle>
                <CardDescription>
                  Modelos estatísticos tradicionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {algorithms.classical.map(algo => (
                  <div 
                    key={algo.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      config.algorithm === algo.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                    }`}
                    onClick={() => setConfig(prev => ({ ...prev, algorithm: algo.id, hyperparameters: {} }))}
                  >
                    <div className="font-medium">{algo.name}</div>
                    <div className="text-xs text-gray-600">{algo.description}</div>
        </div>
                ))}
              </CardContent>
            </Card>

            {/* Machine Learning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Machine Learning
                </CardTitle>
                <CardDescription>
                  Algoritmos de aprendizado de máquina
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {algorithms.machine_learning.map(algo => (
                  <div 
                    key={algo.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      config.algorithm === algo.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                    }`}
                    onClick={() => setConfig(prev => ({ ...prev, algorithm: algo.id, hyperparameters: {} }))}
                  >
                    <div className="font-medium">{algo.name}</div>
                    <div className="text-xs text-gray-600">{algo.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Deep Learning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Deep Learning
                </CardTitle>
                <CardDescription>
                  Redes neurais profundas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {algorithms.deep_learning.map(algo => (
                  <div 
                    key={algo.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      config.algorithm === algo.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                    }`}
                    onClick={() => setConfig(prev => ({ ...prev, algorithm: algo.id, hyperparameters: {} }))}
                  >
                    <div className="font-medium">{algo.name}</div>
                    <div className="text-xs text-gray-600">{algo.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Hiperparâmetros */}
        <TabsContent value="hyperparams" className="space-y-4">
          {config.algorithm ? (
            config.algorithm === 'custom' ? (
              // Interface para modelo custom
              <div className="space-y-6">
                {/* Arquitetura do Modelo */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="w-5 h-5" />
                          Arquitetura do Modelo
                        </CardTitle>
                        <CardDescription>
                          Configure as camadas da sua rede neural personalizada
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {customModel.layers.length} camadas
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Lista de Camadas - Layout Otimizado */}
                    <div className="space-y-2">
                      {customModel.layers
                        .sort((a, b) => a.position - b.position)
                        .map((layer, index) => (
                        <div key={layer.id} className="border rounded-lg p-3 bg-gradient-to-r from-gray-50 to-white hover:from-blue-50 hover:to-white transition-all">
                          {/* Header da Camada - Compacto */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <Badge variant={index === customModel.layers.length - 1 ? "default" : "outline"} className="text-xs px-2 py-1">
                                {index + 1}
                              </Badge>
                              <Input
                                value={layer.name}
                                onChange={(e) => updateCustomLayer(layer.id, { name: e.target.value })}
                                className="font-medium bg-white text-sm h-8 flex-1 max-w-xs"
                              />
                              <Badge variant="secondary" className="text-xs">
                                {layer.type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
        <Button 
                                variant="ghost"
                                size="sm"
                                onClick={() => moveCustomLayer(layer.id, 'up')}
                                disabled={index === 0}
                                className="h-7 w-7 p-0"
                              >
                                <ArrowUp className="w-3 h-3" />
        </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveCustomLayer(layer.id, 'down')}
                                disabled={index === customModel.layers.length - 1}
                                className="h-7 w-7 p-0"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCustomLayer(layer.id)}
                                disabled={customModel.layers.length <= 1 || index === customModel.layers.length - 1}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Configurações da Camada - Layout Responsivo */}
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
                            {/* Tipo da Camada */}
                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-gray-600">Tipo</Label>
                              <Select 
                                value={layer.type} 
                                onValueChange={(value: any) => 
                                  updateCustomLayer(layer.id, { 
                                    type: value, 
                                    config: getDefaultLayerConfig(value) 
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="dense">Dense</SelectItem>
                                  <SelectItem value="lstm">LSTM</SelectItem>
                                  <SelectItem value="gru">GRU</SelectItem>
                                  <SelectItem value="conv1d">Conv1D</SelectItem>
                                  <SelectItem value="maxpool1d">MaxPool1D</SelectItem>
                                  <SelectItem value="dropout">Dropout</SelectItem>
                                  <SelectItem value="batchnorm">BatchNorm</SelectItem>
                                  <SelectItem value="attention">Attention</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Configurações específicas da camada - Compactas */}
                            <div className="lg:col-span-3">
                              {renderLayerConfigCompact(layer)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Botões para adicionar camadas - Layout Compacto */}
                    <div className="border-t pt-3 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Adicionar Camada</Label>
                        <span className="text-xs text-gray-500">Nova camada será inserida antes da camada de output</span>
                      </div>
                      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                        {[
                          { type: 'dense', label: 'Dense', icon: '🔗', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
                          { type: 'lstm', label: 'LSTM', icon: '🔄', color: 'bg-green-50 hover:bg-green-100 border-green-200' },
                          { type: 'gru', label: 'GRU', icon: '⚡', color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200' },
                          { type: 'conv1d', label: 'Conv1D', icon: '📊', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
                          { type: 'maxpool1d', label: 'MaxPool', icon: '📉', color: 'bg-red-50 hover:bg-red-100 border-red-200' },
                          { type: 'dropout', label: 'Dropout', icon: '🎲', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
                          { type: 'batchnorm', label: 'BatchNorm', icon: '⚖️', color: 'bg-teal-50 hover:bg-teal-100 border-teal-200' },
                          { type: 'attention', label: 'Attention', icon: '👁️', color: 'bg-pink-50 hover:bg-pink-100 border-pink-200' }
                        ].map(({ type, label, icon, color }) => (
                          <Button
                            key={type}
                            variant="outline"
                            size="sm"
                            onClick={() => addCustomLayer(type as CustomLayer['type'])}
                            className={`flex flex-col items-center gap-1 h-16 text-xs ${color} transition-all`}
                          >
                            <span className="text-lg">{icon}</span>
                            <span className="font-medium">{label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
      </CardContent>
    </Card>

                {/* Configurações de Modelo - Layout Ultra Compacto */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Cog className="w-5 h-5" />
                      Configurações do Modelo
                    </CardTitle>
                    <CardDescription>
                      Otimizador, compilação e parâmetros de treinamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Otimizador - Layout Horizontal Compacto */}
                    <div className="border rounded-lg p-3 bg-gradient-to-r from-blue-50 to-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Cog className="w-4 h-4 text-blue-600" />
                        <Label className="font-medium text-blue-800">Otimizador</Label>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
                        {/* Tipo */}
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">Tipo</Label>
                          <Select 
                            value={customModel.optimizer.type} 
                            onValueChange={(value: any) => 
                              setCustomModel(prev => ({
                                ...prev,
                                optimizer: { ...prev.optimizer, type: value }
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adam">Adam</SelectItem>
                              <SelectItem value="sgd">SGD</SelectItem>
                              <SelectItem value="rmsprop">RMSprop</SelectItem>
                              <SelectItem value="adagrad">Adagrad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Learning Rate */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-gray-600">Learning Rate</Label>
                            <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">
                              {customModel.optimizer.learningRate.toFixed(4)}
                            </span>
                          </div>
                          <Slider
                            value={[customModel.optimizer.learningRate]}
                            onValueChange={([value]) => 
                              setCustomModel(prev => ({
                                ...prev,
                                optimizer: { ...prev.optimizer, learningRate: value }
                              }))
                            }
                            min={0.0001}
                            max={0.1}
                            step={0.0001}
                            className="h-6"
                          />
                        </div>
                        
                        {/* Parâmetros específicos - Adam */}
                        {customModel.optimizer.type === 'adam' && (
                          <>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-gray-600">Beta 1</Label>
                                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">
                                  {(customModel.optimizer.beta1 || 0.9).toFixed(3)}
                                </span>
                              </div>
                              <Slider
                                value={[customModel.optimizer.beta1 || 0.9]}
                                onValueChange={([value]) => 
                                  setCustomModel(prev => ({
                                    ...prev,
                                    optimizer: { ...prev.optimizer, beta1: value }
                                  }))
                                }
                                min={0.1}
                                max={0.999}
                                step={0.001}
                                className="h-6"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-gray-600">Beta 2</Label>
                                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">
                                  {(customModel.optimizer.beta2 || 0.999).toFixed(3)}
                                </span>
                              </div>
                              <Slider
                                value={[customModel.optimizer.beta2 || 0.999]}
                                onValueChange={([value]) => 
                                  setCustomModel(prev => ({
                                    ...prev,
                                    optimizer: { ...prev.optimizer, beta2: value }
                                  }))
                                }
                                min={0.1}
                                max={0.999}
                                step={0.001}
                                className="h-6"
                              />
                            </div>
                          </>
                        )}
                        
                        {/* Parâmetros específicos - SGD */}
                        {customModel.optimizer.type === 'sgd' && (
                          <div className="space-y-1 lg:col-span-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-gray-600">Momentum</Label>
                              <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">
                                {(customModel.optimizer.momentum || 0).toFixed(2)}
                              </span>
                            </div>
                            <Slider
                              value={[customModel.optimizer.momentum || 0]}
                              onValueChange={([value]) => 
                                setCustomModel(prev => ({
                                  ...prev,
                                  optimizer: { ...prev.optimizer, momentum: value }
                                }))
                              }
                              min={0}
                              max={1}
                              step={0.01}
                              className="h-6"
                            />
                          </div>
                        )}
                        
                        {/* Preenchimento para outros otimizadores */}
                        {!['adam', 'sgd'].includes(customModel.optimizer.type) && (
                          <div className="lg:col-span-2 text-xs text-gray-500 italic">
                            Configuração padrão para {customModel.optimizer.type.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compilação e Treinamento - Layout Horizontal */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Compilação */}
                      <div className="border rounded-lg p-3 bg-gradient-to-r from-green-50 to-white">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-green-600" />
                          <Label className="font-medium text-green-800">Compilação</Label>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Função de Perda</Label>
                            <Select 
                              value={customModel.compilation.loss} 
                              onValueChange={(value: any) => 
                                setCustomModel(prev => ({
                                  ...prev,
                                  compilation: { ...prev.compilation, loss: value }
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mse">MSE - Mean Squared Error</SelectItem>
                                <SelectItem value="mae">MAE - Mean Absolute Error</SelectItem>
                                <SelectItem value="huber">Huber - Híbrido MSE/MAE</SelectItem>
                                <SelectItem value="logcosh">LogCosh - Suave</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="p-2 bg-white rounded border text-xs text-gray-600">
                            {customModel.compilation.loss === 'mse' && '📊 Penaliza erros grandes quadraticamente'}
                            {customModel.compilation.loss === 'mae' && '🛡️ Robusto a outliers, erro linear'}
                            {customModel.compilation.loss === 'huber' && '⚖️ Combina MSE e MAE adaptativamente'}
                            {customModel.compilation.loss === 'logcosh' && '🌊 Suave e diferenciável em toda parte'}
                          </div>
                        </div>
                      </div>

                      {/* Treinamento */}
                      <div className="border rounded-lg p-3 bg-gradient-to-r from-purple-50 to-white">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <Label className="font-medium text-purple-800">Treinamento</Label>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Épocas e Batch Size */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-gray-600">Épocas</Label>
                                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">
                                  {customModel.training.epochs}
                                </span>
                              </div>
                              <Slider
                                value={[customModel.training.epochs]}
                                onValueChange={([value]) => 
                                  setCustomModel(prev => ({
                                    ...prev,
                                    training: { ...prev.training, epochs: value }
                                  }))
                                }
                                min={10}
                                max={500}
                                step={10}
                                className="h-6"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-600">Batch Size</Label>
                              <Select 
                                value={customModel.training.batchSize.toString()} 
                                onValueChange={(value) => 
                                  setCustomModel(prev => ({
                                    ...prev,
                                    training: { ...prev.training, batchSize: parseInt(value) }
                                  }))
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="16">16</SelectItem>
                                  <SelectItem value="32">32</SelectItem>
                                  <SelectItem value="64">64</SelectItem>
                                  <SelectItem value="128">128</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* Early Stopping */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-gray-600">Early Stopping</Label>
                              <Switch
                                checked={customModel.training.earlyStopping.enabled}
                                onCheckedChange={(checked) => 
                                  setCustomModel(prev => ({
                                    ...prev,
                                    training: { 
                                      ...prev.training, 
                                      earlyStopping: { ...prev.training.earlyStopping, enabled: checked }
                                    }
                                  }))
                                }
                                className="scale-75"
                              />
                            </div>
                            
                            {customModel.training.earlyStopping.enabled && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-gray-600">Paciência</Label>
                                  <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">
                                    {customModel.training.earlyStopping.patience}
                                  </span>
                                </div>
                                <Slider
                                  value={[customModel.training.earlyStopping.patience]}
                                  onValueChange={([value]) => 
                                    setCustomModel(prev => ({
                                      ...prev,
                                      training: { 
                                        ...prev.training, 
                                        earlyStopping: { ...prev.training.earlyStopping, patience: value }
                                      }
                                    }))
                                  }
                                  min={3}
                                  max={50}
                                  step={1}
                                  className="h-6"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resumo da Configuração */}
                    <div className="border rounded-lg p-3 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-gray-600" />
                        <Label className="font-medium text-gray-800">Resumo da Configuração</Label>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span className="text-gray-600">
                            <strong>{customModel.optimizer.type.toUpperCase()}</strong> 
                            ({customModel.optimizer.learningRate.toFixed(4)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-gray-600">
                            <strong>{customModel.compilation.loss.toUpperCase()}</strong> Loss
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span className="text-gray-600">
                            <strong>{customModel.training.epochs}</strong> épocas
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          <span className="text-gray-600">
                            Batch <strong>{customModel.training.batchSize}</strong>
                            {customModel.training.earlyStopping.enabled && ` + ES(${customModel.training.earlyStopping.patience})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Interface para outros algoritmos
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Hiperparâmetros - {algorithms.classical.concat(algorithms.machine_learning, algorithms.deep_learning).find(a => a.id === config.algorithm)?.name}
                  </CardTitle>
                  <CardDescription>
                    Configure os parâmetros específicos do algoritmo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(currentHyperparams).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(currentHyperparams).map(([key, param]) => 
                        renderHyperparameterControl(key, param)
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Selecione um algoritmo para configurar os hiperparâmetros
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Selecione um algoritmo primeiro para configurar os hiperparâmetros
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Validação */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Estratégia de Validação
              </CardTitle>
              <CardDescription>
                Configure como o modelo será validado usando a divisão dos dados definida anteriormente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informações da Divisão Atual */}
              {(pipelineData.trainSize || pipelineData.validationSize || pipelineData.testSize) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Divisão atual: Treino {pipelineData.trainSize || 70}% | 
                    Validação {pipelineData.validationSize || 15}% | 
                    Teste {pipelineData.testSize || 15}%
                    {pipelineData.data && ` (${pipelineData.data.length} registros total)`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Método de Validação</Label>
                    <Select 
                      value={config.validation.method} 
                      onValueChange={(value: any) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          validation: { ...prev.validation, method: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="holdout">Holdout (Clássico)</SelectItem>
                        <SelectItem value="time_series_split">Time Series Split</SelectItem>
                        <SelectItem value="walk_forward">Walk-Forward Validation</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Descrições dos métodos */}
                    <div className="text-xs text-gray-600 mt-2">
                      {config.validation.method === 'holdout' && (
                        <p>Usa a divisão fixa treino/validação/teste definida anteriormente. Método clássico e mais rápido.</p>
                      )}
                      {config.validation.method === 'time_series_split' && (
                        <p>Divisão temporal respeitando a ordem cronológica dos dados. Ideal para séries temporais.</p>
                      )}
                      {config.validation.method === 'walk_forward' && (
                        <p>Validação progressiva simulando previsões em tempo real. Mais realista mas computacionalmente intensivo.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Usar Conjunto de Validação</Label>
                      <Switch
                        checked={config.validation.useValidationSet}
                        onCheckedChange={(checked) => 
                          setConfig(prev => ({ 
                            ...prev, 
                            validation: { ...prev.validation, useValidationSet: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      {config.validation.useValidationSet 
                        ? "Usa conjunto de validação para ajuste de hiperparâmetros e conjunto de teste para avaliação final."
                        : "Usa apenas treino e teste. Validação será feita no conjunto de teste (menos recomendado)."
                      }
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Métricas de Avaliação</Label>
                    <div className="space-y-2">
                      {[
                        { id: 'mae', name: 'MAE', desc: 'Mean Absolute Error' },
                        { id: 'rmse', name: 'RMSE', desc: 'Root Mean Square Error' },
                        { id: 'mape', name: 'MAPE', desc: 'Mean Absolute Percentage Error' },
                        { id: 'smape', name: 'SMAPE', desc: 'Symmetric MAPE' },
                        { id: 'mase', name: 'MASE', desc: 'Mean Absolute Scaled Error' },
                        { id: 'pocid', name: 'POCID', desc: 'Prediction of Change in Direction' },
                        { id: 'r2', name: 'R²', desc: 'Coefficient of Determination' },
                        { id: 'theil_u1', name: 'Theil U1', desc: 'Theil Inequality Coefficient 1' },
                        { id: 'theil_u2', name: 'Theil U2', desc: 'Theil Inequality Coefficient 2' }
                      ].map(metric => (
                        <div key={metric.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={metric.id}
                            checked={config.metrics.includes(metric.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfig(prev => ({ 
                                  ...prev, 
                                  metrics: [...prev.metrics, metric.id]
                                }));
                              } else {
                                setConfig(prev => ({ 
                                  ...prev, 
                                  metrics: prev.metrics.filter(m => m !== metric.id)
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={metric.id} className="text-sm">
                            <span className="font-medium">{metric.name}</span>
                            <span className="text-gray-500 ml-1">({metric.desc})</span>
                          </Label>
                        </div>
                      ))}
        </div>

                    {/* Função de Avaliação Global */}
                    <div className="mt-4 p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-purple-800">Função de Avaliação Global</Label>
                        <Switch
                          checked={config.metrics.includes('global_score')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setConfig(prev => ({ 
                                ...prev, 
                                metrics: [...prev.metrics, 'global_score']
                              }));
                            } else {
                              setConfig(prev => ({ 
                                ...prev, 
                                metrics: prev.metrics.filter(m => m !== 'global_score')
                              }));
                            }
                          }}
                        />
                      </div>
                      <div className="text-xs text-purple-700 space-y-1">
                        <p>• <strong>Score Global:</strong> Combina todas as métricas selecionadas</p>
                        <p>• <strong>Ponderação:</strong> Erro (40%) + Direção (30%) + Correlação (20%) + Desigualdade (10%)</p>
                        <p>• <strong>Normalização:</strong> Score de 0-100 (maior = melhor)</p>
                        <p>• <strong>Componentes:</strong> MAE/RMSE/MAPE + POCID + R² + Theil U1/U2</p>
                      </div>
                    </div>

                    {/* Seleção Rápida de Métricas */}
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm font-medium">Seleção Rápida</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const basicMetrics = ['mae', 'rmse', 'mape', 'r2'];
                            setConfig(prev => ({ ...prev, metrics: basicMetrics }));
                          }}
                        >
                          Básicas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const advancedMetrics = ['mae', 'rmse', 'mape', 'smape', 'mase', 'pocid', 'r2', 'theil_u1', 'theil_u2'];
                            setConfig(prev => ({ ...prev, metrics: advancedMetrics }));
                          }}
                        >
                          Avançadas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const completeMetrics = ['mae', 'rmse', 'mape', 'smape', 'mase', 'pocid', 'r2', 'theil_u1', 'theil_u2', 'global_score'];
                            setConfig(prev => ({ ...prev, metrics: completeMetrics }));
                          }}
                        >
                          Completas + Global
                        </Button>
        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfig(prev => ({ ...prev, metrics: [] }));
                          }}
                        >
                          Limpar
        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Resumo da Estratégia */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Estratégia Selecionada</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Método: {config.validation.method === 'holdout' ? 'Holdout Clássico' : 
                                   config.validation.method === 'time_series_split' ? 'Time Series Split' : 
                                   'Walk-Forward Validation'}</p>
                      <p>• Validação: {config.validation.useValidationSet ? 'Com conjunto de validação' : 'Apenas treino/teste'}</p>
                      <p>• Métricas ({config.metrics.length}): {
                        config.metrics.length > 0 
                          ? config.metrics.map(m => m.toUpperCase()).join(', ')
                          : 'Nenhuma selecionada'
                      }</p>
                      {config.metrics.includes('global_score') && (
                        <p className="text-purple-700 font-medium">• Score Global: Ativado (combina todas as métricas)</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Otimização */}
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Otimização de Hiperparâmetros
              </CardTitle>
              <CardDescription>
                Configure a busca automática pelos melhores hiperparâmetros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Habilitar Otimização</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Busca automática pelos melhores hiperparâmetros
                  </p>
                </div>
                <Switch
                  checked={config.optimization.enabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      optimization: { ...prev.optimization, enabled: checked }
                    }))
                  }
                />
              </div>

              {config.optimization.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Método de Otimização</Label>
                    <Select 
                      value={config.optimization.method} 
                      onValueChange={(value: any) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          optimization: { ...prev.optimization, method: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid_search">Grid Search</SelectItem>
                        <SelectItem value="random_search">Random Search</SelectItem>
                        <SelectItem value="bayesian">Bayesian Optimization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Iterações: {config.optimization.iterations}</Label>
                    <Slider
                      value={[config.optimization.iterations]}
                      onValueChange={([value]) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          optimization: { ...prev.optimization, iterations: value }
                        }))
                      }
                      min={10}
                      max={200}
                      step={10}
                    />
                  </div>
                </div>
              )}
      </CardContent>
    </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModelConfiguration;
