
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { PreprocessingConfig as ConfigType } from '@/hooks/usePreprocessing';

interface PreprocessingConfigProps {
  config: ConfigType;
  setConfig: React.Dispatch<React.SetStateAction<ConfigType>>;
}

const PreprocessingConfig = ({ config, setConfig }: PreprocessingConfigProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tratamento de Valores Ausentes */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Valores Ausentes</Label>
        <Select 
          value={config.handleMissing} 
          onValueChange={(value) => setConfig(prev => ({ ...prev, handleMissing: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="forward_fill">Forward Fill</SelectItem>
            <SelectItem value="backward_fill">Backward Fill</SelectItem>
            <SelectItem value="mean">Média</SelectItem>
            <SelectItem value="median">Mediana</SelectItem>
            <SelectItem value="interpolation">Interpolação Linear</SelectItem>
            <SelectItem value="drop">Remover Linhas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Normalização */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Normalização</Label>
        <Select 
          value={config.normalization} 
          onValueChange={(value) => setConfig(prev => ({ ...prev, normalization: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="minmax">Min-Max (0-1)</SelectItem>
            <SelectItem value="zscore">Z-Score</SelectItem>
            <SelectItem value="robust">Robust Scaler</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transformações */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Transformações</Label>
        <Select 
          value={config.transformation} 
          onValueChange={(value) => setConfig(prev => ({ ...prev, transformation: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="log">Logarítmica</SelectItem>
            <SelectItem value="sqrt">Raiz Quadrada</SelectItem>
            <SelectItem value="boxcox">Box-Cox</SelectItem>
            <SelectItem value="difference">Diferenciação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Outliers */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="remove-outliers"
            checked={config.removeOutliers}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, removeOutliers: checked as boolean }))
            }
          />
          <Label htmlFor="remove-outliers" className="text-base font-medium">
            Remover Outliers
          </Label>
        </div>
        {config.removeOutliers && (
          <div className="space-y-2">
            <Label className="text-sm">Limiar (Desvios Padrão): {config.outlierThreshold[0]}</Label>
            <Slider
              value={config.outlierThreshold}
              onValueChange={(value) => setConfig(prev => ({ ...prev, outlierThreshold: value }))}
              max={5}
              min={1}
              step={0.5}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PreprocessingConfig;
