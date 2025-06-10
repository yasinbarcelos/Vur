
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface PipelineData {
  file?: File;
  data?: any[];
  columns?: string[];
  targetColumn?: string;
  dateColumn?: string;
  preprocessingConfig?: any;
  processedData?: any[];
  features?: string[];
  trainSize?: number;
  modelingType?: 'univariate' | 'multivariate';
  predictionHorizon?: 'single' | 'multiple';
  algorithm?: string;
  steps?: number;
  trainedModel?: any;
}

interface PipelineContextType {
  currentStep: string;
  setCurrentStep: (step: string) => void;
  completedSteps: string[];
  pipelineData: PipelineData;
  updatePipelineData: (data: Partial<PipelineData>) => void;
  completeStep: (step: string) => void;
}

const PipelineContext = createContext<PipelineContextType | null>(null);

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
};

export const PipelineProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState('upload');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineData>({});

  const updatePipelineData = (data: Partial<PipelineData>) => {
    setPipelineData(prev => ({ ...prev, ...data }));
  };

  const completeStep = (step: string) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
    
    // Auto-advance to next step
    const stepOrder = ['upload', 'preprocessing', 'features', 'split', 'model', 'training'];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  return (
    <PipelineContext.Provider value={{
      currentStep,
      setCurrentStep,
      completedSteps,
      pipelineData,
      updatePipelineData,
      completeStep,
    }}>
      {children}
    </PipelineContext.Provider>
  );
};
