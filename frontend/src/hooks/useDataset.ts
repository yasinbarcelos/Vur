/**
 * React hooks for dataset operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type {
  Dataset,
  DatasetAnalysis,
  DatasetColumns,
  DatasetProcessingResult,
  DatasetValidation,
  DatasetPreview,
  DatasetUploadForm,
  DatasetListResponse,
  DatasetUploadResponse
} from '@/types/dataset';

// Query keys
export const datasetKeys = {
  all: ['datasets'] as const,
  lists: () => [...datasetKeys.all, 'list'] as const,
  list: (params?: any) => [...datasetKeys.lists(), params] as const,
  details: () => [...datasetKeys.all, 'detail'] as const,
  detail: (id: string) => [...datasetKeys.details(), id] as const,
  analysis: (id: string) => [...datasetKeys.detail(id), 'analysis'] as const,
  columns: (id: string) => [...datasetKeys.detail(id), 'columns'] as const,
  preview: (id: string) => [...datasetKeys.detail(id), 'preview'] as const,
  validation: (id: string) => [...datasetKeys.detail(id), 'validation'] as const,
};

// List datasets
export const useDatasets = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: datasetKeys.list(params),
    queryFn: () => api.datasets.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single dataset
export const useDataset = (id: string) => {
  return useQuery({
    queryKey: datasetKeys.detail(id),
    queryFn: () => api.datasets.get(id),
    enabled: !!id,
  });
};

// Upload dataset
export const useDatasetUpload = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, name, description }: DatasetUploadForm) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }
      
      return api.datasets.upload(file) as Promise<DatasetUploadResponse>;
    },
    onSuccess: (data) => {
      // Invalidate datasets list
      queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
      
      toast({
        title: "Upload realizado com sucesso!",
        description: `Dataset "${data.filename}" foi carregado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Analyze dataset
export const useDatasetAnalysis = (id: string, sampleSize: number = 1000) => {
  return useQuery({
    queryKey: datasetKeys.analysis(id),
    queryFn: () => api.datasets.analyze(id, sampleSize) as Promise<DatasetAnalysis>,
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes - analysis is expensive
  });
};

// Trigger dataset analysis
export const useAnalyzeDataset = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, sampleSize = 1000 }: { id: string; sampleSize?: number }) =>
      api.datasets.analyze(id, sampleSize) as Promise<DatasetAnalysis>,
    onSuccess: (data, variables) => {
      // Update the analysis cache
      queryClient.setQueryData(datasetKeys.analysis(variables.id), data);
      
      // Also invalidate to trigger refetch
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(variables.id) });
      
      toast({
        title: "Análise concluída!",
        description: `Dataset analisado com sucesso. Qualidade: ${(data.data_quality_score * 100).toFixed(1)}%`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Get dataset columns
export const useDatasetColumns = (id: string) => {
  return useQuery({
    queryKey: datasetKeys.columns(id),
    queryFn: () => api.datasets.getColumns(id) as Promise<DatasetColumns>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Process dataset
export const useProcessDataset = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, chunkSize = 10000 }: { id: string; chunkSize?: number }) =>
      api.datasets.process(id, chunkSize) as Promise<DatasetProcessingResult>,
    onSuccess: (data, variables) => {
      // Invalidate dataset details to refresh status
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(variables.id) });
      
      if (data.processing_status === 'completed') {
        toast({
          title: "Processamento concluído!",
          description: `${data.rows_processed} linhas processadas em ${data.processing_time_seconds.toFixed(1)}s`,
        });
      } else {
        toast({
          title: "Processamento falhou",
          description: data.errors.join(', '),
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no processamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Validate dataset
export const useValidateDataset = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.datasets.validate(id) as Promise<DatasetValidation>,
    onSuccess: (data) => {
      if (data.is_valid) {
        toast({
          title: "Validação bem-sucedida!",
          description: "Dataset está pronto para análise de séries temporais.",
        });
      } else {
        toast({
          title: "Problemas encontrados",
          description: `${data.errors.length} erros e ${data.warnings.length} avisos detectados.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na validação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Get dataset preview
export const useDatasetPreview = (id: string, params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: datasetKeys.preview(id),
    queryFn: () => api.datasets.preview(id, params) as Promise<DatasetPreview>,
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Delete dataset
export const useDeleteDataset = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.datasets.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: datasetKeys.detail(id) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
      
      toast({
        title: "Dataset excluído",
        description: "Dataset foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Combined hook for dataset workflow
export const useDatasetWorkflow = (id: string) => {
  const dataset = useDataset(id);
  const analysis = useDatasetAnalysis(id);
  const columns = useDatasetColumns(id);
  const preview = useDatasetPreview(id);
  
  const analyzeDataset = useAnalyzeDataset();
  const processDataset = useProcessDataset();
  const validateDataset = useValidateDataset();
  
  const isLoading = dataset.isLoading || analysis.isLoading || columns.isLoading;
  const hasError = dataset.error || analysis.error || columns.error;
  
  const triggerAnalysis = (sampleSize?: number) => {
    analyzeDataset.mutate({ id, sampleSize });
  };
  
  const triggerProcessing = (chunkSize?: number) => {
    processDataset.mutate({ id, chunkSize });
  };
  
  const triggerValidation = () => {
    validateDataset.mutate(id);
  };
  
  return {
    // Data
    dataset: dataset.data,
    analysis: analysis.data,
    columns: columns.data,
    preview: preview.data,
    
    // States
    isLoading,
    hasError,
    
    // Actions
    triggerAnalysis,
    triggerProcessing,
    triggerValidation,
    
    // Individual mutation states
    isAnalyzing: analyzeDataset.isPending,
    isProcessing: processDataset.isPending,
    isValidating: validateDataset.isPending,
  };
};
