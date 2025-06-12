import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  Upload, 
  Download, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  BarChart3, 
  Database,
  Settings,
  Play,
  Pause,
  Monitor,
  Cpu,
  HardDrive,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Pipeline {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'training';
  created: string;
  lastRun: string;
  accuracy: number;
  type: 'univariate' | 'multivariate';
  algorithm: string;
}

interface Model {
  id: string;
  name: string;
  pipelineId: string;
  version: string;
  accuracy: number;
  status: 'deployed' | 'training' | 'failed';
  created: string;
  type: 'ARIMA' | 'LSTM' | 'Prophet' | 'RandomForest';
  metrics: {
    mae: number;
    rmse: number;
    mape: number;
  };
}

interface Database {
  id: string;
  name: string;
  type: 'PostgreSQL' | 'MySQL' | 'MongoDB' | 'SQLite';
  status: 'connected' | 'disconnected' | 'error';
  host: string;
  lastSync: string;
  recordCount: number;
}

interface RealTimePrediction {
  timestamp: string;
  predicted: number;
  actual?: number;
  confidence_lower: number;
  confidence_upper: number;
  model: string;
  accuracy: number;
}

const MonitoringPage = () => {
  const { toast } = useToast();
  
  // Estados principais
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);
  const [realTimePredictions, setRealTimePredictions] = useState<RealTimePrediction[]>([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 45,
    memory: 62,
    disk: 78,
    network: 23
  });

  // Dados simulados
  const availablePipelines: Pipeline[] = [
    {
      id: 'pipeline_1',
      name: 'Pipeline Vendas Q4',
      status: 'active',
      created: '2024-01-15',
      lastRun: '2024-01-20 14:30',
      accuracy: 94.2,
      type: 'univariate',
      algorithm: 'ARIMA'
    },
    {
      id: 'pipeline_2',
      name: 'Pipeline Demanda Multi',
      status: 'active',
      created: '2024-01-10',
      lastRun: '2024-01-20 13:45',
      accuracy: 91.8,
      type: 'multivariate',
      algorithm: 'LSTM'
    },
    {
      id: 'pipeline_3',
      name: 'Pipeline Preços Sazonais',
      status: 'training',
      created: '2024-01-18',
      lastRun: '2024-01-20 12:15',
      accuracy: 89.5,
      type: 'univariate',
      algorithm: 'Prophet'
    }
  ];

  const availableModels: Model[] = [
    {
      id: 'model_1',
      name: 'ARIMA-v2.1',
      pipelineId: 'pipeline_1',
      version: '2.1.0',
      accuracy: 94.2,
      status: 'deployed',
      created: '2024-01-15',
      type: 'ARIMA',
      metrics: { mae: 2.3, rmse: 3.1, mape: 4.2 }
    },
    {
      id: 'model_2',
      name: 'LSTM-Multi-v1.5',
      pipelineId: 'pipeline_2',
      version: '1.5.2',
      accuracy: 91.8,
      status: 'deployed',
      created: '2024-01-12',
      type: 'LSTM',
      metrics: { mae: 3.1, rmse: 4.2, mape: 5.1 }
    },
    {
      id: 'model_3',
      name: 'Prophet-Seasonal-v1.0',
      pipelineId: 'pipeline_3',
      version: '1.0.1',
      accuracy: 89.5,
      status: 'training',
      created: '2024-01-18',
      type: 'Prophet',
      metrics: { mae: 3.8, rmse: 4.9, mape: 6.2 }
    }
  ];

  const availableDatabases: Database[] = [
    {
      id: 'db_1',
      name: 'Produção Principal',
      type: 'PostgreSQL',
      status: 'connected',
      host: 'prod-db.company.com',
      lastSync: '2024-01-20 14:45',
      recordCount: 1250000
    },
    {
      id: 'db_2',
      name: 'Analytics Warehouse',
      type: 'MySQL',
      status: 'connected',
      host: 'analytics-db.company.com',
      lastSync: '2024-01-20 14:30',
      recordCount: 850000
    },
    {
      id: 'db_3',
      name: 'Backup Histórico',
      type: 'MongoDB',
      status: 'disconnected',
      host: 'backup-db.company.com',
      lastSync: '2024-01-19 23:15',
      recordCount: 2100000
    }
  ];

  // Filtrar modelos baseado no pipeline selecionado
  const filteredModels = selectedPipeline 
    ? availableModels.filter(model => model.pipelineId === selectedPipeline)
    : availableModels;

  // Simulação de previsões em tempo real
  const generateRealTimePrediction = useCallback(() => {
    if (!selectedModel || !selectedDatabase || !isRealTimeActive) return;

    const model = availableModels.find(m => m.id === selectedModel);
    if (!model) return;

    const now = new Date();
    const baseValue = 100 + Math.sin(now.getTime() / 10000) * 20;
    const noise = (Math.random() - 0.5) * 10;
    const predicted = baseValue + noise;
    
    const newPrediction: RealTimePrediction = {
      timestamp: now.toLocaleTimeString(),
      predicted: Math.round(predicted * 100) / 100,
      confidence_lower: Math.round((predicted - 5) * 100) / 100,
      confidence_upper: Math.round((predicted + 5) * 100) / 100,
      model: model.name,
      accuracy: model.accuracy
    };

    setRealTimePredictions(prev => {
      const updated = [...prev, newPrediction];
      return updated.slice(-20); // Manter apenas os últimos 20 pontos
    });
  }, [selectedModel, selectedDatabase, isRealTimeActive, availableModels]);

  // Efeito para simulação em tempo real
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRealTimeActive && selectedModel && selectedDatabase) {
      interval = setInterval(generateRealTimePrediction, 2000); // A cada 2 segundos
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTimeActive, selectedModel, selectedDatabase, generateRealTimePrediction]);

  // Simulação de métricas do sistema
  useEffect(() => {
    const updateSystemMetrics = () => {
      setSystemMetrics(prev => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(95, prev.memory + (Math.random() - 0.5) * 8)),
        disk: Math.max(30, Math.min(85, prev.disk + (Math.random() - 0.5) * 5)),
        network: Math.max(5, Math.min(100, prev.network + (Math.random() - 0.5) * 15))
      }));
    };

    const interval = setInterval(updateSystemMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePipelineSelect = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    setSelectedModel(''); // Reset model selection
    setRealTimePredictions([]); // Clear predictions
    
    const pipeline = availablePipelines.find(p => p.id === pipelineId);
    toast({
      title: "Pipeline selecionado!",
      description: `Pipeline "${pipeline?.name}" carregado com sucesso`,
    });
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setRealTimePredictions([]); // Clear predictions
    
    const model = availableModels.find(m => m.id === modelId);
    toast({
      title: "Modelo selecionado!",
      description: `Modelo "${model?.name}" pronto para monitoramento`,
    });
  };

  const handleDatabaseSelect = (databaseId: string) => {
    setSelectedDatabase(databaseId);
    
    const database = availableDatabases.find(d => d.id === databaseId);
    toast({
      title: "Banco de dados conectado!",
      description: `Conectado ao "${database?.name}" com sucesso`,
    });
  };

  const toggleRealTimeMonitoring = () => {
    if (!selectedPipeline || !selectedModel || !selectedDatabase) {
      toast({
        title: "Configuração incompleta",
        description: "Selecione pipeline, modelo e banco de dados primeiro",
        variant: "destructive"
      });
      return;
    }

    setIsRealTimeActive(!isRealTimeActive);
    
    if (!isRealTimeActive) {
      toast({
        title: "Monitoramento iniciado!",
        description: "Previsões em tempo real ativadas",
      });
    } else {
      toast({
        title: "Monitoramento pausado",
        description: "Previsões em tempo real pausadas",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'deployed':
      case 'connected':
        return 'bg-green-500';
      case 'training':
        return 'bg-yellow-500';
      case 'inactive':
      case 'failed':
      case 'disconnected':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'deployed':
      case 'connected':
        return <CheckCircle className="w-4 h-4" />;
      case 'training':
        return <Clock className="w-4 h-4" />;
      case 'inactive':
      case 'failed':
      case 'disconnected':
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Monitoramento em Tempo Real
          </h1>
          <p className="text-lg text-gray-600">
            Monitore pipelines, modelos e previsões em tempo real
          </p>
        </div>

        {/* Seleção de Componentes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seleção de Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Pipeline
              </CardTitle>
              <CardDescription>
                Selecione um pipeline ativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedPipeline} onValueChange={handlePipelineSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {availablePipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(pipeline.status)}`}></div>
                        {pipeline.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedPipeline && (
                <div className="mt-4 space-y-2">
                  {(() => {
                    const pipeline = availablePipelines.find(p => p.id === selectedPipeline);
                    return pipeline ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <Badge className={getStatusColor(pipeline.status)}>
                            {pipeline.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Acurácia:</span>
                          <span className="font-medium">{pipeline.accuracy}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Algoritmo:</span>
                          <span className="font-medium">{pipeline.algorithm}</span>
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seleção de Modelo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Modelo
              </CardTitle>
              <CardDescription>
                Selecione um modelo treinado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedModel} 
                onValueChange={handleModelSelect}
                disabled={!selectedPipeline}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(model.status)}
                        {model.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedModel && (
                <div className="mt-4 space-y-2">
                  {(() => {
                    const model = availableModels.find(m => m.id === selectedModel);
                    return model ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Versão:</span>
                          <span className="font-medium">{model.version}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>MAE:</span>
                          <span className="font-medium">{model.metrics.mae}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>RMSE:</span>
                          <span className="font-medium">{model.metrics.rmse}</span>
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seleção de Banco de Dados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Banco de Dados
              </CardTitle>
              <CardDescription>
                Selecione a fonte de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedDatabase} onValueChange={handleDatabaseSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um banco" />
                </SelectTrigger>
                <SelectContent>
                  {availableDatabases.map((database) => (
                    <SelectItem key={database.id} value={database.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(database.status)}`}></div>
                        {database.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedDatabase && (
                <div className="mt-4 space-y-2">
                  {(() => {
                    const database = availableDatabases.find(d => d.id === selectedDatabase);
                    return database ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Tipo:</span>
                          <span className="font-medium">{database.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Registros:</span>
                          <span className="font-medium">{database.recordCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Última Sync:</span>
                          <span className="font-medium text-xs">{database.lastSync}</span>
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Controles de Monitoramento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Controles de Monitoramento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={toggleRealTimeMonitoring}
                  disabled={!selectedPipeline || !selectedModel || !selectedDatabase}
                  className={isRealTimeActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {isRealTimeActive ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar Monitoramento
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Iniciar Monitoramento
                    </>
                  )}
                </Button>
                
                {isRealTimeActive && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600 font-medium">Ativo</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Dados
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas do Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">CPU</p>
                  <p className="text-2xl font-bold">{Math.round(systemMetrics.cpu)}%</p>
                </div>
                <Cpu className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.cpu}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Memória</p>
                  <p className="text-2xl font-bold">{Math.round(systemMetrics.memory)}%</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.memory}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Disco</p>
                  <p className="text-2xl font-bold">{Math.round(systemMetrics.disk)}%</p>
                </div>
                <HardDrive className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.disk}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rede</p>
                  <p className="text-2xl font-bold">{Math.round(systemMetrics.network)}%</p>
                </div>
                <Zap className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemMetrics.network}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Previsões em Tempo Real */}
        {realTimePredictions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Previsões em Tempo Real
                {isRealTimeActive && (
                  <Badge className="bg-green-500 ml-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
                    Ao Vivo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Previsões geradas automaticamente com intervalos de confiança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={realTimePredictions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="confidence_upper"
                      stackId="1"
                      stroke="#94a3b8"
                      fill="#e2e8f0"
                      fillOpacity={0.3}
                      name="Limite Superior"
                    />
                    <Area
                      type="monotone"
                      dataKey="confidence_lower"
                      stackId="1"
                      stroke="#94a3b8"
                      fill="#ffffff"
                      fillOpacity={1}
                      name="Limite Inferior"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Predição"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* Estatísticas das Previsões */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Última Predição</p>
                  <p className="text-xl font-bold text-green-600">
                    {realTimePredictions[realTimePredictions.length - 1]?.predicted.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Média das Predições</p>
                  <p className="text-xl font-bold text-blue-600">
                    {(realTimePredictions.reduce((sum, p) => sum + p.predicted, 0) / realTimePredictions.length).toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Predições</p>
                  <p className="text-xl font-bold text-purple-600">
                    {realTimePredictions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status dos Componentes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status do Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPipeline ? (
                (() => {
                  const pipeline = availablePipelines.find(p => p.id === selectedPipeline);
                  return pipeline ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Nome:</span>
                        <span className="font-medium">{pipeline.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge className={getStatusColor(pipeline.status)}>
                          {getStatusIcon(pipeline.status)}
                          <span className="ml-1">{pipeline.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Última Execução:</span>
                        <span className="text-sm">{pipeline.lastRun}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tipo:</span>
                        <Badge variant="outline">{pipeline.type}</Badge>
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum pipeline selecionado</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status do Modelo</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedModel ? (
                (() => {
                  const model = availableModels.find(m => m.id === selectedModel);
                  return model ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Nome:</span>
                        <span className="font-medium">{model.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge className={getStatusColor(model.status)}>
                          {getStatusIcon(model.status)}
                          <span className="ml-1">{model.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Acurácia:</span>
                        <span className="font-bold text-green-600">{model.accuracy}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>MAPE:</span>
                        <span className="font-medium">{model.metrics.mape}%</span>
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum modelo selecionado</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status do Banco</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDatabase ? (
                (() => {
                  const database = availableDatabases.find(d => d.id === selectedDatabase);
                  return database ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Nome:</span>
                        <span className="font-medium">{database.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge className={getStatusColor(database.status)}>
                          {getStatusIcon(database.status)}
                          <span className="ml-1">{database.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Host:</span>
                        <span className="text-sm font-mono">{database.host}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Registros:</span>
                        <span className="font-medium">{database.recordCount.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum banco selecionado</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
