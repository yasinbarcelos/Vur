import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Check, RefreshCw, AlertTriangle, Database, Eye, Plus } from 'lucide-react';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';

const DataUpload = () => {
  const { pipelineData, updatePipelineData, goToStep, clearSavedState, completeStep } = usePipeline();
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      toast({
        title: "Erro no upload",
        description: "Por favor, selecione um arquivo CSV válido",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setUploadedFile(file);
      
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
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
        
        // Salvar dados no contexto
        updatePipelineData({ 
          file: file,
          columns: headers, 
          data: allRows,
          dateColumn: suggestions.dateColumn || '',
          targetColumn: suggestions.targetColumn || ''
        });
        
        setIsProcessing(false);
        
        toast({
          title: "Upload realizado com sucesso!",
          description: `${headers.length} colunas e ${allRows.length} registros carregados.`,
        });

        // Redirecionar automaticamente para preview
        setTimeout(() => {
          goToStep('preview');
        }, 1000);

        completeStep('upload');
      };
      
      reader.onerror = () => {
        setIsProcessing(false);
        toast({
          title: "Erro no processamento",
          description: "Erro ao ler o arquivo CSV",
          variant: "destructive"
        });
      };
      
      reader.readAsText(file);
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "Erro no processamento",
        description: "Erro ao processar o arquivo CSV",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setIsProcessing(false);
    // Limpar dados do contexto
    clearSavedState();
  };

  const handleViewPreview = () => {
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
                Informações sobre o dataset carregado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {pipelineData.data.length.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700">Registros</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {pipelineData.columns?.length || 0}
                  </div>
                  <div className="text-sm text-green-700">Colunas</div>
                </div>
              </div>

              {pipelineData.file && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">{pipelineData.file.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Tamanho: {(pipelineData.file.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              )}

              {pipelineData.dateColumn && pipelineData.targetColumn && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Configuração:</div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Data: {pipelineData.dateColumn}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      Alvo: {pipelineData.targetColumn}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opções de Ação */}
          <Card>
            <CardHeader>
              <CardTitle>O que você gostaria de fazer?</CardTitle>
              <CardDescription>
                Escolha uma das opções abaixo para continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleViewPreview} 
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <Eye className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Visualizar Dados</div>
                  <div className="text-sm text-muted-foreground">
                    Ver preview e configurações dos dados atuais
                  </div>
                </div>
              </Button>

              <Button 
                onClick={() => {
                  setUploadedFile(null);
                  setIsProcessing(false);
                }} 
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <RefreshCw className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Atualizar Dados</div>
                  <div className="text-sm text-muted-foreground">
                    Substituir com um novo arquivo CSV
                  </div>
                </div>
              </Button>

              <Button 
                onClick={handleNewUpload} 
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <Plus className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Novo Upload</div>
                  <div className="text-sm text-muted-foreground">
                    Limpar dados atuais e começar do zero
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Interface de upload normal
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">Upload dos Dados</h2>
        <p className="text-muted-foreground mt-2">
          Faça upload do seu arquivo CSV com dados de série temporal
        </p>
      </div>

      {/* Upload Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Selecionar Arquivo CSV
          </CardTitle>
          <CardDescription>
            Escolha um arquivo CSV com dados de série temporal para análise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!uploadedFile ? (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-lg font-medium">Clique para selecionar um arquivo</span>
                <span className="text-sm text-muted-foreground block mt-1">ou arraste e solte aqui</span>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-4">
                Apenas arquivos CSV são aceitos
              </p>
            </div>
          ) : (
            <Alert>
              <Check className="w-4 h-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Arquivo selecionado:</strong> {uploadedFile.name}
                    <br />
                    <span className="text-sm text-muted-foreground">
                      Tamanho: {(uploadedFile.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setUploadedFile(null)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Trocar Arquivo
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 py-4">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processando arquivo...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Requisitos do Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Formato CSV com cabeçalhos na primeira linha</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Pelo menos uma coluna de data/timestamp</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Uma ou mais colunas numéricas para análise</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Dados organizados cronologicamente</span>
            </div>
          </div>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Dica:</strong> Após o upload, você será direcionado para a página de preview 
              onde poderá visualizar e configurar seus dados antes de prosseguir.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataUpload;
