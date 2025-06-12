import React, { useMemo } from 'react';
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
  ArrowRight,
  Database,
  Calendar,
  Target,
  Check
} from 'lucide-react';
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

const DataPreview = () => {
  const { pipelineData, updatePipelineData, completeStep, goToStep } = usePipeline();
  const { toast } = useToast();

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
    if (!pipelineData.data || !pipelineData.columns) return null;

    const missingValues: { [key: string]: number } = {};
    const dataTypes: { [key: string]: string } = {};
    
    // Analisar cada coluna
    pipelineData.columns.forEach(header => {
      const values = pipelineData.data!.map(row => row[header]);
      const missing = values.filter(v => v === null || v === undefined || v === '').length;
      missingValues[header] = missing;
      dataTypes[header] = detectDataType(values);
    });

    // Detectar linhas duplicadas
    const duplicateRows = pipelineData.data.length - new Set(pipelineData.data.map(row => JSON.stringify(row))).size;

    const suggestions = detectColumns(pipelineData.data, pipelineData.columns);

    // Adicionar validações
    if (pipelineData.data.length < 50) {
      suggestions.issues.push('Dataset muito pequeno (< 50 registros)');
    }
    
    if (suggestions.numericColumns.length === 0) {
      suggestions.issues.push('Nenhuma coluna numérica encontrada');
    }

    const highMissingCols = Object.entries(missingValues)
      .filter(([_, count]) => count / pipelineData.data!.length > 0.3)
      .map(([col, _]) => col);
    
    if (highMissingCols.length > 0) {
      suggestions.issues.push(`Colunas com muitos valores ausentes: ${highMissingCols.join(', ')}`);
    }

    return {
      totalRows: pipelineData.data.length,
      totalColumns: pipelineData.columns.length,
      missingValues,
      duplicateRows,
      dataTypes,
      suggestions
    };
  }, [pipelineData.data, pipelineData.columns]);

  const handleNewUpload = () => {
    goToStep('upload');
  };

  const handleContinue = () => {
    if (!pipelineData.dateColumn || !pipelineData.targetColumn) {
      toast({
        title: "Configuração incompleta",
        description: "Por favor, configure as colunas de data e alvo antes de continuar",
        variant: "destructive"
      });
      return;
    }
    completeStep('preview');
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

  // Se não há dados, redirecionar para upload
  if (!pipelineData.data || pipelineData.data.length === 0) {
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

  const previewData = pipelineData.data.slice(0, 5);

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

      {/* Preview dos Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Preview dos Dados
            <Badge variant="outline">
              {pipelineData.file?.name || 'Dados Carregados'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Primeiras 5 linhas do seu dataset ({pipelineData.data.length.toLocaleString()} registros totais)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {pipelineData.columns!.map((column) => (
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
                    {pipelineData.columns!.map((column) => (
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
                {pipelineData.columns!.map((column) => (
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
                {pipelineData.columns!.filter(col => col !== pipelineData.dateColumn).map((column) => (
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
      {pipelineData.data.length > 0 && pipelineData.dateColumn && pipelineData.targetColumn && (
        <>
          <DataStatistics 
            data={pipelineData.data} 
            columns={pipelineData.columns!}
            targetColumn={pipelineData.targetColumn} 
          />
          <DataVisualization 
            data={pipelineData.data} 
            columns={pipelineData.columns!}
            dateColumn={pipelineData.dateColumn} 
            targetColumn={pipelineData.targetColumn} 
          />
        </>
      )}
    </div>
  );
};

export default DataPreview; 