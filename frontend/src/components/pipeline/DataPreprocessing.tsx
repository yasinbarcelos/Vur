
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { usePreprocessing } from '@/hooks/usePreprocessing';
import PreprocessingConfig from './PreprocessingConfig';
import DataVisualization from './DataVisualization';

const DataPreprocessing = () => {
  const {
    config,
    setConfig,
    handleApplyPreprocessing,
    handleContinue,
    pipelineData
  } = usePreprocessing();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração do Pré-processamento
          </CardTitle>
          <CardDescription>
            Configure as transformações a serem aplicadas nos dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PreprocessingConfig config={config} setConfig={setConfig} />

          <div className="flex gap-4">
            <Button onClick={handleApplyPreprocessing} variant="outline">
              Aplicar Pré-processamento
            </Button>
            <Button onClick={handleContinue} disabled={!pipelineData.processedData}>
              Continuar para Engenharia de Atributos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualização Comparativa */}
      {pipelineData.processedData && (
        <DataVisualization data={pipelineData.processedData} />
      )}
    </div>
  );
};

export default DataPreprocessing;
