import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, BarChart3, Activity, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import DataStatistics from './DataStatistics';
import DataVisualization from './DataVisualization';

interface DataQualityReport {
  totalRows: number;
  totalColumns: number;
  missingValues: { [key: string]: number };
  duplicateRows: number;
  dataTypes: { [key: string]: string };
  suggestions: {
    dateColumn?: string;
    targetColumn?: string;
    numericColumns: string[];
    issues: string[];
  };
}

const DataUpload = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isUploadingNew, setIsUploadingNew] = useState(false);
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Carregar dados do pipeline quando componente monta
  useEffect(() => {
    if (pipelineData.data && pipelineData.data.length > 0) {
      setAllData(pipelineData.data);
      setColumns(pipelineData.columns || []);
      setPreviewData(pipelineData.data.slice(0, 5));
      setShowAnalysis(true);
      
      // Recriar análise de qualidade se necessário
      if (pipelineData.columns && pipelineData.columns.length > 0) {
        const qualityReport = analyzeDataQuality(pipelineData.data, pipelineData.columns);
        setDataQuality(qualityReport);
      }
    }
  }, [pipelineData.data, pipelineData.columns]);

  // Função aprimorada para detectar tipo de dados
  const detectDataType = (values: any[]): string => {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNullValues.length === 0) return 'empty';

    // Detectar datas
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
      /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
      /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
    ];
    
    const dateCount = nonNullValues.filter(v => 
      datePatterns.some(pattern => pattern.test(String(v))) || 
      !isNaN(Date.parse(String(v)))
    ).length;

    if (dateCount / nonNullValues.length > 0.8) return 'date';

    // Detectar números
    const numericCount = nonNullValues.filter(v => !isNaN(Number(v))).length;
    if (numericCount / nonNullValues.length > 0.8) {
      // Distinguir entre inteiros e decimais
      const intCount = nonNullValues.filter(v => Number.isInteger(Number(v))).length;
      return intCount / numericCount > 0.9 ? 'integer' : 'float';
    }

    return 'text';
  };

  // Função para detectar colunas automaticamente
  const detectColumns = (data: any[], headers: string[]) => {
    const suggestions: DataQualityReport['suggestions'] = {
      numericColumns: [],
      issues: []
    };

    // Detectar coluna de data
    const dateColumns = headers.filter(header => {
      const values = data.map(row => row[header]);
      const dataType = detectDataType(values);
      return dataType === 'date' || 
             header.toLowerCase().includes('date') ||
             header.toLowerCase().includes('time') ||
             header.toLowerCase().includes('timestamp');
    });

    if (dateColumns.length > 0) {
      suggestions.dateColumn = dateColumns[0];
    } else {
      suggestions.issues.push('Nenhuma coluna de data detectada');
    }

    // Detectar colunas numéricas
    headers.forEach(header => {
      const values = data.map(row => row[header]);
      const dataType = detectDataType(values);
      if (dataType === 'float' || dataType === 'integer') {
        suggestions.numericColumns.push(header);
      }
    });

    // Detectar coluna alvo (maior variabilidade entre numéricas)
    if (suggestions.numericColumns.length > 0) {
      let maxVariability = 0;
      let targetCandidate = suggestions.numericColumns[0];

      suggestions.numericColumns.forEach(col => {
        const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
        if (values.length > 0) {
          const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
          const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
          const cv = Math.sqrt(variance) / mean; // Coeficiente de variação

          if (cv > maxVariability && col !== suggestions.dateColumn) {
            maxVariability = cv;
            targetCandidate = col;
          }
        }
      });

      suggestions.targetColumn = targetCandidate;
    }

    return suggestions;
  };

  // Função para analisar qualidade dos dados
  const analyzeDataQuality = (data: any[], headers: string[]): DataQualityReport => {
    const missingValues: { [key: string]: number } = {};
    const dataTypes: { [key: string]: string } = {};
    
    // Analisar cada coluna
    headers.forEach(header => {
      const values = data.map(row => row[header]);
      const missing = values.filter(v => v === null || v === undefined || v === '').length;
      missingValues[header] = missing;
      dataTypes[header] = detectDataType(values);
    });

    // Detectar linhas duplicadas
    const duplicateRows = data.length - new Set(data.map(row => JSON.stringify(row))).size;

    const suggestions = detectColumns(data, headers);

    // Adicionar mais validações
    if (data.length < 50) {
      suggestions.issues.push('Dataset muito pequeno (< 50 registros)');
    }
    
    if (suggestions.numericColumns.length === 0) {
      suggestions.issues.push('Nenhuma coluna numérica encontrada');
    }

    const highMissingCols = Object.entries(missingValues)
      .filter(([_, count]) => count / data.length > 0.3)
      .map(([col, _]) => col);
    
    if (highMissingCols.length > 0) {
      suggestions.issues.push(`Colunas com muitos valores ausentes: ${highMissingCols.join(', ')}`);
    }

    return {
      totalRows: data.length,
      totalColumns: headers.length,
      missingValues,
      duplicateRows,
      dataTypes,
      suggestions
    };
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
      // Simular leitura do CSV
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
        
        // Preview apenas das primeiras 5 linhas
        const previewRows = allRows.slice(0, 5);
        
        // Analisar qualidade dos dados
        const qualityReport = analyzeDataQuality(allRows, headers);
        
        setColumns(headers);
        setPreviewData(previewRows);
        setAllData(allRows);
        setDataQuality(qualityReport);
        
        // Aplicar sugestões automaticamente
        updatePipelineData({ 
          columns: headers, 
          data: allRows,
          dateColumn: qualityReport.suggestions.dateColumn || '',
          targetColumn: qualityReport.suggestions.targetColumn || ''
        });
        
        // Automaticamente ativar análise quando dados são carregados
        setShowAnalysis(true);
        setIsUploadingNew(false);
        setIsProcessing(false);
        
        toast({
          title: "Arquivo analisado com sucesso!",
          description: `${headers.length} colunas e ${allRows.length} registros. ${qualityReport.suggestions.issues.length} problemas detectados.`,
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

  const handleAnalyzeData = () => {
    if (allData.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum dado disponível para análise",
        variant: "destructive"
      });
      return;
    }
    setShowAnalysis(true);
    toast({
      title: "Análise iniciada!",
      description: "Estatísticas e visualizações carregadas",
    });
  };

  const handleContinue = () => {
    if (allData.length === 0 || !pipelineData.dateColumn || !pipelineData.targetColumn) {
      toast({
        title: "Configuração incompleta",
        description: "Por favor, configure as colunas de data e alvo antes de continuar",
        variant: "destructive"
      });
      return;
    }
    completeStep('upload');
  };

  const handleNewUpload = () => {
    setIsUploadingNew(true);
    setShowAnalysis(false);
    setUploadedFile(null);
    setPreviewData([]);
    setAllData([]);
    setColumns([]);
    setDataQuality(null);
    updatePipelineData({ columns: [], data: [], dateColumn: '', targetColumn: '' });
  };

  const handleCancelNewUpload = () => {
    setIsUploadingNew(false);
    // Restaurar dados anteriores se existirem
    if (pipelineData.data && pipelineData.data.length > 0) {
      setAllData(pipelineData.data);
      setColumns(pipelineData.columns || []);
      setShowAnalysis(true);
    }
  };

  // Filter out empty column names to prevent empty SelectItem values
  const validColumns = columns.filter(col => col && col.trim().length > 0);
  const validTargetColumns = validColumns.filter(col => col !== pipelineData.dateColumn);

  const getQualityBadgeColor = (issues: string[]) => {
    if (issues.length === 0) return "bg-green-500";
    if (issues.length <= 2) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getDataTypeBadge = (type: string) => {
    const colors = {
      'date': 'bg-blue-100 text-blue-700',
      'integer': 'bg-green-100 text-green-700',
      'float': 'bg-purple-100 text-purple-700',
      'text': 'bg-gray-100 text-gray-700',
      'empty': 'bg-red-100 text-red-700'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  // Renderizar seção de upload
  const renderUploadSection = () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload dos Dados
          {isUploadingNew && allData.length === 0 && (
            <Button
              onClick={handleCancelNewUpload}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              Cancelar
            </Button>
          )}
          </CardTitle>
          <CardDescription>
            Faça upload do seu arquivo CSV com dados de série temporal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <span className="text-lg font-medium text-gray-900">
                Clique para fazer upload ou arraste o arquivo
              </span>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </Label>
            <p className="text-gray-500 mt-2">Apenas arquivos CSV são aceitos</p>
          </div>
          
          {uploadedFile && (
            <Alert className="mt-4">
              <Check className="w-4 h-4" />
              <AlertDescription>
                Arquivo carregado: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
              <br />
              {allData.length} registros carregados
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
  );

  // Renderizar seção de configuração
  const renderConfigurationSection = () => (
    validColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração das Colunas</CardTitle>
            <CardDescription>
              Configure as colunas de timestamp e alvo da série
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timestamp-column">Coluna de Timestamp</Label>
                <Select 
                  value={pipelineData.dateColumn || ""} 
                  onValueChange={(value) => updatePipelineData({ dateColumn: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna de data/hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {validColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="target-column">Coluna Alvo</Label>
                <Select 
                  value={pipelineData.targetColumn || ""} 
                  onValueChange={(value) => updatePipelineData({ targetColumn: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a variável alvo" />
                  </SelectTrigger>
                  <SelectContent>
                    {validTargetColumns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          
          {/* Botões de Ação */}
          <div className="flex gap-4 mt-6">
            {!showAnalysis && (
              <Button 
                onClick={handleAnalyzeData}
                variant="outline"
                className="flex-1"
                disabled={allData.length === 0}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analisar Dados
              </Button>
            )}
            
            <Button 
              onClick={handleContinue} 
              className="flex-1"
              disabled={!pipelineData.dateColumn || !pipelineData.targetColumn}
            >
              Continuar para Divisão dos Dados
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  );

  // Renderizar preview dos dados
  const renderPreviewSection = () => (
    previewData.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Preview dos Dados</CardTitle>
          <CardDescription>
            Primeiras 5 linhas do arquivo carregado ({allData.length} registros totais)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  {validColumns.map((col) => (
                    <th key={col} className="border border-gray-300 p-2 text-left font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index}>
                    {validColumns.map((col) => (
                      <td key={col} className="border border-gray-300 p-2">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  );

  // Layout principal - condicional baseado se há dados carregados
  if (allData.length === 0 || isUploadingNew) {
    // Sem dados ou fazendo novo upload: layout normal com upload primeiro
    return (
      <div className="space-y-6">
        {renderUploadSection()}
      </div>
    );
  }

  // Com dados: layout reorganizado com análises primeiro, SEM seção de upload
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Upload dos Dados</h2>
          <p className="text-muted-foreground">
            Carregue seu arquivo CSV de série temporal para análise
          </p>
        </div>
        {showAnalysis && (
          <div className="flex items-center gap-3">
            {dataQuality && (
              <Badge 
                className={`${getQualityBadgeColor(dataQuality.suggestions.issues)} text-white`}
              >
                {dataQuality.suggestions.issues.length === 0 ? (
                  <><CheckCircle className="w-3 h-3 mr-1" />Qualidade Boa</>
                ) : (
                  <><AlertTriangle className="w-3 h-3 mr-1" />{dataQuality.suggestions.issues.length} Problemas</>
                )}
              </Badge>
            )}
            <Button 
              variant="outline" 
              onClick={handleNewUpload}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Carregar Novo Arquivo
            </Button>
            <Button onClick={handleContinue} disabled={!allData.length}>
              <Check className="w-4 h-4 mr-2" />
              Continuar para Divisão dos Dados
            </Button>
          </div>
        )}
      </div>

      {!showAnalysis ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Selecionar Arquivo
            </CardTitle>
            <CardDescription>
              Escolha um arquivo CSV com dados de série temporal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm font-medium">Clique para selecionar um arquivo</span>
                  <span className="text-sm text-muted-foreground block">ou arraste e solte aqui</span>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </div>
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analisando arquivo...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Relatório de Qualidade dos Dados */}
          {dataQuality && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Relatório de Qualidade dos Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dataQuality.totalRows}</div>
                    <div className="text-sm text-blue-700">Registros</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dataQuality.totalColumns}</div>
                    <div className="text-sm text-green-700">Colunas</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{dataQuality.suggestions.numericColumns.length}</div>
                    <div className="text-sm text-purple-700">Numéricas</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{dataQuality.duplicateRows}</div>
                    <div className="text-sm text-red-700">Duplicadas</div>
                  </div>
                </div>

                {/* Tipos de Dados */}
                <div>
                  <h4 className="font-medium mb-2">Tipos de Dados por Coluna</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dataQuality.dataTypes).map(([col, type]) => (
                      <Badge key={col} variant="outline" className={getDataTypeBadge(type)}>
                        {col}: {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sugestões Automáticas */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-700">✓ Detecções Automáticas</h4>
                    {dataQuality.suggestions.dateColumn && (
                      <div className="text-sm text-green-600">
                        <strong>Coluna de Data:</strong> {dataQuality.suggestions.dateColumn}
                      </div>
                    )}
                    {dataQuality.suggestions.targetColumn && (
                      <div className="text-sm text-green-600">
                        <strong>Coluna Alvo:</strong> {dataQuality.suggestions.targetColumn}
                      </div>
                    )}
                    <div className="text-sm text-green-600">
                      <strong>Colunas Numéricas:</strong> {dataQuality.suggestions.numericColumns.join(', ')}
                    </div>
                  </div>
                  
                  {dataQuality.suggestions.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-amber-700">⚠ Problemas Detectados</h4>
                      {dataQuality.suggestions.issues.map((issue, index) => (
                        <div key={index} className="text-sm text-amber-600">
                          • {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Valores Ausentes */}
                {Object.values(dataQuality.missingValues).some(count => count > 0) && (
                  <div>
                    <h4 className="font-medium mb-2">Valores Ausentes</h4>
                    <div className="space-y-1">
                      {Object.entries(dataQuality.missingValues)
                        .filter(([_, count]) => count > 0)
                        .map(([col, count]) => (
                          <div key={col} className="flex justify-between text-sm">
                            <span>{col}</span>
                            <span className="text-red-600">
                              {count} ({((count / dataQuality.totalRows) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview dos Dados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Preview dos Dados
                <Badge variant="outline">
                  {uploadedFile?.name}
                </Badge>
              </CardTitle>
              <CardDescription>
                Primeiras 5 linhas do seu dataset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      {columns.map((column) => (
                        <th key={column} className="border border-gray-200 p-2 text-left text-sm font-medium">
                          {column}
                          {dataQuality && (
                            <Badge 
                              variant="outline" 
                              className={`ml-1 text-xs ${getDataTypeBadge(dataQuality.dataTypes[column])}`}
                            >
                              {dataQuality.dataTypes[column]}
                            </Badge>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {columns.map((column) => (
                          <td key={column} className="border border-gray-200 p-2 text-sm">
                            {row[column]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Configuração de Colunas */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração das Colunas</CardTitle>
              <CardDescription>
                Confirme ou ajuste as colunas identificadas automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date-column">Coluna de Data/Tempo</Label>
                  <Select 
                    value={pipelineData.dateColumn} 
                    onValueChange={(value) => updatePipelineData({ dateColumn: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar coluna de data" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                          {dataQuality?.dataTypes[column] === 'date' && (
                            <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-700">
                              Data
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dataQuality?.suggestions.dateColumn && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Sugestão automática: {dataQuality.suggestions.dateColumn}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="target-column">Coluna Alvo (Variável de Predição)</Label>
                  <Select 
                    value={pipelineData.targetColumn} 
                    onValueChange={(value) => updatePipelineData({ targetColumn: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar coluna alvo" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.filter(col => col !== pipelineData.dateColumn).map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                          {dataQuality?.dataTypes[column] === 'float' || dataQuality?.dataTypes[column] === 'integer' ? (
                            <Badge variant="outline" className="ml-2 text-xs bg-green-100 text-green-700">
                              Numérica
                            </Badge>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dataQuality?.suggestions.targetColumn && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Sugestão automática: {dataQuality.suggestions.targetColumn}
                    </p>
                  )}
                </div>
              </div>

              {(!pipelineData.dateColumn || !pipelineData.targetColumn) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Selecione as colunas de data e alvo para continuar para a próxima etapa
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas e Visualização */}
          {allData.length > 0 && pipelineData.dateColumn && pipelineData.targetColumn && (
            <>
              <DataStatistics 
                data={allData} 
                columns={columns}
                targetColumn={pipelineData.targetColumn} 
              />
              <DataVisualization 
                data={allData} 
                columns={columns}
                dateColumn={pipelineData.dateColumn} 
                targetColumn={pipelineData.targetColumn} 
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DataUpload;
