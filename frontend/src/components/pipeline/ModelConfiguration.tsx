
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { usePipeline } from '@/contexts/PipelineContext';

const ModelConfiguration = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();

  const handleModelTypeChange = (value: string) => {
    updatePipelineData({ 
      modelingType: value as 'univariate' | 'multivariate'
    });
  };

  const handleHorizonChange = (value: string) => {
    updatePipelineData({ 
      predictionHorizon: value as 'single' | 'multiple'
    });
  };

  const handleAlgorithmChange = (value: string) => {
    updatePipelineData({ algorithm: value });
  };

  const handleStepsChange = (value: string) => {
    updatePipelineData({ steps: parseInt(value) || 1 });
  };

  const handleConfigure = () => {
    completeStep('model');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Modelo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="modelType">Tipo de Modelagem</Label>
            <Select value={pipelineData.modelingType || ''} onValueChange={handleModelTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="univariate">Univariável</SelectItem>
                <SelectItem value="multivariate">Multivariável</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horizon">Horizonte de Previsão</Label>
            <Select value={pipelineData.predictionHorizon || ''} onValueChange={handleHorizonChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o horizonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Único Passo</SelectItem>
                <SelectItem value="multiple">Múltiplos Passos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="algorithm">Algoritmo</Label>
            <Select value={pipelineData.algorithm || ''} onValueChange={handleAlgorithmChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o algoritmo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arima">ARIMA</SelectItem>
                <SelectItem value="lstm">LSTM</SelectItem>
                <SelectItem value="prophet">Prophet</SelectItem>
                <SelectItem value="linear">Regressão Linear</SelectItem>
                <SelectItem value="rf">Random Forest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pipelineData.predictionHorizon === 'multiple' && (
            <div className="space-y-2">
              <Label htmlFor="steps">Número de Passos</Label>
              <Input
                id="steps"
                type="number"
                min="1"
                max="50"
                value={pipelineData.steps || 1}
                onChange={(e) => handleStepsChange(e.target.value)}
                placeholder="Ex: 7"
              />
            </div>
          )}
        </div>

        <Button 
          onClick={handleConfigure}
          className="w-full"
          disabled={!pipelineData.modelingType || !pipelineData.predictionHorizon || !pipelineData.algorithm}
        >
          Configurar Modelo
        </Button>
      </CardContent>
    </Card>
  );
};

export default ModelConfiguration;
