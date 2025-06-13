import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Split, 
  Settings, 
  Wrench, 
  Brain, 
  Play, 
  Monitor,
  ChevronRight,
  Save,
  Download,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Search,
  ArrowLeft,
  MoreVertical,
  Calendar,
  Target,
  Activity
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DataUpload from '@/components/pipeline/DataUpload';
import DataPreview from '@/components/pipeline/DataPreview';
import DataPreprocessing from '@/components/pipeline/DataPreprocessing';
import FeatureEngineering from '@/components/pipeline/FeatureEngineering';
import TrainTestSplit from '@/components/pipeline/TrainTestSplit';
import ModelConfiguration from '@/components/pipeline/ModelConfiguration';
import ModelTraining from '@/components/pipeline/ModelTraining';
import Monitoring from '@/components/pipeline/Monitoring';
import { PipelineProvider, usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { usePipelines, Pipeline as PipelineType, usePipelineFlow } from '@/hooks/usePipelines';

// Componente do fluxo de criação/edição (código anterior)
const PipelineSteps = ({ pipelineId, onBack }: { pipelineId?: number; onBack: () => void }) => {
  const { 
    currentStep, 
    setCurrentStep, 
    completedSteps, 
    pipelineData,
    updatePipelineData,
    clearSavedState,
    exportConfiguration,
    importConfiguration,
    hasSavedState,
    goToStep
  } = usePipeline();
  
  const { toast } = useToast();
  const [showPersistenceMenu, setShowPersistenceMenu] = useState(false);
  
  // Carregar dados do pipeline se estiver editando
  const { pipelineFlow } = usePipelineFlow(pipelineId || null);

  // Definir pipeline ID no contexto quando carregado
  React.useEffect(() => {
    if (pipelineId && !pipelineData.pipelineId) {
      updatePipelineData({ pipelineId });
    }
  }, [pipelineId, pipelineData.pipelineId, updatePipelineData]);
  
  const steps = [
    { 
      id: 'upload', 
      title: 'Upload dos Dados', 
      shortTitle: 'Upload',
      description: 'Carregue e analise seus dados de série temporal',
      component: DataUpload,
      icon: Upload,
      color: 'bg-blue-500'
    },
    { 
      id: 'preview', 
      title: 'Preview dos Dados', 
      shortTitle: 'Preview',
      description: 'Visualize e configure seus dados',
      component: DataPreview,
      icon: FileText,
      color: 'bg-cyan-500'
    },
    { 
      id: 'split', 
      title: 'Divisão dos Dados', 
      shortTitle: 'Divisão',
      description: 'Configure a divisão treino/validação/teste',
      component: TrainTestSplit,
      icon: Split,
      color: 'bg-green-500'
    },
    { 
      id: 'preprocessing', 
      title: 'Pré-processamento', 
      shortTitle: 'Preprocessing',
      description: 'Transforme e normalize os dados',
      component: DataPreprocessing,
      icon: Settings,
      color: 'bg-yellow-500'
    },
    { 
      id: 'features', 
      title: 'Eng. de Atributos', 
      shortTitle: 'Features',
      description: 'Crie e selecione características relevantes',
      component: FeatureEngineering,
      icon: Wrench,
      color: 'bg-purple-500'
    },
    { 
      id: 'model', 
      title: 'Config. do Modelo', 
      shortTitle: 'Modelo',
      description: 'Escolha e configure o algoritmo',
      component: ModelConfiguration,
      icon: Brain,
      color: 'bg-indigo-500'
    },
    { 
      id: 'training', 
      title: 'Treinamento', 
      shortTitle: 'Treino',
      description: 'Treine e valide o modelo',
      component: ModelTraining,
      icon: Play,
      color: 'bg-red-500'
    }
  ];

  // Calcular progresso geral
  const progressPercentage = (completedSteps.length / steps.length) * 100;
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const currentStepInfo = steps[currentStepIndex];

  // Função para obter status do passo
  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    if (steps.findIndex(s => s.id === stepId) < currentStepIndex) return 'accessible';
    return 'disabled';
  };

  // Função para import de configuração
  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    importConfiguration(file).then(success => {
      if (success) {
        toast({
          title: "Configuração importada!",
          description: "Pipeline restaurado com sucesso",
        });
      } else {
        toast({
          title: "Erro na importação",
          description: "Arquivo de configuração inválido",
          variant: "destructive"
        });
      }
    });
    
    // Reset input
    event.target.value = '';
  };

  // Função para limpar estado
  const handleClearState = () => {
    clearSavedState();
    toast({
      title: "Estado limpo",
      description: "Pipeline resetado para o início",
    });
    setShowPersistenceMenu(false);
  };

  // Função para exportar configuração
  const handleExportConfig = () => {
    exportConfiguration();
    toast({
      title: "Configuração exportada!",
      description: "Arquivo de configuração salvo",
    });
    setShowPersistenceMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Principal */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {pipelineId ? 'Editar Pipeline' : 'Novo Pipeline'}
                  </h1>
                  <p className="text-sm text-gray-600">Modelagem de Séries Temporais</p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="hidden md:flex items-center gap-3 ml-8">
                <div className="text-sm text-gray-600">Progresso:</div>
                <div className="w-32">
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {completedSteps.length}/{steps.length}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Save/Export Menu */}
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPersistenceMenu(!showPersistenceMenu)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
                
                {showPersistenceMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                    <div className="py-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={handleExportConfig}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Configuração
                      </Button>
                      
                      <label className="block">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start cursor-pointer"
                          asChild
                        >
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Importar Configuração
                          </span>
                        </Button>
                        <input 
                          type="file" 
                          accept=".json"
                          onChange={handleImportConfig}
                          className="hidden" 
                        />
                      </label>
                      
                      {hasSavedState && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={handleClearState}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Limpar Estado
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Info Button */}
              <Button variant="outline" size="sm">
                <Info className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb e Status */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Pipeline</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                {currentStepInfo?.title}
              </span>
              {currentStepInfo && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{currentStepInfo.description}</span>
                </>
              )}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              {pipelineData.data && pipelineData.data.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>{pipelineData.data.length} registros carregados</span>
                </div>
              )}
              
              {hasSavedState && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <FileText className="w-4 h-4" />
                  <span>Estado salvo automaticamente</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Progress Stepper Visual */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div 
                    className={`
                      relative w-12 h-12 rounded-full border-2 flex items-center justify-center cursor-pointer
                      transition-all duration-200 hover:scale-105
                      ${status === 'completed' 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : status === 'current'
                        ? `${step.color} border-transparent text-white shadow-lg`
                        : status === 'accessible'
                        ? 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
                        : 'border-gray-200 bg-gray-50 text-gray-300'
                      }
                    `}
                    onClick={() => {
                      if (status === 'completed' || status === 'current' || status === 'accessible') {
                        goToStep(step.id);
                      }
                    }}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : status === 'current' ? (
                      <Icon className="w-6 h-6" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    
                    {status === 'current' && (
                      <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-pulse" />
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <div className="mt-2 text-center">
                    <div className={`
                      text-xs font-medium 
                      ${status === 'current' ? 'text-gray-900' : 'text-gray-600'}
                    `}>
                      {step.shortTitle}
                    </div>
                    {status === 'current' && (
                      <div className="text-xs text-gray-500 mt-1 max-w-20">
                        {step.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      absolute top-6 left-6 w-full h-0.5 -z-10
                      ${completedSteps.includes(step.id) && completedSteps.includes(steps[index + 1].id)
                        ? 'bg-green-500'
                        : completedSteps.includes(step.id)
                        ? 'bg-gradient-to-r from-green-500 to-gray-300'
                        : 'bg-gray-300'
                      }
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning se não há dados */}
        {(!pipelineData.data || pipelineData.data.length === 0) && currentStep !== 'upload' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum dado carregado. <Button variant="link" className="p-0 h-auto" onClick={() => goToStep('upload')}>
                Vá para a etapa de upload
              </Button> para começar.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
          <TabsList className="hidden">
            {steps.map((step) => (
              <TabsTrigger key={step.id} value={step.id} />
            ))}
          </TabsList>

          {steps.map((step) => (
            <TabsContent key={step.id} value={step.id} className="mt-0">
              <step.component />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

// Componente principal da lista de pipelines
const PipelineList = ({ onCreateNew, onEditPipeline }: { 
  onCreateNew: () => void;
  onEditPipeline: (pipelineId: number) => void;
}) => {
  const { 
    pipelines, 
    total, 
    isLoading, 
    createPipeline, 
    isCreating,
    deletePipeline,
    duplicatePipeline 
  } = usePipelines();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDescription, setNewPipelineDescription] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Filtrar pipelines pelo termo de busca
  const filteredPipelines = pipelines.filter(pipeline =>
    pipeline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pipeline.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) return;
    
    createPipeline({
      name: newPipelineName.trim(),
      description: newPipelineDescription.trim() || undefined,
    });
    
    setShowCreateDialog(false);
    setNewPipelineName('');
    setNewPipelineDescription('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'training': return 'bg-blue-500';
      case 'configuring': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'training': return 'Treinando';
      case 'configuring': return 'Configurando';
      case 'failed': return 'Falhou';
      case 'created': return 'Criado';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pipelines</h1>
              <p className="text-gray-600 mt-1">
                Gerencie seus pipelines de modelagem de séries temporais
              </p>
            </div>
            <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Pipeline
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar pipelines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Concluídos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pipelines.filter(p => p.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Em Progresso</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pipelines.filter(p => ['configuring', 'training'].includes(p.status)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Com Erro</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pipelines.filter(p => p.status === 'failed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipelines Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPipelines.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum pipeline encontrado' : 'Nenhum pipeline criado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Tente ajustar sua busca para encontrar o que procura.'
                  : 'Comece criando seu primeiro pipeline de modelagem.'
                }
              </p>
              {!searchTerm && (
                <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Pipeline
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPipelines.map((pipeline) => (
              <Card key={pipeline.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{pipeline.name}</CardTitle>
                      {pipeline.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {pipeline.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditPipeline(pipeline.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicatePipeline(pipeline)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmId(pipeline.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge className={`${getStatusColor(pipeline.status)} text-white`}>
                        {getStatusText(pipeline.status)}
                      </Badge>
                    </div>
                    
                    {/* Algorithm */}
                    {pipeline.algorithm && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Algoritmo:</span>
                        <span className="text-sm font-medium">{pipeline.algorithm}</span>
                      </div>
                    )}
                    
                    {/* Progress */}
                    {pipeline.current_step && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Etapa atual:</span>
                        <span className="text-sm font-medium capitalize">{pipeline.current_step}</span>
                      </div>
                    )}
                    
                    {/* Dates */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        Criado em {formatDate(pipeline.created_at)}
                      </div>
                      {pipeline.updated_at && (
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          Atualizado em {formatDate(pipeline.updated_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => onEditPipeline(pipeline.id)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    {pipeline.status === 'completed' && (
                      <Button variant="outline" size="sm">
                        <Target className="w-3 h-3 mr-1" />
                        Prever
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Pipeline Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Pipeline</DialogTitle>
            <DialogDescription>
              Defina um nome e descrição para seu novo pipeline de modelagem.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Pipeline</Label>
              <Input
                id="name"
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="Ex: Previsão de Vendas Q4"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                value={newPipelineDescription}
                onChange={(e) => setNewPipelineDescription(e.target.value)}
                placeholder="Descreva o objetivo deste pipeline..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreatePipeline}
              disabled={!newPipelineName.trim() || isCreating}
            >
              {isCreating ? 'Criando...' : 'Criar Pipeline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este pipeline? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deletePipeline(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente principal que gerencia o estado
const Pipeline = () => {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPipelineId, setEditingPipelineId] = useState<number | null>(null);

  const handleCreateNew = () => {
    setEditingPipelineId(null);
    setView('create');
  };

  const handleEditPipeline = (pipelineId: number) => {
    setEditingPipelineId(pipelineId);
    setView('edit');
  };

  const handleBackToList = () => {
    setView('list');
    setEditingPipelineId(null);
  };

  if (view === 'list') {
    return (
      <PipelineList 
        onCreateNew={handleCreateNew}
        onEditPipeline={handleEditPipeline}
      />
    );
  }

  return (
    <PipelineProvider>
      <PipelineSteps 
        pipelineId={editingPipelineId || undefined}
        onBack={handleBackToList} 
      />
    </PipelineProvider>
  );
};

export default Pipeline;
