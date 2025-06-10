
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Activity, Upload, Download, TrendingUp, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';

const MonitoringPage = () => {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState('');
  const [newDataFile, setNewDataFile] = useState<File | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [driftMetrics, setDriftMetrics] = useState({
    dataDrift: 0.15,
    performanceDrift: 0.08,
    status: 'warning'
  });

  // Modelos disponíveis simulados
  const availableModels = [
    { id: 'model_1', name: 'ARIMA Univariado - Vendas', type: 'univariable', steps: 'single', accuracy: 94.2 },
    { id: 'model_2', name: 'LSTM Multivariado - Demanda', type: 'multivariable', steps: 'multiple', accuracy: 91.8 },
    { id: 'model_3', name: 'Prophet Univariado - Preços', type: 'univariable', steps: 'multiple', accuracy: 89.5 },
    { id: 'model_4', name: 'Random Forest Multi-step', type: 'multivariable', steps: 'multiple', accuracy: 87.3 }
  ];

  // Histórico de previsões simulado
  const predictionHistory = [
    { date: '2024-01-01', actual: 120, predicted: 118, model: 'ARIMA' },
    { date: '2024-01-02', actual: 125, predicted: 123, model: 'ARIMA' },
    { date: '2024-01-03', actual: 130, predicted: 132, model: 'LSTM' },
    { date: '2024-01-04', actual: 135, predicted: 133, model: 'LSTM' },
    { date: '2024-01-05', actual: 140, predicted: 142, model: 'Prophet' },
    { date: '2024-01-06', actual: 145, predicted: 143, model: 'Prophet' }
  ];

  // Métricas de drift
  const driftData = [
    { metric: 'KL Divergence', value: 0.15, threshold: 0.2 },
    { metric: 'Population Stability', value: 0.08, threshold: 0.1 },
    { metric: 'Mean Shift', value: 0.12, threshold: 0.15 },
    { metric: 'Variance Shift', value: 0.05, threshold: 0.1 }
  ];

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    toast({
      title: "Modelo selecionado!",
      description: `Modelo ${modelId} carregado para inferência`,
    });
  };

  const handleNewDataUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewDataFile(file);
      toast({
        title: "Dados carregados!",
        description: `Arquivo ${file.name} pronto para inferência`,
      });
    }
  };

  const generatePredictions = () => {
    if (!selectedModel || !newDataFile) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um modelo e carregue dados",
        variant: "destructive"
      });
      return;
    }

    // Simular geração de previsões
    const newPredictions = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      predicted: Math.round(140 + Math.random() * 20),
      confidence_lower: Math.round(130 + Math.random() * 15),
      confidence_upper: Math.round(150 + Math.random() * 15)
    }));

    setPredictions(newPredictions);
    toast({
      title: "Previsões geradas!",
      description: `${newPredictions.length} previsões criadas com sucesso`,
    });
  };

  const retrain = () => {
    toast({
      title: "Retreinamento iniciado!",
      description: "Modelo será retreinado com novos dados",
    });
  };

  const exportResults = () => {
    toast({
      title: "Exportação iniciada!",
      description: "Resultados serão exportados em CSV",
    });
  };

  const getModelBadgeColor = (type: string, steps: string) => {
    if (type === 'univariable' && steps === 'single') return 'bg-blue-500';
    if (type === 'univariable' && steps === 'multiple') return 'bg-green-500';
    if (type === 'multivariable' && steps === 'single') return 'bg-orange-500';
    return 'bg-purple-500';
  };

  const getDriftColor = (value: number, threshold: number) => {
    if (value > threshold) return 'bg-red-500';
    if (value > threshold * 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Monitoramento de Modelos
          </h1>
          <p className="text-lg text-gray-600">
            Monitore e faça inferências com modelos treinados
          </p>
        </div>

        {/* Seleção de Modelo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Seleção de Modelo
            </CardTitle>
            <CardDescription>
              Escolha um modelo previamente treinado para monitoramento e inferência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableModels.map((model) => (
                <Card 
                  key={model.id} 
                  className={`cursor-pointer transition-all ${selectedModel === model.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => handleModelSelect(model.id)}
                >
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-2">{model.name}</div>
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        <Badge className={getModelBadgeColor(model.type, model.steps)}>
                          {model.type === 'univariable' ? 'Univariável' : 'Multivariável'}
                        </Badge>
                        <Badge variant="outline">
                          {model.steps === 'single' ? 'Único Passo' : 'Múltiplos Passos'}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {model.accuracy}% Acurácia
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upload e Inferência */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Novos Dados para Inferência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Label htmlFor="inference-upload" className="cursor-pointer">
                  <span className="text-lg font-medium text-gray-900">
                    Upload de novos dados
                  </span>
                  <Input
                    id="inference-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleNewDataUpload}
                    className="hidden"
                  />
                </Label>
                {newDataFile && (
                  <p className="text-green-600 mt-2">
                    Arquivo: {newDataFile.name}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={generatePredictions}
                  className="flex-1"
                  disabled={!selectedModel || !newDataFile}
                >
                  Gerar Previsões
                </Button>
                <Button onClick={exportResults} variant="outline">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Detecção de Drift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {driftData.map((item) => (
                  <div key={item.metric} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.metric}</span>
                    <div className="flex items-center gap-2">
                      <div className="text-sm">{item.value.toFixed(3)}</div>
                      <div className={`w-3 h-3 rounded-full ${getDriftColor(item.value, item.threshold)}`}></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button onClick={retrain} className="w-full mt-4" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retreinar Modelo
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Previsões Geradas */}
        {predictions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Previsões Geradas</CardTitle>
              <CardDescription>
                Novas previsões com intervalos de confiança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={predictions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Predição"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="confidence_lower" 
                      stroke="#94a3b8" 
                      strokeDasharray="5 5"
                      name="Limite Inferior"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="confidence_upper" 
                      stroke="#94a3b8" 
                      strokeDasharray="5 5"
                      name="Limite Superior"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico de Previsões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Histórico de Previsões
            </CardTitle>
            <CardDescription>
              Comparação entre valores reais e preditos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={predictionHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actual" fill="#ef4444" name="Valor Real" />
                  <Bar dataKey="predicted" fill="#10b981" name="Predição" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonitoringPage;
