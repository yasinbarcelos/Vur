import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface Pipeline {
  id: number;
  name: string;
  description?: string;
  pipeline_type: 'univariate' | 'multivariate';
  status: 'created' | 'configured' | 'training' | 'completed' | 'failed';
  algorithm?: string;
  dataset_id?: number;
  target_column?: string;
  date_column?: string;
  features?: string[];
  hyperparameters?: Record<string, any>;
  configuration?: Record<string, any>;
  owner_id: number;
  created_at: string;
  updated_at?: string;
}

export interface PipelineListResponse {
  pipelines: Pipeline[];
  total: number;
  page: number;
  per_page: number;
}

export interface CreatePipelineData {
  name: string;
  description?: string;
  pipeline_type: 'univariate' | 'multivariate';
  algorithm?: string;
  dataset_id?: number;
  target_column?: string;
  date_column?: string;
  features?: string[];
  hyperparameters?: Record<string, any>;
}

interface StepData {
  [key: string]: any;
}

export const pipelineKeys = {
  all: ['pipelines'] as const,
  lists: () => [...pipelineKeys.all, 'list'] as const,
  list: (params?: any) => [...pipelineKeys.lists(), params] as const,
  details: () => [...pipelineKeys.all, 'detail'] as const,
  detail: (id: number) => [...pipelineKeys.details(), id] as const,
  steps: (id: number) => [...pipelineKeys.detail(id), 'steps'] as const,
  step: (id: number, stepName: string) => [...pipelineKeys.steps(id), stepName] as const,
};

export const usePipelines = (params?: { page?: number; per_page?: number }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: pipelinesData,
    isLoading,
    error,
    refetch
  } = useQuery<PipelineListResponse>({
    queryKey: pipelineKeys.list(params),
    queryFn: async (): Promise<PipelineListResponse> => {
      const response = await api.get('/pipelines', { params });
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createPipelineMutation = useMutation({
    mutationFn: (data: CreatePipelineData) => api.post('/pipelines', data),
    onSuccess: (newPipeline) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      toast({
        title: "Pipeline criado!",
        description: `Pipeline "${newPipeline.name}" foi criado com sucesso.`,
      });
      return newPipeline;
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar pipeline",
        description: error.response?.data?.detail || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const deletePipelineMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/pipelines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      toast({
        title: "Pipeline deletado!",
        description: "Pipeline foi deletado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar pipeline",
        description: error.response?.data?.detail || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const duplicatePipelineMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/pipelines/${id}/duplicate`);
      return response;
    },
    onSuccess: (newPipeline) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      toast({
        title: "Pipeline duplicado!",
        description: `Pipeline "${newPipeline.name}" foi criado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao duplicar pipeline",
        description: error.response?.data?.detail || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const pipelines = pipelinesData?.pipelines || [];
  const total = pipelinesData?.total || 0;

  return {
    pipelines,
    total,
    isLoading,
    error,
    refetch,
    createPipeline: createPipelineMutation.mutate,
    isCreating: createPipelineMutation.isPending,
    deletePipeline: deletePipelineMutation.mutate,
    isDeleting: deletePipelineMutation.isPending,
    duplicatePipeline: duplicatePipelineMutation.mutate,
    isDuplicating: duplicatePipelineMutation.isPending,
  };
};

export const usePipelineFlow = (id: string) => {
  const { toast } = useToast();

  const {
    data: pipelineFlow,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: pipelineKeys.detail(parseInt(id)),
    queryFn: async (): Promise<Pipeline> => {
      const response = await api.get(`/pipelines/${id}`);
      return response;
    },
    enabled: !!id && id !== 'new',
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    pipelineFlow,
    isLoading,
    error,
    refetch,
  };
};

export const useCreatePipeline = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePipelineData): Promise<Pipeline> => {
      const response = await api.post('/pipelines', data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      toast({
        title: "Pipeline criado!",
        description: `Pipeline "${data.name}" foi criado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar pipeline",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdatePipeline = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreatePipelineData> }): Promise<Pipeline> => {
      const response = await api.put(`/pipelines/${id}`, data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar pipeline",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeletePipeline = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/pipelines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      toast({
        title: "Pipeline deletado!",
        description: "Pipeline foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar pipeline",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDuplicatePipeline = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number): Promise<Pipeline> => {
      const response = await api.post(`/pipelines/${id}/duplicate`);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      toast({
        title: "Pipeline duplicado!",
        description: `Cópia "${data.name}" foi criada com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao duplicar pipeline",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdatePipelineStep = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      pipelineId, 
      stepName, 
      stepData 
    }: { 
      pipelineId: number; 
      stepName: string; 
      stepData: StepData 
    }): Promise<void> => {
      await api.put(`/pipelines/${pipelineId}/steps/${stepName}`, stepData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: pipelineKeys.step(variables.pipelineId, variables.stepName) 
      });
      queryClient.invalidateQueries({ 
        queryKey: pipelineKeys.detail(variables.pipelineId) 
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar step:', error);
      // Não mostrar toast de erro para não interferir no fluxo
    },
  });
};

export const useCompletePipelineStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      pipelineId, 
      stepName 
    }: { 
      pipelineId: number; 
      stepName: string 
    }): Promise<void> => {
      await api.post(`/pipelines/${pipelineId}/complete-step/${stepName}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: pipelineKeys.detail(variables.pipelineId) 
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao completar step:', error);
      // Não mostrar toast de erro para não interferir no fluxo
    },
  });
};

export const usePipelineStep = (pipelineId: number, stepName: string) => {
  return useQuery({
    queryKey: pipelineKeys.step(pipelineId, stepName),
    queryFn: async (): Promise<any> => {
      const response = await api.get(`/pipelines/${pipelineId}/steps/${stepName}`);
      return response;
    },
    enabled: !!pipelineId && !!stepName,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}; 