
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface DataVisualizationProps {
  data: any[];
}

const DataVisualization = ({ data }: DataVisualizationProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Comparação: Original vs Processado
        </CardTitle>
        <CardDescription>
          Visualize o impacto das transformações aplicadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="original" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Original"
              />
              <Line 
                type="monotone" 
                dataKey="processed" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Processado"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataVisualization;
