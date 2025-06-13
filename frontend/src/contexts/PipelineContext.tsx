import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface PipelineData {
  file?: File;
  datasetId?: number;
  datasetName?: string;
  pipelineId?: number;
  data?: any[];
  columns?: string[];
  targetColumn?: string;
  dateColumn?: string;
  totalRows?: number;
  preprocessingConfig?: any;
  processedData?: any[];
  features?: string[];
  trainSize?: number;
  validationSize?: number;
  testSize?: number;
  modelingType?: 'univariate' | 'multivariate';
  predictionHorizon?: 'single' | 'multiple';
  algorithm?: string;
  steps?: number;
  trainedModel?: any;
  modelConfig?: any;
}

interface PipelineContextType {
  currentStep: string;
  setCurrentStep: (step: string) => void;
  completedSteps: string[];
  pipelineData: PipelineData;
  updatePipelineData: (data: Partial<PipelineData>) => void;
  completeStep: (step: string) => void;
  goToStep: (step: string) => void;
  clearSavedState: () => void;
  exportConfiguration: () => void;
  importConfiguration: (file: File) => Promise<boolean>;
  hasSavedState: boolean;
  steps: string[];
}

interface PipelineState {
  currentStep: string;
  completedSteps: string[];
  data: PipelineData;
  lastSaved?: Date;
  version: number;
}

const STORAGE_KEY = 'vur_pipeline_state';
const STORAGE_VERSION = 1;

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export const PipelineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const steps = ['upload', 'preview', 'split', 'preprocessing', 'features', 'model', 'training'];
  
  // Função para carregar estado do localStorage
  const loadSavedState = (): PipelineState | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      
      const state = JSON.parse(saved) as PipelineState;
      
      // Verificar versão para compatibilidade
      if (state.version !== STORAGE_VERSION) {
        console.warn('Pipeline state version mismatch, clearing saved state');
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      // Verificar se o estado salvo é de hoje (ou dos últimos 7 dias)
      if (state.lastSaved) {
        const savedDate = new Date(state.lastSaved);
        const daysDiff = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 7) {
          console.warn('Pipeline state too old, clearing saved state');
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
      }
      
      return state;
    } catch (error) {
      console.error('Error loading saved pipeline state:', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  };

  // Carregar estado inicial
  const savedState = loadSavedState();
  
  const [currentStep, setCurrentStep] = useState<string>(savedState?.currentStep || steps[0]);
  const [completedSteps, setCompletedSteps] = useState<string[]>(savedState?.completedSteps || []);
  const [pipelineData, setPipelineData] = useState<PipelineData>(savedState?.data || {
    columns: [],
    data: [],
    dateColumn: '',
    targetColumn: ''
  });

  // Função para salvar estado no localStorage
  const saveState = (currentStep: string, completedSteps: string[], data: PipelineData) => {
    try {
      const state: PipelineState = {
        currentStep,
        completedSteps,
        data,
        lastSaved: new Date(),
        version: STORAGE_VERSION
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving pipeline state:', error);
    }
  };

  // Auto-salvar quando estado muda
  useEffect(() => {
    // Só salvar se há dados significativos
    if (pipelineData.data && pipelineData.data.length > 0) {
      saveState(currentStep, completedSteps, pipelineData);
    }
  }, [currentStep, completedSteps, pipelineData]);

  const updatePipelineData = (updates: Partial<PipelineData>) => {
    setPipelineData(prev => {
      const newData = { ...prev, ...updates };
      return newData;
    });
  };

  const completeStep = (step: string) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
    
    const currentIndex = steps.indexOf(step);
    const nextStep = steps[currentIndex + 1];
    
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const goToStep = (step: string) => {
    setCurrentStep(step);
  };

  // Função para limpar estado salvo
  const clearSavedState = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(steps[0]);
    setCompletedSteps([]);
    setPipelineData({
      file: undefined,
      data: [],
      columns: [],
      targetColumn: '',
      dateColumn: '',
      preprocessingConfig: undefined,
      processedData: undefined,
      features: undefined,
      trainSize: undefined,
      validationSize: undefined,
      testSize: undefined,
      modelingType: undefined,
      predictionHorizon: undefined,
      algorithm: undefined,
      steps: undefined,
      trainedModel: undefined,
      modelConfig: undefined
    });
  };

  // Função para exportar configuração
  const exportConfiguration = () => {
    const config = {
      currentStep,
      completedSteps,
      pipelineData,
      exportedAt: new Date().toISOString(),
      version: STORAGE_VERSION
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vur_pipeline_config_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Função para importar configuração
  const importConfiguration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          
          // Validar estrutura básica
          if (config.currentStep && config.completedSteps && config.pipelineData) {
            setCurrentStep(config.currentStep);
            setCompletedSteps(config.completedSteps);
            setPipelineData(config.pipelineData);
            saveState(config.currentStep, config.completedSteps, config.pipelineData);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          console.error('Error importing configuration:', error);
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  };

  const value: PipelineContextType = {
    currentStep,
    completedSteps,
    steps,
      pipelineData,
      updatePipelineData,
      completeStep,
    goToStep,
    clearSavedState,
    exportConfiguration,
    importConfiguration,
    hasSavedState: !!savedState
  };

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (context === undefined) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
};
