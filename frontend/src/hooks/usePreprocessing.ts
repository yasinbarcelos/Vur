
import { useState } from 'react';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';

export interface PreprocessingConfig {
  handleMissing: string;
  normalization: string;
  transformation: string;
  removeOutliers: boolean;
  outlierThreshold: number[];
}

export const usePreprocessing = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<PreprocessingConfig>({
    handleMissing: 'forward_fill',
    normalization: 'none',
    transformation: 'none',
    removeOutliers: false,
    outlierThreshold: [2.5]
  });

  const generateProcessedData = () => {
    const originalData = [
      { date: '2024-01', original: 100, processed: 100 },
      { date: '2024-02', original: 120, processed: 118 },
      { date: '2024-03', original: 95, processed: 97 },
      { date: '2024-04', original: 150, processed: 145 },
      { date: '2024-05', original: 110, processed: 112 },
      { date: '2024-06', original: 130, processed: 128 }
    ];
    
    return originalData;
  };

  const handleApplyPreprocessing = () => {
    const processedData = generateProcessedData();
    updatePipelineData({ 
      preprocessingConfig: config,
      processedData: processedData
    });
    
    toast({
      title: "Pré-processamento aplicado!",
      description: "Dados transformados com sucesso",
    });
  };

  const handleContinue = () => {
    completeStep('preprocessing');
    toast({
      title: "Etapa concluída!",
      description: "Pré-processamento configurado com sucesso",
    });
  };

  return {
    config,
    setConfig,
    handleApplyPreprocessing,
    handleContinue,
    pipelineData
  };
};
