
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Check } from 'lucide-react';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';

const DataUpload = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setUploadedFile(file);
      
      // Simular leitura do CSV
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvData = e.target?.result as string;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim()).filter(h => h.length > 0);
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
          });
          return row;
        });
        
        setColumns(headers);
        setPreviewData(rows);
        updatePipelineData({ columns: headers, data: rows });
        
        toast({
          title: "Arquivo carregado com sucesso!",
          description: `${headers.length} colunas detectadas`,
        });
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Erro no upload",
        description: "Por favor, selecione um arquivo CSV válido",
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    if (!pipelineData.dateColumn || !pipelineData.targetColumn) {
      toast({
        title: "Configuração incompleta",
        description: "Selecione a coluna de timestamp e a coluna alvo",
        variant: "destructive"
      });
      return;
    }
    
    completeStep('upload');
    toast({
      title: "Etapa concluída!",
      description: "Dados configurados com sucesso",
    });
  };

  // Filter out empty column names to prevent empty SelectItem values
  const validColumns = columns.filter(col => col && col.trim().length > 0);
  const validTargetColumns = validColumns.filter(col => col !== pipelineData.dateColumn);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload dos Dados
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
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview dos Dados</CardTitle>
            <CardDescription>
              Primeiras 5 linhas do arquivo carregado
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
      )}

      {/* Configuration Section */}
      {validColumns.length > 0 && (
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
            
            <Button 
              onClick={handleContinue} 
              className="w-full mt-6"
              disabled={!pipelineData.dateColumn || !pipelineData.targetColumn}
            >
              Continuar para Pré-processamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataUpload;
