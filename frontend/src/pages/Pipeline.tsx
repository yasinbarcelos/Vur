import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  FileText
} from 'lucide-react';
import DataUpload from '@/components/pipeline/DataUpload';
import DataPreprocessing from '@/components/pipeline/DataPreprocessing';
import FeatureEngineering from '@/components/pipeline/FeatureEngineering';
import TrainTestSplit from '@/components/pipeline/TrainTestSplit';
import ModelConfiguration from '@/components/pipeline/ModelConfiguration';
import ModelTraining from '@/components/pipeline/ModelTraining';
import Monitoring from '@/components/pipeline/Monitoring';
import { PipelineProvider, usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';

const PipelineSteps = () => {
  const { 
    currentStep, 
    setCurrentStep, 
    completedSteps, 
    pipelineData,
    clearSavedState,
    exportConfiguration,
    importConfiguration,
    hasSavedState,
    goToStep
  } = usePipeline();
  
  const { toast } = useToast();
  const [showPersistenceMenu, setShowPersistenceMenu] = useState(false);
  
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
    },
    { 
      id: 'monitoring', 
      title: 'Monitoramento', 
      shortTitle: 'Monitor',
      description: 'Monitore performance e resultados',
      component: Monitoring,
      icon: Monitor,
      color: 'bg-gray-500'
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Pipeline VUR</h1>
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

            {/* Actions Menu */}
            <div className="flex items-center gap-2">
              {/* Persistence Menu */}
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPersistenceMenu(!showPersistenceMenu)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Dados
                </Button>
                
                {showPersistenceMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-2 space-y-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={handleExportConfig}
                        disabled={!pipelineData.data || pipelineData.data.length === 0}
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

const Pipeline = () => {
  return (
    <PipelineProvider>
      <PipelineSteps />
    </PipelineProvider>
  );
};

export default Pipeline;
