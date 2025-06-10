
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import DataUpload from '@/components/pipeline/DataUpload';
import DataPreprocessing from '@/components/pipeline/DataPreprocessing';
import FeatureEngineering from '@/components/pipeline/FeatureEngineering';
import TrainTestSplit from '@/components/pipeline/TrainTestSplit';
import ModelSelection from '@/components/pipeline/ModelSelection';
import ModelTraining from '@/components/pipeline/ModelTraining';
import Monitoring from '@/components/pipeline/Monitoring';
import { PipelineProvider, usePipeline } from '@/contexts/PipelineContext';

const PipelineSteps = () => {
  const { currentStep, setCurrentStep, completedSteps } = usePipeline();
  
  const steps = [
    { id: 'upload', title: 'Upload dos Dados', component: DataUpload },
    { id: 'preprocessing', title: 'Pré-processamento', component: DataPreprocessing },
    { id: 'features', title: 'Eng. de Atributos', component: FeatureEngineering },
    { id: 'split', title: 'Treino/Teste', component: TrainTestSplit },
    { id: 'model', title: 'Seleção do Modelo', component: ModelSelection },
    { id: 'training', title: 'Treinamento', component: ModelTraining },
    { id: 'monitoring', title: 'Monitoramento', component: Monitoring }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Pipeline de Séries Temporais
          </h1>
          <p className="text-lg text-gray-600">
            Plataforma interativa para modelagem e monitoramento de séries temporais
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  completedSteps.includes(step.id) 
                    ? 'bg-green-500 text-white' 
                    : currentStep === step.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className="text-xs text-gray-600 mt-1 text-center max-w-20">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((completedSteps.length) / steps.length) * 100}%` 
              }}
            />
          </div>
        </Card>

        {/* Navigation Tabs */}
        <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            {steps.map((step) => (
              <TabsTrigger 
                key={step.id} 
                value={step.id}
                className="relative"
                disabled={!completedSteps.includes(step.id) && currentStep !== step.id}
              >
                {step.title}
                {completedSteps.includes(step.id) && (
                  <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0 bg-green-500">
                    ✓
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {steps.map((step) => (
            <TabsContent key={step.id} value={step.id}>
              <step.component />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <PipelineProvider>
      <PipelineSteps />
    </PipelineProvider>
  );
};

export default Index;
