import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { Zap, Calendar } from 'lucide-react';

const FeatureEngineering = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  const [config, setConfig] = useState({
    lags: [1, 7, 30],
    rollingWindows: [7, 30],
    calendarFeatures: {
      dayOfWeek: true,
      month: true,
      quarter: true,
      isWeekend: true,
      isHoliday: false
    },
    customLag: 1,
    customWindow: 7
  });

  const addLag = () => {
    if (!config.lags.includes(config.customLag)) {
      setConfig(prev => ({
        ...prev,
        lags: [...prev.lags, config.customLag].sort((a, b) => a - b)
      }));
    }
  };

  const removeLag = (lag: number) => {
    setConfig(prev => ({
      ...prev,
      lags: prev.lags.filter(l => l !== lag)
    }));
  };

  const addRollingWindow = () => {
    if (!config.rollingWindows.includes(config.customWindow)) {
      setConfig(prev => ({
        ...prev,
        rollingWindows: [...prev.rollingWindows, config.customWindow].sort((a, b) => a - b)
      }));
    }
  };

  const removeRollingWindow = (window: number) => {
    setConfig(prev => ({
      ...prev,
      rollingWindows: prev.rollingWindows.filter(w => w !== window)
    }));
  };

  const handleContinue = () => {
    updatePipelineData({ features: config.lags.map(l => `lag_${l}`) });
    completeStep('features');
    toast({
      title: "Etapa concluída!",
      description: "Engenharia de atributos configurada com sucesso",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Engenharia de Atributos
          </CardTitle>
          <CardDescription>
            Configure as features temporais para melhorar o modelo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lags */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Lags (Valores Passados)</Label>
              <p className="text-sm text-gray-600">
                Inclui valores de períodos anteriores como features
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {config.lags.map(lag => (
                <Badge 
                  key={lag} 
                  variant="secondary" 
                  className="cursor-pointer"
                  onClick={() => removeLag(lag)}
                >
                  Lag {lag} ×
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={config.customLag}
                onChange={(e) => setConfig(prev => ({ ...prev, customLag: parseInt(e.target.value) || 1 }))}
                className="w-20"
                min="1"
              />
              <Button onClick={addLag} variant="outline" size="sm">
                Adicionar Lag
              </Button>
            </div>
          </div>

          {/* Rolling Windows */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Médias Móveis</Label>
              <p className="text-sm text-gray-600">
                Janelas deslizantes para capturar tendências
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {config.rollingWindows.map(window => (
                <Badge 
                  key={window} 
                  variant="secondary" 
                  className="cursor-pointer"
                  onClick={() => removeRollingWindow(window)}
                >
                  Média {window}d ×
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={config.customWindow}
                onChange={(e) => setConfig(prev => ({ ...prev, customWindow: parseInt(e.target.value) || 7 }))}
                className="w-20"
                min="2"
              />
              <Button onClick={addRollingWindow} variant="outline" size="sm">
                Adicionar Janela
              </Button>
            </div>
          </div>

          {/* Calendar Features */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Features de Calendário
              </Label>
              <p className="text-sm text-gray-600">
                Atributos baseados em datas e sazonalidade
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(config.calendarFeatures).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={feature}
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        calendarFeatures: {
                          ...prev.calendarFeatures,
                          [feature]: checked as boolean
                        }
                      }))
                    }
                  />
                  <Label htmlFor={feature} className="text-sm">
                    {feature === 'dayOfWeek' && 'Dia da Semana'}
                    {feature === 'month' && 'Mês'}
                    {feature === 'quarter' && 'Trimestre'}
                    {feature === 'isWeekend' && 'É Fim de Semana'}
                    {feature === 'isHoliday' && 'É Feriado'}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleContinue} className="w-full">
            Continuar para Configuração do Modelo
          </Button>
        </CardContent>
      </Card>

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo das Features</CardTitle>
          <CardDescription>
            Preview das features que serão criadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {config.lags.length}
              </div>
              <div className="text-sm text-gray-600">Features de Lag</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {config.rollingWindows.length}
              </div>
              <div className="text-sm text-gray-600">Médias Móveis</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(config.calendarFeatures).filter(Boolean).length}
              </div>
              <div className="text-sm text-gray-600">Features de Calendário</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureEngineering;
