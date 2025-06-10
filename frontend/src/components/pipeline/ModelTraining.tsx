
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { Play, CheckCircle, Download, TrendingUp } from 'lucide-react';

const ModelTraining = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);

  // Métricas simuladas
  const [metrics, setMetrics] = useState({
    rmse: 0,
    mae: 0,
    mape: 0,
    r2: 0
  });

  // Dados simulados para previsão vs real
  const predictionData = [
    { date: '2024-01', real: 120, predicted: 118 },
    { date: '2024-02', real: 135, predicted: 133 },
    { date: '2024-03', real: 140, predicted: 142 },
    { date: '2024-04', real: 125, predicted: 127 },
    { date: '2024-05', real: 150, predicted: 148 },
    { date: '2024-06', real: 145, predicted: 143 }
  ];

  const startTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingLogs([]);
    
    const logs = [
      'Iniciando treinamento do modelo...',
      'Preparando dados de treino...',
      'Aplicando features de engenharia...',
      'Configurando hiperparâmetros...',
      'Treinando modelo...',
      'Validando modelo...',
      'Calculando métricas...',
      'Treinamento concluído!'
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTrainingLogs(prev => [...prev, logs[i]]);
      setTrainingProgress(((i + 1) / logs.length) * 100);
    }

    // Simular métricas finais
    setMetrics({
      rmse: 8.5,
      mae: 6.2,
      mape: 4.8,
      r2: 0.92
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Treinamento do Modelo
          </CardTitle>
          <CardDescription>
            Execute o treinamento e avalie a performance do modelo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status do Treinamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  Modelo: {pipelineData.algorithm || 'Não selecionado'}
                </h3>
                <p className="text-sm text-gray-600">
                  {trainingComplete ? 'Treinamento concluído' : 
                   isTraining ? 'Treinando...' : 'Pronto para treinar'}
                </p>
              </div>
              <div className="flex gap-2">
                {trainingComplete && (
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completo
                  </Badge>
                )}
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
                disabled={isTraining || trainingComplete}
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

      {trainingComplete && (
        <Button onClick={handleContinue} className="w-full">
          Finalizar Pipeline
        </Button>
      )}
    </div>
  );
};

export default ModelTraining;
