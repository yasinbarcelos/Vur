import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, Download, Trash2, Search, Eye, RefreshCw, Plus, Calendar, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Dataset, DatasetListResponse, DatasetUploadResponse, DatasetPreview } from "@/types/dataset";

const DataManagement = () => {
  const { toast } = useToast();
  
  // Estados para datasets
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Estados para upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  
  // Estados para estatísticas
  const [stats, setStats] = useState({
    totalDatasets: 0,
    totalSize: 0,
    recentUploads: 0
  });

  // Carregar datasets ao montar o componente
  useEffect(() => {
    loadDatasets();
  }, []);

  // Função para carregar datasets
  const loadDatasets = async () => {
    setIsLoadingDatasets(true);
    try {
      const response: DatasetListResponse = await api.datasets.list({ limit: 1000 });
      setDatasets(response.datasets);
      
      // Calcular estatísticas
      const totalSize = response.datasets.reduce((sum, dataset) => sum + (dataset.file_size || 0), 0);
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);
      const recentUploads = response.datasets.filter(dataset => 
        new Date(dataset.created_at) > recentDate
      ).length;
      
      setStats({
        totalDatasets: response.datasets.length,
        totalSize,
        recentUploads
      });
      
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

  // Função para upload de novo dataset
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.h5', '.hdf5', '.xlsx', '.xls'];
    const isValidFile = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidFile) {
      toast({
        title: "Erro no upload",
        description: "Por favor, selecione um arquivo CSV, Excel ou HDF5 válido",
        variant: "destructive"
      });
      return;
    }

    setUploadFile(file);
    
    // Gerar nome padrão se não fornecido
    if (!datasetName) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setDatasetName(nameWithoutExtension);
    }
  };

  // Função para salvar dataset
  const handleSaveDataset = async () => {
    if (!uploadFile || !datasetName.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um arquivo e forneça um nome para o dataset",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const uploadResponse: DatasetUploadResponse = await api.post(
        `/datasets/upload?name=${encodeURIComponent(datasetName)}&description=${encodeURIComponent(datasetDescription || '')}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
        }
      );

      toast({
        title: "Dataset salvo com sucesso!",
        description: `Dataset "${datasetName}" foi carregado com sucesso.`,
      });

      // Limpar formulário
      setUploadFile(null);
      setDatasetName('');
      setDatasetDescription('');
      setUploadProgress(0);

      // Recarregar lista de datasets
      await loadDatasets();

    } catch (error) {
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Função utilitária para carregar dados completos
  const loadCompleteDataset = async (datasetId: string): Promise<DatasetPreview> => {
    // Primeiro buscar informações básicas
    const basicPreview = await api.datasets.preview(datasetId, { rows: 1 });
    
    // Depois carregar todos os dados
    const completePreview = await api.datasets.preview(datasetId, { rows: basicPreview.total_rows });
    
    return completePreview;
  };

  // Função para carregar preview de dataset
  const handleLoadPreview = async (dataset: Dataset) => {
    setIsLoadingPreview(true);
    setSelectedDataset(dataset);
    
    try {
      // Buscar todos os dados completos
      const fullPreview: DatasetPreview = await loadCompleteDataset(dataset.id.toString());
      setDatasetPreview(fullPreview);
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

  // Função para excluir dataset
  const handleDeleteDataset = async (dataset: Dataset) => {
    if (!confirm(`Tem certeza que deseja excluir o dataset "${dataset.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await api.datasets.delete(dataset.id.toString());
      
      toast({
        title: "Dataset excluído",
        description: `Dataset "${dataset.name}" foi excluído com sucesso.`,
      });

      // Recarregar lista de datasets
      await loadDatasets();
      
      // Limpar preview se era o dataset selecionado
      if (selectedDataset?.id === dataset.id) {
        setSelectedDataset(null);
        setDatasetPreview(null);
      }

    } catch (error) {
      toast({
        title: "Erro ao excluir dataset",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  // Função para download de dataset
  const handleDownloadDataset = async (dataset: Dataset) => {
    try {
      // Implementar download quando a API estiver disponível
      toast({
        title: "Download iniciado",
        description: `Preparando download do dataset "${dataset.name}"...`,
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  // Filtrar datasets por termo de busca
  const filteredDatasets = datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dataset.description && dataset.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    dataset.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'uploaded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="w-3 h-3" />;
      case 'processing': return <RefreshCw className="w-3 h-3 animate-spin" />;
      case 'error': return <AlertTriangle className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerenciar Dados</h1>
          <p className="text-lg text-gray-600">Gerencie seus datasets e fontes de dados</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Datasets
              </CardTitle>
              <Database className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDatasets}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.recentUploads > 0 ? `+${stats.recentUploads} esta semana` : 'Nenhum upload recente'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Espaço Utilizado
              </CardTitle>
              <Database className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.totalSize / 1024 / 1024).toFixed(1)} MB
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {datasets.length > 0 ? `Média: ${(stats.totalSize / datasets.length / 1024 / 1024).toFixed(1)} MB por dataset` : 'Nenhum dataset'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Últimas Atualizações
              </CardTitle>
              <Database className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentUploads}</div>
              <p className="text-xs text-gray-600 mt-1">nas últimas 7 dias</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para Gerenciar vs Upload */}
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manage">Gerenciar Datasets</TabsTrigger>
            <TabsTrigger value="upload">Novo Upload</TabsTrigger>
          </TabsList>

          {/* Tab de Gerenciar Datasets */}
          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Datasets Disponíveis</CardTitle>
                    <CardDescription>Gerencie seus datasets e visualize informações</CardDescription>
                  </div>
                  <Button onClick={loadDatasets} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar datasets por nome, descrição ou arquivo..."
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
                  <div className="space-y-4">
                    {filteredDatasets.map((dataset) => (
                      <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <Database className="w-8 h-8 text-blue-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{dataset.name}</h3>
                              <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${getStatusColor(dataset.status)}`}>
                                {getStatusIcon(dataset.status)}
                                {dataset.status}
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {dataset.description || 'Sem descrição'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {dataset.filename}
                              </span>
                              {dataset.file_size && (
                                <span>{(dataset.file_size / 1024 / 1024).toFixed(2)} MB</span>
                              )}
                              {dataset.row_count && (
                                <span>{dataset.row_count.toLocaleString()} registros</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(dataset.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleLoadPreview(dataset)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadDataset(dataset)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteDataset(dataset)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview do Dataset Selecionado */}
            {selectedDataset && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview: {selectedDataset.name}</CardTitle>
                  <CardDescription>
                    {selectedDataset.description || 'Visualização dos dados do dataset'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPreview ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
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
                        <div className="overflow-x-auto max-h-96">
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
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Clique em "Visualizar" em um dataset para ver o preview
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab de Novo Upload */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload de Novo Dataset
                </CardTitle>
                <CardDescription>
                  Carregue um arquivo CSV, Excel ou HDF5 para criar um novo dataset
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
                      accept=".csv,.h5,.hdf5,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700">
                        Clique para selecionar um arquivo
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Suporte para CSV, Excel (.xlsx, .xls) e HDF5 (.h5, .hdf5)
                      </p>
                    </label>
                  </div>

                  {uploadFile && (
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Arquivo selecionado:</strong> {uploadFile.name} 
                        ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Progress Bar */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fazendo upload...</span>
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
                    disabled={!uploadFile || !datasetName.trim() || isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Fazendo Upload...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Salvar Dataset
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setUploadFile(null);
                      setDatasetName('');
                      setDatasetDescription('');
                      setUploadProgress(0);
                    }}
                    disabled={isUploading}
                  >
                    Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataManagement; 