
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { Brain, Settings } from 'lucide-react';

const ModelSelection = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState('arima');
  const [hyperparams, setHyperparams] = useState({
    arima: { p: 1, d: 1, q: 1, seasonal: false, P: 1, D: 1, Q: 1, s: 12 },
    prophet: { changepoint_prior_scale: 0.05, seasonality_prior_scale: 10, yearly: true, weekly: true, daily: false },
    randomforest: { n_estimators: 100, max_depth: 10, min_samples_split: 2, min_samples_leaf: 1 },
    xgboost: { n_estimators: 100, max_depth: 6, learning_rate: 0.1, subsample: 0.8 }
  });

  const models = [
    {
      id: 'arima',
      name: 'ARIMA/SARIMA',
      description: 'Modelo clássico para séries temporais com tendência e sazonalidade',
      pros: ['Interpretável', 'Bom para séries estacionárias', 'Tradicionalmente eficaz'],
      cons: ['Requer estacionariedade', 'Limitado para relações não-lineares']
    },
    {
      id: 'prophet',
      name: 'Prophet (Facebook)',
      description: 'Modelo robusto para séries com sazonalidade forte e feriados',
      pros: ['Lida bem com missing data', 'Detecta automaticamente sazonalidade', 'Flexível'],
      cons: ['Pode ser lento', 'Menos interpretável que ARIMA']
    },
    {
      id: 'randomforest',
      name: 'Random Forest',
      description: 'Ensemble de árvores para capturar relações complexas',
      pros: ['Robusto a outliers', 'Não assume distribuição', 'Feature importance'],
      cons: ['Pode overfittar', 'Menos interpretável']
    },
    {
      id: 'xgboost',
      name: 'XGBoost',
      description: 'Gradient boosting otimizado para alta performance',
      pros: ['Excelente performance', 'Lida bem com features', 'Rápido'],
      cons: ['Muitos hiperparâmetros', 'Pode overfittar']
    }
  ];

  const updateHyperparam = (model: string, param: string, value: any) => {
    setHyperparams(prev => ({
      ...prev,
      [model]: {
        ...prev[model as keyof typeof prev],
        [param]: value
      }
    }));
  };

  const handleContinue = () => {
    const config = {
      modelType: selectedModel,
      hyperparameters: hyperparams[selectedModel as keyof typeof hyperparams],
      modelName: models.find(m => m.id === selectedModel)?.name
    };
    
    updatePipelineData({ algorithm: selectedModel });
    completeStep('model');
    toast({
      title: "Etapa concluída!",
      description: `Modelo ${config.modelName} configurado com sucesso`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Seleção do Modelo
          </CardTitle>
          <CardDescription>
            Escolha o algoritmo mais adequado para sua série temporal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map((model) => (
              <Card 
                key={model.id}
                className={`cursor-pointer transition-all ${
                  selectedModel === model.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedModel(model.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{model.name}</h3>
                    {selectedModel === model.id && (
                      <Badge className="bg-blue-500">Selecionado</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{model.description}</p>
                  
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs font-medium text-green-700">Vantagens:</Label>
                      <ul className="text-xs text-green-600 list-disc list-inside">
                        {model.pros.map((pro, index) => (
                          <li key={index}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-orange-700">Limitações:</Label>
                      <ul className="text-xs text-orange-600 list-disc list-inside">
                        {model.cons.map((con, index) => (
                          <li key={index}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Hiperparâmetros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração de Hiperparâmetros
          </CardTitle>
          <CardDescription>
            Ajuste os parâmetros do modelo selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedModel} onValueChange={setSelectedModel}>
            <TabsList className="grid grid-cols-4 w-full">
              {models.map((model) => (
                <TabsTrigger key={model.id} value={model.id}>
                  {model.name.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ARIMA Parameters */}
            <TabsContent value="arima" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="arima-p">p (AR order)</Label>
                  <Input
                    id="arima-p"
                    type="number"
                    value={hyperparams.arima.p}
                    onChange={(e) => updateHyperparam('arima', 'p', parseInt(e.target.value))}
                    min="0"
                    max="5"
                  />
                </div>
                <div>
                  <Label htmlFor="arima-d">d (Differencing)</Label>
                  <Input
                    id="arima-d"
                    type="number"
                    value={hyperparams.arima.d}
                    onChange={(e) => updateHyperparam('arima', 'd', parseInt(e.target.value))}
                    min="0"
                    max="2"
                  />
                </div>
                <div>
                  <Label htmlFor="arima-q">q (MA order)</Label>
                  <Input
                    id="arima-q"
                    type="number"
                    value={hyperparams.arima.q}
                    onChange={(e) => updateHyperparam('arima', 'q', parseInt(e.target.value))}
                    min="0"
                    max="5"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Prophet Parameters */}
            <TabsContent value="prophet" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prophet-changepoint">Changepoint Prior Scale</Label>
                  <Input
                    id="prophet-changepoint"
                    type="number"
                    step="0.01"
                    value={hyperparams.prophet.changepoint_prior_scale}
                    onChange={(e) => updateHyperparam('prophet', 'changepoint_prior_scale', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="prophet-seasonality">Seasonality Prior Scale</Label>
                  <Input
                    id="prophet-seasonality"
                    type="number"
                    value={hyperparams.prophet.seasonality_prior_scale}
                    onChange={(e) => updateHyperparam('prophet', 'seasonality_prior_scale', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Random Forest Parameters */}
            <TabsContent value="randomforest" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rf-estimators">N Estimators</Label>
                  <Input
                    id="rf-estimators"
                    type="number"
                    value={hyperparams.randomforest.n_estimators}
                    onChange={(e) => updateHyperparam('randomforest', 'n_estimators', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="rf-depth">Max Depth</Label>
                  <Input
                    id="rf-depth"
                    type="number"
                    value={hyperparams.randomforest.max_depth}
                    onChange={(e) => updateHyperparam('randomforest', 'max_depth', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>

            {/* XGBoost Parameters */}
            <TabsContent value="xgboost" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="xgb-estimators">N Estimators</Label>
                  <Input
                    id="xgb-estimators"
                    type="number"
                    value={hyperparams.xgboost.n_estimators}
                    onChange={(e) => updateHyperparam('xgboost', 'n_estimators', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="xgb-learning">Learning Rate</Label>
                  <Input
                    id="xgb-learning"
                    type="number"
                    step="0.01"
                    value={hyperparams.xgboost.learning_rate}
                    onChange={(e) => updateHyperparam('xgboost', 'learning_rate', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleContinue} className="w-full mt-6">
            Continuar para Treinamento
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelSelection;
