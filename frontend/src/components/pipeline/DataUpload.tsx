import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Check, RefreshCw, AlertTriangle, Database, Eye, Plus, Search, Calendar, Target } from 'lucide-react';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Dataset, DatasetListResponse, DatasetUploadResponse, DatasetPreview } from '@/types/dataset';

const DataUpload = () => {
  const { pipelineData, updatePipelineData, goToStep, clearSavedState, completeStep, updateStepData, completeStepRemote } = usePipeline();
  const { toast } = useToast();
  
  // Estados para upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  
  // Estados para datasets existentes
  const [existingDatasets, setExistingDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Estados para busca
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar datasets existentes ao montar o componente
  useEffect(() => {
    loadExistingDatasets();
  }, []);

  // Função para carregar datasets existentes
  const loadExistingDatasets = async () => {
    setIsLoadingDatasets(true);
    try {
      const response: DatasetListResponse = await api.datasets.list({ limit: 100 });
      setExistingDatasets(response.datasets);
    } catch (error) {
      toast({
        title: "Erro ao carregar datasets",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  // Função para detectar tipo de dados
  const detectDataType = (values: any[]): string => {
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonEmptyValues.length === 0) return 'empty';
    
    const sample = nonEmptyValues.slice(0, 100);
    
    // Verificar se é data
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
      /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
      /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
    ];
    
    const dateCount = sample.filter(v => 
      datePatterns.some(pattern => pattern.test(String(v))) || 
      !isNaN(Date.parse(String(v)))
    ).length;
    
    if (dateCount / sample.length > 0.7) return 'date';
    
    // Verificar se é numérico
    const numericCount = sample.filter(v => !isNaN(Number(v))).length;
    if (numericCount / sample.length > 0.8) {
      const hasDecimals = sample.some(v => String(v).includes('.') || String(v).includes(','));
      return hasDecimals ? 'float' : 'integer';
    }
    
    return 'text';
  };

  // Função para detectar colunas automaticamente
  const detectColumns = (data: any[], headers: string[]) => {
    const suggestions = {
      dateColumn: '',
      targetColumn: '',
      numericColumns: [] as string[],
      issues: [] as string[]
    };

    headers.forEach(header => {
      const values = data.map(row => row[header]);
      const dataType = detectDataType(values);
      
      if (dataType === 'date' && !suggestions.dateColumn) {
        suggestions.dateColumn = header;
      }
      
      if ((dataType === 'float' || dataType === 'integer') && !suggestions.targetColumn) {
        suggestions.targetColumn = header;
      }
      
      if (dataType === 'float' || dataType === 'integer') {
        suggestions.numericColumns.push(header);
      }
    });

    return suggestions;
  };

  // Função para upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      toast({
        title: "Erro no upload",
        description: "Por favor, selecione um arquivo CSV válido",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
    
    // Gerar nome padrão se não fornecido
    if (!datasetName) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setDatasetName(nameWithoutExtension);
    }
  };

  // Função para processar e salvar dataset
  const handleSaveDataset = async () => {
    if (!uploadedFile || !datasetName.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um arquivo e informe um nome para o dataset",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(10);

    try {
      setUploadProgress(30);
      
      // Create form data for the upload
      const formData = new FormData();
      formData.append('file', uploadedFile);
      
      const uploadResponse: DatasetUploadResponse = await api.post(
        `/datasets/upload?name=${encodeURIComponent(datasetName)}&description=${encodeURIComponent(datasetDescription || '')}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );
      
      setUploadProgress(60);

      // 2. Processar dados localmente para detecção de colunas
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        const lines = csvData.split('\n').filter(line => line.trim().length > 0);
        const headers = lines[0].split(',').map(h => h.trim()).filter(h => h.length > 0);
        
        // Processar todos os dados
        const allRows = lines.slice(1).map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
          });
          return row;
        });
        
        // Detectar colunas automaticamente
        const suggestions = detectColumns(allRows, headers);
        
        // Salvar dados no contexto do pipeline
        updatePipelineData({ 
          file: uploadedFile,
          datasetId: uploadResponse.dataset_id,
          datasetName: datasetName,
          columns: headers, 
          data: allRows,
          dateColumn: suggestions.dateColumn || '',
          targetColumn: suggestions.targetColumn || '',
          totalRows: allRows.length
        });
        
        setIsProcessing(false);
        setUploadProgress(100);
        
        toast({
          title: "Dataset salvo com sucesso!",
          description: `${headers.length} colunas e ${allRows.length} registros processados.`,
        });

        // Enviar dados para a API se há pipeline ID
        if (pipelineData.pipelineId) {
          try {
            const stepData = {
              dataset_id: uploadResponse.dataset_id,
              dataset_name: datasetName,
              total_rows: allRows.length,
              total_columns: headers.length,
              file_size: uploadedFile.size,
              file_type: 'csv',
              upload_timestamp: new Date().toISOString()
            };

            await updateStepData('upload', stepData);
            await completeStepRemote('upload');
          } catch (apiError) {
            console.error('Erro ao atualizar step na API:', apiError);
            // Continuar mesmo se falhar na API
          }
        }

        // Recarregar lista de datasets
        await loadExistingDatasets();

        // Redirecionar automaticamente para preview
        setTimeout(() => {
          completeStep('upload');
          goToStep('preview');
        }, 1000);
      };
      
      reader.onerror = () => {
        setIsProcessing(false);
        toast({
          title: "Erro no processamento",
          description: "Erro ao ler o arquivo CSV",
          variant: "destructive"
        });
      };
      
      reader.readAsText(uploadedFile);

    } catch (error) {
      setIsProcessing(false);
      setUploadProgress(0);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  // Função para carregar preview de dataset existente
  const handleLoadDatasetPreview = async (dataset: Dataset) => {
    setIsLoadingPreview(true);
    setSelectedDataset(dataset);
    
    try {
      const preview: DatasetPreview = await api.datasets.preview(dataset.id.toString(), { limit: 10 });
      setDatasetPreview(preview);
    } catch (error) {
      toast({
        title: "Erro ao carregar preview",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Função para usar dataset existente no pipeline
  const handleUseExistingDataset = async (dataset: Dataset) => {
    if (!datasetPreview) {
      toast({
        title: "Preview não carregado",
        description: "Por favor, carregue o preview do dataset primeiro",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Carregar TODOS os dados do dataset, não apenas o preview
      const fullDataset: DatasetPreview = await api.datasets.preview(dataset.id.toString(), { limit: datasetPreview.total_rows });
      
      // Detectar colunas automaticamente
      const suggestions = detectColumns(fullDataset.data, fullDataset.columns);
      
      // Salvar TODOS os dados no contexto do pipeline
      updatePipelineData({ 
        datasetId: dataset.id,
        datasetName: dataset.name,
        columns: fullDataset.columns, 
        data: fullDataset.data,
        dateColumn: suggestions.dateColumn || '',
        targetColumn: suggestions.targetColumn || '',
        totalRows: fullDataset.total_rows
      });
      
      // Enviar dados para a API se há pipeline ID
      if (pipelineData.pipelineId) {
        try {
          const stepData = {
            dataset_id: dataset.id,
            dataset_name: dataset.name,
            total_rows: datasetPreview.total_rows,
            total_columns: datasetPreview.columns.length,
            file_size: 0, // Dataset já existe, não há arquivo
            file_type: 'csv',
            upload_timestamp: new Date().toISOString()
          };

          await updateStepData('upload', stepData);
          await completeStepRemote('upload');
        } catch (apiError) {
          console.error('Erro ao atualizar step na API:', apiError);
          // Continuar mesmo se falhar na API
        }
      }
      
      setIsProcessing(false);
      
      toast({
        title: "Dataset carregado com sucesso!",
        description: `${fullDataset.columns.length} colunas e ${fullDataset.total_rows} registros carregados.`,
      });

      // Redirecionar automaticamente para preview
      setTimeout(() => {
        completeStep('upload');
        goToStep('preview');
      }, 1000);

    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "Erro ao carregar dataset",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setIsProcessing(false);
    setUploadProgress(0);
    setDatasetName('');
    setDatasetDescription('');
    setSelectedDataset(null);
    setDatasetPreview(null);
    // Limpar dados do contexto
    clearSavedState();
  };

  const handleViewPreview = async () => {
    // Enviar dados para a API se há pipeline ID
    if (pipelineData.pipelineId && pipelineData.datasetId) {
      try {
        const stepData = {
          dataset_id: pipelineData.datasetId,
          dataset_name: pipelineData.datasetName || 'Dataset',
          total_rows: pipelineData.totalRows || pipelineData.data?.length || 0,
          total_columns: pipelineData.columns?.length || 0,
          file_size: pipelineData.file?.size || 0,
          file_type: 'csv',
          upload_timestamp: new Date().toISOString()
        };

        await updateStepData('upload', stepData);
        await completeStepRemote('upload');
      } catch (apiError) {
        console.error('Erro ao atualizar step na API:', apiError);
        // Continuar mesmo se falhar na API
      }
    }

    completeStep('upload');
    goToStep('preview');
  };

  const handleNewUpload = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados e configurações? Esta ação não pode ser desfeita.')) {
      clearSavedState();
      toast({
        title: "Dados limpos",
        description: "Todos os dados e configurações foram removidos. Você pode fazer um novo upload.",
      });
    }
  };

  // Filtrar datasets por termo de busca
  const filteredDatasets = existingDatasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dataset.description && dataset.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Se já há dados carregados, mostrar interface de dados existentes
  if (pipelineData.data && pipelineData.data.length > 0 && !isProcessing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">Dados Carregados</h2>
          <p className="text-muted-foreground mt-2">
            Você já possui dados carregados no pipeline
          </p>
        </div>

        {/* Cards lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status dos Dados Atuais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Dados Atuais
              </CardTitle>
              <CardDescription>
                {pipelineData.datasetName || 'Dataset carregado'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Colunas:</span>
                  <p className="text-muted-foreground">{pipelineData.columns?.length || 0}</p>
                </div>
                <div>
                  <span className="font-medium">Registros:</span>
                  <p className="text-muted-foreground">{pipelineData.totalRows || pipelineData.data?.length || 0}</p>
                </div>
                {pipelineData.dateColumn && (
                  <div>
                    <span className="font-medium">Coluna de Data:</span>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {pipelineData.dateColumn}
                    </p>
                  </div>
                )}
                {pipelineData.targetColumn && (
                  <div>
                    <span className="font-medium">Coluna Alvo:</span>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {pipelineData.targetColumn}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleViewPreview} className="flex-1">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Preview
                </Button>
                <Button variant="outline" onClick={handleNewUpload}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Upload
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>
                Continue o pipeline ou faça alterações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  Dados carregados e prontos para processamento. Você pode continuar para o próximo passo ou fazer um novo upload.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button onClick={handleViewPreview} className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  Continuar para Preview
                </Button>
                <Button variant="outline" onClick={handleNewUpload} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Carregar Novos Dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">Upload de Dados</h2>
        <p className="text-muted-foreground mt-2">
          Carregue um novo dataset ou use um dataset existente
        </p>
      </div>

      {/* Tabs para Upload vs Datasets Existentes */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Novo Upload</TabsTrigger>
          <TabsTrigger value="existing">Datasets Existentes</TabsTrigger>
        </TabsList>

        {/* Tab de Novo Upload */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload de Novo Dataset
              </CardTitle>
              <CardDescription>
                Carregue um arquivo CSV para criar um novo dataset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações do Dataset */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataset-name">Nome do Dataset *</Label>
                  <Input
                    id="dataset-name"
                    placeholder="Ex: Vendas_2024"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataset-description">Descrição (opcional)</Label>
                  <Input
                    id="dataset-description"
                    placeholder="Descrição do dataset"
                    value={datasetDescription}
                    onChange={(e) => setDatasetDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Upload de Arquivo */}
              <div className="space-y-4">
                <Label htmlFor="file-upload">Arquivo CSV *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      Clique para selecionar um arquivo CSV
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Ou arraste e solte o arquivo aqui
                    </p>
                  </label>
                </div>

                {uploadedFile && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Arquivo selecionado:</strong> {uploadedFile.name} 
                      ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processando...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleSaveDataset}
                  disabled={!uploadedFile || !datasetName.trim() || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Salvar Dataset
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Datasets Existentes */}
        <TabsContent value="existing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Seus Datasets
              </CardTitle>
              <CardDescription>
                Selecione um dataset existente para usar no pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar datasets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Lista de Datasets */}
              {isLoadingDatasets ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Carregando datasets...</p>
                </div>
              ) : filteredDatasets.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Nenhum dataset encontrado' : 'Você ainda não possui datasets'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchTerm ? 'Tente outro termo de busca' : 'Faça upload do seu primeiro dataset'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredDatasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedDataset?.id === dataset.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleLoadDatasetPreview(dataset)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{dataset.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {dataset.description || 'Sem descrição'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>{dataset.filename}</span>
                            {dataset.file_size && (
                              <span>{(dataset.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            )}
                            {dataset.row_count && (
                              <span>{dataset.row_count.toLocaleString()} registros</span>
                            )}
                            <span>Criado em {new Date(dataset.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded text-xs ${
                            dataset.status === 'validated' ? 'bg-green-100 text-green-800' :
                            dataset.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            dataset.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {dataset.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview do Dataset Selecionado */}
              {selectedDataset && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Preview: {selectedDataset.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPreview ? (
                      <div className="text-center py-4">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">Carregando preview...</p>
                      </div>
                    ) : datasetPreview ? (
                      <div className="space-y-4">
                        {/* Informações do Dataset */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Colunas:</span>
                            <p className="text-muted-foreground">{datasetPreview.columns.length}</p>
                          </div>
                          <div>
                            <span className="font-medium">Total de Registros:</span>
                            <p className="text-muted-foreground">{datasetPreview.total_rows.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="font-medium">Preview:</span>
                            <p className="text-muted-foreground">{datasetPreview.preview_rows} registros</p>
                          </div>
                          <div>
                            <span className="font-medium">Tipos de Dados:</span>
                            <p className="text-muted-foreground">{Object.keys(datasetPreview.data_types).length} tipos</p>
                          </div>
                        </div>

                        {/* Tabela de Preview */}
                        <div className="border rounded-lg overflow-hidden">
                          <div className="overflow-x-auto max-h-64">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  {datasetPreview.columns.map((column) => (
                                    <th key={column} className="px-3 py-2 text-left font-medium text-gray-700 border-r">
                                      {column}
                                      <div className="text-xs text-gray-500 font-normal">
                                        {datasetPreview.data_types[column]}
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {datasetPreview.data.map((row, index) => (
                                  <tr key={index} className="border-t">
                                    {datasetPreview.columns.map((column) => (
                                      <td key={column} className="px-3 py-2 border-r text-gray-600">
                                        {String(row[column] || '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Botão para Usar Dataset */}
                        <Button 
                          onClick={() => handleUseExistingDataset(selectedDataset)}
                          disabled={isProcessing}
                          className="w-full"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Usar Este Dataset
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        Clique em um dataset para ver o preview
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataUpload;
