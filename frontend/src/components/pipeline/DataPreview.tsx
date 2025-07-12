import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  BarChart3, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Database,
  Calendar,
  Target,
  Check,
  Activity,
  Loader2
} from 'lucide-react';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { getDatasetPreview } from '@/lib/api';
import { DatasetPreview } from '@/types/dataset';
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

const DataPreview = () => {
  const { pipelineData, updatePipelineData, completeStep, goToStep, updateStepData, completeStepRemote } = usePipeline();
  const { toast } = useToast();
  
  // Estados para carregamento de dados da API
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [apiData, setApiData] = useState<DatasetPreview | null>(null);
  
  // Estados para controle de visualização
  const [previewLimit, setPreviewLimit] = useState(25); // Quantos registros mostrar na tabela
  const [loadLimit, setLoadLimit] = useState(1000); // Quantos registros carregar da API
  const [currentPage, setCurrentPage] = useState(1); // Página atual para paginação

  // Carregar dados da API quando há datasetId mas não há dados locais
  useEffect(() => {
    const loadDataFromAPI = async () => {
      if (pipelineData.datasetId && (!pipelineData.data || pipelineData.data.length === 0)) {
        setIsLoadingData(true);
        try {
          // Carregar dados conforme limite configurado
          const fullData = await getDatasetPreview(pipelineData.datasetId, loadLimit);
          
          // Usar os dados completos tanto para API quanto para pipeline
          setApiData(fullData);
          
          // Atualizar dados do pipeline com TODOS os dados da API
          updatePipelineData({
            data: fullData.data,
            columns: fullData.columns,
            totalRows: fullData.total_rows
          });
          
          toast({
            title: "Dados carregados",
            description: `${fullData.columns.length} colunas e ${fullData.total_rows} registros carregados da API`,
          });
        } catch (error) {
          toast({
            title: "Erro ao carregar dados",
            description: error instanceof Error ? error.message : "Erro desconhecido",
            variant: "destructive"
          });
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    loadDataFromAPI();
  }, [pipelineData.datasetId, pipelineData.data, updatePipelineData, toast, loadLimit]);

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

  // Calcular relatório de qualidade dos dados
  const dataQuality = useMemo((): DataQualityReport | null => {
    const currentData = pipelineData.data || apiData?.data;
    const currentColumns = pipelineData.columns || apiData?.columns;
    
    if (!currentData || !currentColumns) return null;

    const missingValues: { [key: string]: number } = {};
    const dataTypes: { [key: string]: string } = {};
    
    // Analisar cada coluna
    currentColumns.forEach(header => {
      const values = currentData.map(row => row[header]);
      const missing = values.filter(v => v === null || v === undefined || v === '').length;
      missingValues[header] = missing;
      dataTypes[header] = detectDataType(values);
    });

    // Detectar linhas duplicadas
    const duplicateRows = currentData.length - new Set(currentData.map(row => JSON.stringify(row))).size;

    const suggestions = detectColumns(currentData, currentColumns);

    // Adicionar validações
    if (currentData.length < 50) {
      suggestions.issues.push('Dataset muito pequeno (< 50 registros)');
    }
    
    if (suggestions.numericColumns.length === 0) {
      suggestions.issues.push('Nenhuma coluna numérica encontrada');
    }

    const highMissingCols = Object.entries(missingValues)
      .filter(([_, count]) => count / currentData.length > 0.3)
      .map(([col, _]) => col);
    
    if (highMissingCols.length > 0) {
      suggestions.issues.push(`Colunas com muitos valores ausentes: ${highMissingCols.join(', ')}`);
    }

    return {
      totalRows: pipelineData.totalRows || apiData?.total_rows || currentData.length,
      totalColumns: currentColumns.length,
      missingValues,
      duplicateRows,
      dataTypes,
      suggestions
    };
  }, [pipelineData.data, pipelineData.columns, pipelineData.totalRows, apiData]);

  const handleNewUpload = () => {
    goToStep('upload');
  };

  const handleContinue = async () => {
    if (!pipelineData.dateColumn || !pipelineData.targetColumn) {
      toast({
        title: "Configuração incompleta",
        description: "Por favor, configure as colunas de data e alvo antes de continuar",
        variant: "destructive"
      });
      return;
    }

    try {
      // Enviar dados para a API se há pipeline ID
      if (pipelineData.pipelineId && pipelineData.datasetId) {
        const stepData = {
          columns: pipelineData.columns,
          sample_data: pipelineData.data?.slice(0, 5) || [], // Primeiras 5 linhas como amostra
          data_types: pipelineData.columns?.reduce((acc, col) => {
            // Inferir tipo baseado nos dados
            const sampleValue = pipelineData.data?.[0]?.[col];
            if (typeof sampleValue === 'number') acc[col] = 'float';
            else if (col === pipelineData.dateColumn) acc[col] = 'datetime';
            else acc[col] = 'string';
            return acc;
          }, {} as Record<string, string>) || {},
          missing_values: pipelineData.columns?.reduce((acc, col) => {
            // Calcular valores faltantes (simulado)
            acc[col] = 0;
            return acc;
          }, {} as Record<string, number>) || {},
          date_column: pipelineData.dateColumn,
          target_column: pipelineData.targetColumn,
          column_suggestions: {
            date_columns: pipelineData.dateColumn ? [pipelineData.dateColumn] : [],
            target_columns: pipelineData.targetColumn ? [pipelineData.targetColumn] : []
          },
          data_quality_score: 0.95,
          quality_issues: []
        };

        await updateStepData('preview', stepData);
        await completeStepRemote('preview');
      }

      completeStep('preview');
    } catch (error) {
      console.error('Erro ao salvar preview:', error);
      toast({
        title: "Erro ao salvar preview",
        description: "Erro ao salvar configurações do preview",
        variant: "destructive"
      });
    }
  };

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

  // Dados atuais (do pipeline ou da API)
  const currentData = pipelineData.data || apiData?.data;
  const currentColumns = pipelineData.columns || apiData?.columns;
  
  // Dados para preview na tabela (com paginação)
  const previewDisplayData = useMemo(() => {
    if (!currentData) return [];
    
    const startIndex = (currentPage - 1) * previewLimit;
    const endIndex = startIndex + previewLimit;
    
    return currentData.slice(startIndex, endIndex);
  }, [currentData, currentPage, previewLimit]);

  // Calcular informações de paginação
  const totalPages = Math.ceil((currentData?.length || 0) / previewLimit);
  const hasMultiplePages = totalPages > 1;

  // Resetar página quando mudar o limite de preview
  useEffect(() => {
    setCurrentPage(1);
  }, [previewLimit]);
  
  // DEBUG: Log dos dados sendo exibidos
  useEffect(() => {
    if (previewDisplayData.length > 0) {
      console.log('🔍 DEBUG - Dados sendo exibidos na tabela:', {
        totalRows: previewDisplayData.length,
        totalColumns: currentColumns?.length || 0,
        firstRow: previewDisplayData[0],
        allColumns: currentColumns
      });
    }
  }, [previewDisplayData, currentColumns]);

  // Se está carregando dados da API
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <h2 className="text-xl font-semibold mt-4">Carregando dados...</h2>
          <p className="text-muted-foreground mt-2">
            Obtendo dados do dataset da API
          </p>
        </div>
      </div>
    );
  }

  // Se não há dados, redirecionar para upload
  if (!currentData || currentData.length === 0) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Nenhum dado encontrado. Faça upload de um arquivo CSV primeiro.
          </AlertDescription>
        </Alert>
        <Button onClick={handleNewUpload}>
          <FileText className="w-4 h-4 mr-2" />
          Fazer Upload dos Dados
        </Button>
      </div>
    );
  }

  const previewData = previewDisplayData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Preview dos Dados</h2>
          <p className="text-muted-foreground">
            Analise e configure seus dados antes de prosseguir
          </p>
        </div>
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
          <Button variant="outline" onClick={handleNewUpload}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Novo Upload
          </Button>
          <Button onClick={handleContinue} disabled={!pipelineData.dateColumn || !pipelineData.targetColumn}>
            <Check className="w-4 h-4 mr-2" />
            Continuar para Divisão dos Dados
          </Button>
        </div>
      </div>

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
                <div className="text-2xl font-bold text-blue-600">{dataQuality.totalRows.toLocaleString()}</div>
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
                {Object.entries(dataQuality.dataTypes).map(([column, type]) => (
                  <Badge key={column} variant="outline" className={getDataTypeBadge(type)}>
                    {column}: {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Problemas Detectados */}
            {dataQuality.suggestions.issues.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Problemas detectados:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {dataQuality.suggestions.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controles de Visualização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Controles de Visualização
          </CardTitle>
          <CardDescription>
            Configure quantos dados carregar e exibir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Registros a Carregar da API
              </label>
              <div className="flex items-center gap-2">
                <select 
                  value={loadLimit} 
                  onChange={(e) => setLoadLimit(Number(e.target.value))}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                >
                  <option value={100}>100 registros</option>
                  <option value={500}>500 registros</option>
                  <option value={1000}>1.000 registros</option>
                  <option value={5000}>5.000 registros</option>
                  <option value={10000}>10.000 registros</option>
                  <option value={50000}>50.000 registros</option>
                  <option value={100000}>100.000 registros</option>
                </select>
                                 <Button 
                   size="sm"
                   onClick={() => {
                     // Recarregar dados com novo limite
                     if (pipelineData.datasetId) {
                       setApiData(null);
                       updatePipelineData({ data: [], columns: [], totalRows: 0 });
                       setCurrentPage(1);
                     }
                   }}
                   title="Recarregar dados com o novo limite"
                 >
                   <RefreshCw className="w-4 h-4" />
                 </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total disponível: {dataQuality?.totalRows.toLocaleString() || 'N/A'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Registros a Exibir na Tabela
              </label>
              <select 
                value={previewLimit} 
                onChange={(e) => setPreviewLimit(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value={10}>10 registros</option>
                <option value={25}>25 registros</option>
                <option value={50}>50 registros</option>
                <option value={100}>100 registros</option>
                <option value={200}>200 registros</option>
                <option value={500}>500 registros</option>
                <option value={1000}>1.000 registros</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Carregados: {currentData?.length.toLocaleString() || 0}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Info className="w-4 h-4" />
              <span>
                <strong>Exibindo:</strong> {previewDisplayData.length.toLocaleString()} registros de {currentData?.length.toLocaleString() || 0} carregados
                {currentData && currentData.length >= loadLimit && (
                  <span className="text-orange-600"> (máximo atingido)</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview dos Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Preview dos Dados
            <Badge variant="outline">
              {pipelineData.datasetName || 'Dados Carregados'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Visualização do dataset - Exibindo {previewDisplayData.length.toLocaleString()} de {currentData?.length.toLocaleString() || 0} registros carregados 
            ({dataQuality?.totalRows.toLocaleString() || 'N/A'} registros totais no arquivo)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {currentColumns!.map((column) => (
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
                    {currentColumns!.map((column) => (
                      <td key={column} className="border border-gray-200 p-2 text-sm">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Controles de Paginação */}
          {hasMultiplePages && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Página {currentPage} de {totalPages} 
                ({((currentPage - 1) * previewLimit + 1).toLocaleString()} - {Math.min(currentPage * previewLimit, currentData?.length || 0).toLocaleString()} de {currentData?.length.toLocaleString() || 0} registros)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                  {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
          
          {!hasMultiplePages && previewData.length > 0 && (
            <div className="mt-2 text-sm text-gray-500 text-center">
              Exibindo todos os {previewData.length} registros carregados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração de Colunas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Configuração das Colunas
          </CardTitle>
          <CardDescription>
            Configure as colunas de data e alvo para análise de série temporal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Coluna de Data/Tempo
              </label>
              <select 
                value={pipelineData.dateColumn || ""} 
                onChange={(e) => updatePipelineData({ dateColumn: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecionar coluna de data</option>
                {currentColumns!.map((column) => (
                  <option key={column} value={column}>
                    {column}
                    {dataQuality?.dataTypes[column] === 'date' && ' (Data)'}
                  </option>
                ))}
              </select>
              {dataQuality?.suggestions.dateColumn && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Sugestão automática: {dataQuality.suggestions.dateColumn}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                <Target className="w-4 h-4 inline mr-1" />
                Coluna Alvo (Variável de Predição)
              </label>
              <select 
                value={pipelineData.targetColumn || ""} 
                onChange={(e) => updatePipelineData({ targetColumn: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecionar coluna alvo</option>
                {currentColumns!.filter(col => col !== pipelineData.dateColumn).map((column) => (
                  <option key={column} value={column}>
                    {column}
                    {(dataQuality?.dataTypes[column] === 'float' || dataQuality?.dataTypes[column] === 'integer') && ' (Numérica)'}
                  </option>
                ))}
              </select>
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
      {currentData.length > 0 && pipelineData.dateColumn && pipelineData.targetColumn && (
        <>
          <DataStatistics 
            data={currentData} 
            columns={currentColumns!}
            targetColumn={pipelineData.targetColumn} 
          />
          <DataVisualization 
            data={currentData} 
            columns={currentColumns!}
            dateColumn={pipelineData.dateColumn} 
            targetColumn={pipelineData.targetColumn} 
          />
        </>
      )}
    </div>
  );
};

export default DataPreview; 