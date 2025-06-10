
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { usePipeline } from '@/contexts/PipelineContext';
import { useToast } from '@/hooks/use-toast';
import { Split, Info } from 'lucide-react';

const TrainTestSplit = () => {
  const { pipelineData, updatePipelineData, completeStep } = usePipeline();
  const { toast } = useToast();
  const [splitRatio, setSplitRatio] = useState([80]);

  // Simular dados para visualização do split
  const generateSplitData = () => {
    const totalDays = 365;
    const trainDays = Math.floor((totalDays * splitRatio[0]) / 100);
    
    return Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(2024, 0, i + 1);
      const value = 100 + Math.sin(i * 0.02) * 20 + Math.random() * 10;
      
      return {
        date: date.toISOString().split('T')[0],
        value: Math.round(value),
        trainValue: i < trainDays ? Math.round(value) : null,
        testValue: i >= trainDays ? Math.round(value) : null,
        split: i < trainDays ? 'train' : 'test',
        dayIndex: i
      };
    });
  };

  const splitData = generateSplitData();
  const trainSize = splitData.filter(d => d.split === 'train').length;
  const testSize = splitData.filter(d => d.split === 'test').length;

  const handleContinue = () => {
    const config = {
      trainRatio: splitRatio[0] / 100,
      testRatio: (100 - splitRatio[0]) / 100,
      trainSize,
      testSize
    };
    
    updatePipelineData({ trainSize: splitRatio[0] / 100 });
    completeStep('split');
    toast({
      title: "Etapa concluída!",
      description: "Divisão dos dados configurada com sucesso",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Split className="w-5 h-5" />
            Divisão Treino/Teste
          </CardTitle>
          <CardDescription>
            Configure como dividir os dados para treinamento e avaliação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">
                Proporção de Treino: {splitRatio[0]}%
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Ajuste a porcentagem dos dados para treinamento
              </p>
              <Slider
                value={splitRatio}
                onValueChange={setSplitRatio}
                max={90}
                min={50}
                step={5}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-700">Conjunto de Treino</div>
                <div className="text-2xl font-bold text-blue-600">{splitRatio[0]}%</div>
                <div className="text-sm text-gray-600">{trainSize} amostras</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-lg font-semibold text-orange-700">Conjunto de Teste</div>
                <div className="text-2xl font-bold text-orange-600">{100 - splitRatio[0]}%</div>
                <div className="text-sm text-gray-600">{testSize} amostras</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Divisão Temporal</h4>
                <p className="text-sm text-blue-700">
                  Para séries temporais, a divisão respeita a ordem cronológica. 
                  Os dados mais antigos são usados para treino e os mais recentes para teste.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleContinue} className="w-full">
            Continuar para Seleção do Modelo
          </Button>
        </CardContent>
      </Card>

      {/* Visualização da Divisão */}
      <Card>
        <CardHeader>
          <CardTitle>Visualização da Divisão</CardTitle>
          <CardDescription>
            Como os dados serão divididos ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={splitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dayIndex"
                  tickFormatter={(value) => `Dia ${value}`}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Dia ${value}`}
                  formatter={(value, name) => [
                    value,
                    name === 'trainValue' ? 'Treino' : 'Teste'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="trainValue" 
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Dados de Treino"
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="testValue" 
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Dados de Teste"
                  connectNulls={false}
                />
                <ReferenceLine 
                  x={trainSize} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  label="Divisão Treino/Teste"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainTestSplit;
