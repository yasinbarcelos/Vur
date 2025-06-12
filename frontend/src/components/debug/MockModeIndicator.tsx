import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wifi, WifiOff, X } from 'lucide-react';
import { MockApiClient } from '@/lib/mockApi';
import { forceRealAPIMode } from '@/utils/forceRealAPI';

const MockModeIndicator: React.FC = () => {
  const [isMockMode, setIsMockMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkMockMode = () => {
      // Verificar se detecção está desabilitada
      const disableDetection = localStorage.getItem('vur_disable_mock_detection') === 'true';
      const forceReal = localStorage.getItem('vur_force_real_api') === 'true';

      if (disableDetection || forceReal) {
        setIsMockMode(false);
        setIsVisible(false);
        return;
      }

      const mockMode = MockApiClient.shouldUseMock();
      setIsMockMode(mockMode);
      setIsVisible(mockMode);
    };

    // Verificar inicialmente
    checkMockMode();

    // Verificar periodicamente
    const interval = setInterval(checkMockMode, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDisableMock = () => {
    MockApiClient.disableMock();
    setIsMockMode(false);
    setIsVisible(false);
    window.location.reload(); // Recarregar para usar API real
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !isMockMode) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="border-orange-200 bg-orange-50 shadow-lg">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                <WifiOff className="w-3 h-3 mr-1" />
                Modo Offline
              </Badge>
              <span className="text-sm">
                Usando dados simulados
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => forceRealAPIMode()}
                className="h-6 px-2 text-orange-700 hover:bg-orange-100 font-semibold"
              >
                <Wifi className="w-3 h-3 mr-1" />
                FORÇAR REAL
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 text-orange-700 hover:bg-orange-100"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="mt-2 text-xs text-orange-600">
            Funcionalidades limitadas. Dados não serão salvos permanentemente.
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default MockModeIndicator;
