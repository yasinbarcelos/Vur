import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Loader2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface SimpleLoginFormProps {
  onSwitchToRegister?: () => void;
}

const SimpleLoginForm: React.FC<SimpleLoginFormProps> = ({ onSwitchToRegister }) => {
  const [username, setUsername] = useState('testuser');
  const [password, setPassword] = useState('TestPassword123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // URL da API - exatamente como no test_login.html
  const API_BASE = 'http://localhost:8000/api/v1';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Por favor, preencha username e password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Fazendo login...', {
        url: `${API_BASE}/auth/login`,
        username: username
      });

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Login realizado com sucesso!', data);
        
        // Salvar token no localStorage
        const expiryTime = Date.now() + (data.expires_in * 1000);
        localStorage.setItem('vur_auth_token', data.access_token);
        localStorage.setItem('vur_token_expiry', expiryTime.toString());
        
        // Limpar qualquer configuração mock
        localStorage.removeItem('vur_use_mock_api');
        localStorage.removeItem('mock_user');
        localStorage.removeItem('mock_token');
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta ao VUR",
        });

        // Redirecionar para dashboard
        window.location.href = '/dashboard';
      } else {
        console.error('❌ Erro no login:', data);
        setError(data.message || data.detail || 'Erro no login');
      }
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      setError('Erro de conexão. Verifique se o backend está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      setError('Por favor, preencha username e password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📝 Registrando usuário...', {
        url: `${API_BASE}/auth/register`,
        username: username
      });

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `${username}@test.com`,
          username: username,
          password: password,
          full_name: `Test User ${username}`
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Usuário registrado com sucesso!', data);
        toast({
          title: "Usuário registrado com sucesso!",
          description: "Agora você pode fazer login",
        });
        setError(null);
      } else {
        console.error('❌ Erro no registro:', data);
        setError(data.message || data.detail || 'Erro no registro');
      }
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      setError('Erro de conexão. Verifique se o backend está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Brain className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">VUR</h1>
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Entrar na Plataforma
        </CardTitle>
        <CardDescription className="text-center">
          Faça login para acessar a plataforma de séries temporais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Aviso de desenvolvimento */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Credenciais de Teste:</strong><br />
              Username: <code>testuser</code> | Senha: <code>TestPassword123</code><br />
              Username: <code>admin</code> | Senha: <code>Admin123</code>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="testuser"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="TestPassword123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  📝 Registrar Usuário
                </>
              )}
            </Button>
          </div>

          {onSwitchToRegister && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Problemas com login?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => {
                    // Limpar dados e recarregar
                    localStorage.clear();
                    window.location.reload();
                  }}
                  disabled={isLoading}
                >
                  Limpar dados e tentar novamente
                </Button>
              </p>
            </div>
          )}
        </form>

        {/* Informações de debug */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <strong>Debug Info:</strong><br />
          API: {API_BASE}<br />
          Backend: <a href="http://localhost:8000/health" target="_blank" className="text-blue-600 underline">
            Testar Health Check
          </a><br />
          Docs: <a href="http://localhost:8000/docs" target="_blank" className="text-blue-600 underline">
            API Documentation
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleLoginForm; 