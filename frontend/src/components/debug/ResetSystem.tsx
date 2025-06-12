import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  Wifi,
  WifiOff 
} from 'lucide-react';
import { MockApiClient } from '@/lib/mockApi';
import { useAuth } from '@/contexts/AuthContext';
import { forceRealAPIMode } from '@/utils/forceRealAPI';

const ResetSystem: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const { logout } = useAuth();

  const getCurrentStatus = () => {
    const isMockMode = MockApiClient.shouldUseMock();
    const hasAuthToken = !!localStorage.getItem('vur_auth_token');
    const hasMockUser = !!localStorage.getItem('mock_user');
    const hasMockToken = !!localStorage.getItem('mock_token');

    return {
      isMockMode,
      hasAuthToken,
      hasMockUser,
      hasMockToken,
      totalItems: Object.keys(localStorage).filter(key => key.startsWith('vur_')).length
    };
  };

  const status = getCurrentStatus();

  const clearAllData = async () => {
    setIsResetting(true);
    setResetStatus('Limpando dados...');

    try {
      // 1. Fazer logout do contexto
      logout();
      
      // 2. Limpar localStorage relacionado ao VUR
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('vur_') || 
        key.startsWith('mock_') ||
        key === 'vur_auth_token' ||
        key === 'vur_token_expiry'
      );
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // 3. Desabilitar modo mock
      MockApiClient.disableMock();

      setResetStatus('Dados limpos com sucesso!');
      
      // 4. Aguardar um pouco e recarregar
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1500);

    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      setResetStatus('Erro ao limpar dados');
    } finally {
      setIsResetting(false);
    }
  };

  const forceRealAPI = async () => {
    setIsResetting(true);
    setResetStatus('Forçando uso da API real...');

    try {
      // Desabilitar mock
      MockApiClient.disableMock();
      
      // Limpar dados mock
      localStorage.removeItem('mock_user');
      localStorage.removeItem('mock_token');
      
      // Manter token real se existir
      const realToken = localStorage.getItem('vur_auth_token');
      if (!realToken) {
        // Se não há token real, fazer logout completo
        logout();
      }

      setResetStatus('API real ativada!');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Erro ao forçar API real:', error);
      setResetStatus('Erro ao ativar API real');
    } finally {
      setIsResetting(false);
    }
  };

  const forceMockMode = async () => {
    setIsResetting(true);
    setResetStatus('Ativando modo mock...');

    try {
      // Habilitar mock
      MockApiClient.enableMock();
      
      setResetStatus('Modo mock ativado!');
      
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);

    } catch (error) {
      console.error('Erro ao ativar mock:', error);
      setResetStatus('Erro ao ativar modo mock');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Reset do Sistema
        </CardTitle>
        <CardDescription>
          Limpar dados e resolver problemas de autenticação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status atual */}
        <div className="space-y-3">
          <h3 className="font-semibold">Status Atual</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {status.isMockMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                <span className="text-sm">Modo API</span>
              </div>
              <Badge variant={status.isMockMode ? "destructive" : "default"}>
                {status.isMockMode ? "Mock" : "Real"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="text-sm">Dados Salvos</span>
              </div>
              <Badge variant={status.totalItems > 0 ? "default" : "secondary"}>
                {status.totalItems} itens
              </Badge>
            </div>
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <div>• Token de auth: {status.hasAuthToken ? '✅ Presente' : '❌ Ausente'}</div>
            <div>• Usuário mock: {status.hasMockUser ? '✅ Presente' : '❌ Ausente'}</div>
            <div>• Token mock: {status.hasMockToken ? '✅ Presente' : '❌ Ausente'}</div>
          </div>
        </div>

        {/* Status da operação */}
        {resetStatus && (
          <Alert className={resetStatus.includes('sucesso') ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{resetStatus}</AlertDescription>
          </Alert>
        )}

        {/* Ações */}
        <div className="space-y-3">
          <h3 className="font-semibold">Ações de Reset</h3>
          
          {/* Reset completo */}
          <Button
            onClick={clearAllData}
            disabled={isResetting}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isResetting ? 'Limpando...' : 'Reset Completo'}
          </Button>
          <p className="text-xs text-gray-600">
            Remove todos os dados salvos e volta para tela de login
          </p>

          {/* Forçar API real */}
          <Button
            onClick={forceRealAPI}
            disabled={isResetting}
            variant="outline"
            className="w-full"
          >
            <Wifi className="w-4 h-4 mr-2" />
            {isResetting ? 'Ativando...' : 'Forçar API Real'}
          </Button>
          <p className="text-xs text-gray-600">
            Desabilita modo mock e tenta usar backend real
          </p>

          {/* Forçar API real (versão agressiva) */}
          <Button
            onClick={() => forceRealAPIMode()}
            disabled={isResetting}
            variant="default"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Wifi className="w-4 h-4 mr-2" />
            Forçar API Real (Agressivo)
          </Button>
          <p className="text-xs text-gray-600">
            Limpeza completa e força uso da API real permanentemente
          </p>

          {/* Forçar modo mock */}
          <Button
            onClick={forceMockMode}
            disabled={isResetting}
            variant="outline"
            className="w-full"
          >
            <WifiOff className="w-4 h-4 mr-2" />
            {isResetting ? 'Ativando...' : 'Forçar Modo Mock'}
          </Button>
          <p className="text-xs text-gray-600">
            Ativa modo offline com dados simulados
          </p>
        </div>

        {/* Aviso */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> O reset completo irá desconectar você e remover todos os dados salvos localmente.
          </AlertDescription>
        </Alert>

        {/* Instruções */}
        <div className="text-xs text-gray-600 space-y-2">
          <p><strong>Quando usar cada opção:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Reset Completo:</strong> Quando há problemas persistentes ou dados corrompidos</li>
            <li><strong>Forçar API Real:</strong> Quando quer sair do modo mock e usar o backend</li>
            <li><strong>Forçar Modo Mock:</strong> Quando o backend não está disponível</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResetSystem;
