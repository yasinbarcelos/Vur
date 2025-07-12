/**
 * New DataUpload component that integrates with backend APIs
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  BarChart3, 
  Database,
  Eye,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePipeline } from '@/contexts/PipelineContext';
import { useDatasetUpload, useAnalyzeDataset, useDatasetWorkflow } from '@/hooks/useDataset';
import type { DatasetUploadForm } from '@/types/dataset';

const DataUploadNew = () => {
  const { updatePipelineData, goToStep, completeStep } = usePipeline();
  const { toast } = useToast();
  
  // Form state
  const [uploadForm, setUploadForm] = useState<DatasetUploadForm>({
    file: null as any,
    name: '',
    description: '',
    dataset_type: 'time_series'
  });
  
  // Upload state
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  
  // Hooks
  const uploadMutation = useDatasetUpload();
  const analyzeMutation = useAnalyzeDataset();
  const datasetWorkflow = useDatasetWorkflow(uploadedDatasetId || '');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.h5', '.hdf5', '.xlsx', '.xls'];
    const isValidFile = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidFile) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV, Excel ou HDF5 válido",
        variant: "destructive"
      });
      return;
    }

    setUploadForm(prev => ({
      ...prev,
      file,
      name: prev.name || file.name.replace(/\.(csv|h5|hdf5|xlsx|xls)$/i, '')
    }));
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione um arquivo e forneça um nome",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync(uploadForm);
      setUploadedDatasetId(result.dataset_id.toString());
      
      // Trigger automatic analysis
      setTimeout(() => {
        analyzeMutation.mutate({ 
          id: result.dataset_id.toString(),
          sampleSize: 1000 
        });
      }, 1000);
      
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleContinue = () => {
    if (datasetWorkflow.dataset && datasetWorkflow.analysis) {
      // Save data to pipeline context
      updatePipelineData({
        datasetId: uploadedDatasetId,
        dataset: datasetWorkflow.dataset,
        analysis: datasetWorkflow.analysis,
        columns: datasetWorkflow.columns,
        dateColumn: datasetWorkflow.analysis.time_series_info?.date_column || '',
        targetColumn: datasetWorkflow.columns?.suggested_target_columns[0] || ''
      });
      
      completeStep('upload');
      goToStep('preprocessing');
    }
  };

  const renderUploadForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Upload dos Dados</h2>
        <p className="text-muted-foreground mt-2">
          Faça upload do seu arquivo de dados para análise (CSV, Excel ou HDF5)
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Informações do Dataset
          </CardTitle>
          <CardDescription>
            Faça upload do seu arquivo de dados para análise (CSV, Excel ou HDF5)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Arquivo de Dados *</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
              {uploadForm.file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{uploadForm.file.name}</span>
                  <Badge variant="secondary">
                    {(uploadForm.file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="font-medium">Clique para selecionar</span>
                    <span className="text-sm text-muted-foreground block">CSV, Excel (.xlsx, .xls) ou HDF5 (.h5, .hdf5)</span>
                  </Label>
                </>
              )}
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.h5,.hdf5,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploadMutation.isPending}
              />
            </div>
          </div>

          {/* Dataset Name */}
          <div className="space-y-2">
            <Label htmlFor="dataset-name">Nome do Dataset *</Label>
            <Input
              id="dataset-name"
              value={uploadForm.name}
              onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Vendas Mensais 2024"
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="dataset-description">Descrição (opcional)</Label>
            <Input
              id="dataset-description"
              value={uploadForm.description}
              onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva brevemente o conteúdo do dataset"
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Upload Button */}
          <Button 
            onClick={handleUpload}
            disabled={!uploadForm.file || !uploadForm.name.trim() || uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fazendo upload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </>
            )}
          </Button>

          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso do upload</span>
                <span>Processando...</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderAnalysisResults = () => {
    if (!datasetWorkflow.analysis) return null;

    const analysis = datasetWorkflow.analysis;
    const qualityScore = Math.round(analysis.data_quality_score * 100);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Análise Concluída</h2>
          <p className="text-muted-foreground mt-2">
            Seu dataset foi analisado com sucesso
          </p>
        </div>

        {/* Quality Score */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Qualidade dos Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">{qualityScore}%</div>
                <div className="text-sm text-muted-foreground">Pontuação de Qualidade</div>
              </div>
            </div>
            <Progress value={qualityScore} className="w-full" />
          </CardContent>
        </Card>

        {/* Dataset Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-4 text-center">
              <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{analysis.total_rows.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Linhas</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{analysis.total_columns}</div>
              <div className="text-sm text-muted-foreground">Colunas</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{analysis.memory_usage_mb.toFixed(1)} MB</div>
              <div className="text-sm text-muted-foreground">Tamanho</div>
            </CardContent>
          </Card>
        </div>

        {/* Time Series Info */}
        {analysis.time_series_info && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Informações da Série Temporal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Coluna de Data:</span>
                <Badge variant="secondary">{analysis.time_series_info.date_column}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Frequência:</span>
                <Badge variant="outline">{analysis.time_series_info.frequency || 'Detectando...'}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Período:</span>
                <span className="text-sm">
                  {analysis.time_series_info.start_date} até {analysis.time_series_info.end_date}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Recomendações</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <div className="text-center">
          <Button onClick={handleContinue} size="lg">
            <Eye className="w-4 h-4 mr-2" />
            Continuar para Pré-processamento
          </Button>
        </div>
      </div>
    );
  };

  // Show analysis results if we have them
  if (uploadedDatasetId && datasetWorkflow.analysis && !analyzeMutation.isPending) {
    return renderAnalysisResults();
  }

  // Show loading state during analysis
  if (uploadedDatasetId && (datasetWorkflow.isLoading || analyzeMutation.isPending)) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Analisando Dataset</h2>
          <p className="text-muted-foreground mt-2">
            Aguarde enquanto analisamos seus dados...
          </p>
        </div>
        
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
            <div className="space-y-2">
              <div className="font-medium">Processando arquivo</div>
              <div className="text-sm text-muted-foreground">
                Detectando colunas, tipos de dados e padrões...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show upload form by default
  return renderUploadForm();
};

export default DataUploadNew;
