import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ConnectionStatus {
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  timestamp: Date;
}

const ConnectionTest: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<ConnectionStatus>({
    status: 'checking',
    message: 'Verificando...',
    timestamp: new Date()
  });

  const [authStatus, setAuthStatus] = useState<ConnectionStatus>({
    status: 'checking',
    message: 'Verificando...',
    timestamp: new Date()
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

  const testBackendConnection = async () => {
    setBackendStatus({
      status: 'checking',
      message: 'Testando conexão...',
      timestamp: new Date()
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setBackendStatus({
          status: 'success',
          message: 'Backend conectado',
          details: `Status: ${data.status || 'OK'}`,
          timestamp: new Date()
        });
      } else {
        setBackendStatus({
          status: 'warning',
          message: `Backend respondeu com status ${response.status}`,
          details: response.statusText,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Erro ao testar backend:', error);
      
      let message = 'Erro de conexão';
      let details = '';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Timeout na conexão';
          details = 'O servidor demorou mais de 5 segundos para responder';
        } else if (error.message.includes('fetch')) {
          message = 'Servidor não encontrado';
          details = `Verifique se o backend está rodando em ${API_BASE_URL}`;
        } else {
          message = error.message;
          details = error.stack || '';
        }
      }

      setBackendStatus({
        status: 'error',
        message,
        details,
        timestamp: new Date()
      });
    }
  };

  const testAuthEndpoint = async () => {
    setAuthStatus({
      status: 'checking',
      message: 'Testando endpoint de auth...',
      timestamp: new Date()
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Teste com credenciais inválidas para verificar se o endpoint responde
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test_connection',
          password: 'test_connection'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Esperamos um 401 ou 422, que indica que o endpoint está funcionando
      if (response.status === 401 || response.status === 422) {
        setAuthStatus({
          status: 'success',
          message: 'Endpoint de auth funcionando',
          details: `Resposta: ${response.status} ${response.statusText}`,
          timestamp: new Date()
        });
      } else if (response.status === 404) {
        setAuthStatus({
          status: 'error',
          message: 'Endpoint de auth não encontrado',
          details: 'Verifique se as rotas de autenticação estão configuradas no backend',
          timestamp: new Date()
        });
      } else {
        setAuthStatus({
          status: 'warning',
          message: `Resposta inesperada: ${response.status}`,
          details: response.statusText,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Erro ao testar auth:', error);
      
      let message = 'Erro no endpoint de auth';
      let details = '';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Timeout no endpoint de auth';
          details = 'O endpoint demorou mais de 5 segundos para responder';
        } else {
          message = error.message;
          details = error.stack || '';
        }
      }

      setAuthStatus({
        status: 'error',
        message,
        details,
        timestamp: new Date()
      });
    }
  };

  const runAllTests = async () => {
    await testBackendConnection();
    await testAuthEndpoint();
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'checking':
        return <Badge variant="secondary">Verificando</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Aviso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Diagnóstico de Conectividade
        </CardTitle>
        <CardDescription>
          Teste a conexão com o backend e endpoints de autenticação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuração atual */}
        <Alert>
          <AlertDescription>
            <strong>URL da API:</strong> {API_BASE_URL}
            <br />
            <strong>Ambiente:</strong> {import.meta.env.MODE}
          </AlertDescription>
        </Alert>

        {/* Status do Backend */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(backendStatus.status)}
            <div>
              <p className="font-medium">Backend</p>
              <p className="text-sm text-gray-600">{backendStatus.message}</p>
              {backendStatus.details && (
                <p className="text-xs text-gray-500">{backendStatus.details}</p>
              )}
            </div>
          </div>
          {getStatusBadge(backendStatus.status)}
        </div>

        {/* Status do Auth */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(authStatus.status)}
            <div>
              <p className="font-medium">Endpoint de Autenticação</p>
              <p className="text-sm text-gray-600">{authStatus.message}</p>
              {authStatus.details && (
                <p className="text-xs text-gray-500">{authStatus.details}</p>
              )}
            </div>
          </div>
          {getStatusBadge(authStatus.status)}
        </div>

        {/* Botão de teste */}
        <Button 
          onClick={runAllTests} 
          className="w-full"
          disabled={backendStatus.status === 'checking' || authStatus.status === 'checking'}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Testar Novamente
        </Button>

        {/* Instruções */}
        {(backendStatus.status === 'error' || authStatus.status === 'error') && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Possíveis soluções:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Verifique se o backend está rodando</li>
                <li>Confirme a URL da API no arquivo .env</li>
                <li>Verifique se há problemas de CORS</li>
                <li>Teste acessar {API_BASE_URL} diretamente no navegador</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-500 text-center">
          Último teste: {backendStatus.timestamp.toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default ConnectionTest;
