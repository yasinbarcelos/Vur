
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertTriangle, RefreshCw, Upload, TrendingUp } from 'lucide-react';

const Monitoring = () => {
  const { pipelineData } = usePipeline();
  const { toast } = useToast();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [modelPerformance, setModelPerformance] = useState({
    currentAccuracy: 92.5,
    trend: 'stable',
    lastUpdate: new Date().toLocaleString(),
    alertsCount: 0
  });

  // Dados simulados para monitoramento em tempo real
  const [monitoringData, setMonitoringData] = useState([
    { timestamp: '09:00', actual: 120, predicted: 118, error: 2 },
    { timestamp: '10:00', actual: 125, predicted: 123, error: 2 },
    { timestamp: '11:00', actual: 130, predicted: 132, error: -2 },
    { timestamp: '12:00', actual: 135, predicted: 133, error: 2 },
    { timestamp: '13:00', actual: 140, predicted: 142, error: -2 },
    { timestamp: '14:00', actual: 145, predicted: 143, error: 2 }
  ]);

  const [performanceHistory, setPerformanceHistory] = useState([
    { date: 'Semana 1', accuracy: 94.2, mae: 5.8 },
    { date: 'Semana 2', accuracy: 93.8, mae: 6.1 },
    { date: 'Semana 3', accuracy: 92.5, mae: 6.5 },
    { date: 'Semana 4', accuracy: 91.8, mae: 7.2 }
  ]);

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        // Simular nova previsão
        const newDataPoint = {
          timestamp: new Date().toLocaleTimeString().slice(0, 5),
          actual: Math.round(140 + Math.random() * 20),
          predicted: Math.round(138 + Math.random() * 20),
          error: 0
        };
        newDataPoint.error = newDataPoint.actual - newDataPoint.predicted;
        
        setMonitoringData(prev => [...prev.slice(-5), newDataPoint]);
        
        // Atualizar performance
        setModelPerformance(prev => ({
          ...prev,
          lastUpdate: new Date().toLocaleString(),
          currentAccuracy: 90 + Math.random() * 10
        }));
      }, 3000); // Atualizar a cada 3 segundos

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    toast({
      title: "Monitoramento iniciado!",
      description: "Acompanhando previsões em tempo real",
    });
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    toast({
      title: "Monitoramento pausado",
      description: "Monitoramento interrompido pelo usuário",
    });
  };

  const retrainModel = () => {
    toast({
      title: "Retreinamento iniciado!",
      description: "Modelo será retreinado com novos dados",
    });
  };

  const uploadNewData = () => {
    toast({
      title: "Upload de dados",
      description: "Funcionalidade de upload habilitada",
    });
  };

  const getStatusColor = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-500';
    if (accuracy >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Status Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status do Monitoramento
          </CardTitle>
          <CardDescription>
            Acompanhe a performance do modelo em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {modelPerformance.currentAccuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Acurácia Atual</div>
              <Badge className={getStatusColor(modelPerformance.currentAccuracy)}>
                {modelPerformance.trend}
              </Badge>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {monitoringData.length}
              </div>
              <div className="text-sm text-gray-600">Previsões Hoje</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {modelPerformance.alertsCount}
              </div>
              <div className="text-sm text-gray-600">Alertas Ativos</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {isMonitoring ? 'ATIVO' : 'INATIVO'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
              {isMonitoring && (
                <div className="flex items-center justify-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 ml-1">Ao vivo</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`flex items-center gap-2 ${isMonitoring ? 'bg-red-500 hover:bg-red-600' : ''}`}
            >
              <Activity className="w-4 h-4" />
              {isMonitoring ? 'Pausar Monitoramento' : 'Iniciar Monitoramento'}
            </Button>
            
            <Button 
              onClick={retrainModel} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retreinar Modelo
            </Button>
            
            <Button 
              onClick={uploadNewData} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Novos Dados
            </Button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Última atualização: {modelPerformance.lastUpdate}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Monitoramento em Tempo Real - Só aparece quando monitoramento está ativo */}
      {isMonitoring && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              Previsões em Tempo Real
            </CardTitle>
            <CardDescription>
              Acompanhe as previsões mais recentes do modelo (atualiza a cada 3 segundos)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monitoringData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    name="Valor Real"
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Predição"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Histórico de Performance
          </CardTitle>
          <CardDescription>
            Evolução da performance do modelo ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="accuracy" orientation="left" />
                <YAxis yAxisId="mae" orientation="right" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="accuracy"
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Acurácia (%)"
                />
                <Line 
                  yAxisId="mae"
                  type="monotone" 
                  dataKey="mae" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="MAE"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Alertas e Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertas e Configurações
          </CardTitle>
          <CardDescription>
            Configure alertas para monitoramento automático
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accuracy-threshold">Limiar de Acurácia Mínima (%)</Label>
              <Input
                id="accuracy-threshold"
                type="number"
                defaultValue="85"
                min="50"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="error-threshold">Limiar de Erro Máximo</Label>
              <Input
                id="error-threshold"
                type="number"
                defaultValue="10"
                min="1"
                max="50"
              />
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-green-800">Sistema Operacional</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Todos os sistemas funcionando normalmente. Nenhum alerta ativo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Monitoring;
