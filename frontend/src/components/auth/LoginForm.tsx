import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultCredentials, shouldShowQuickActions, shouldShowDevWarnings } from '@/config/development';

const loginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();

  const defaultCredentials = getDefaultCredentials();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: defaultCredentials.login || {},
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no login');
    }
  };

  const handleQuickLogin = async () => {
    try {
      setError(null);
      const credentials = defaultCredentials.login || { username: 'testuser', password: 'Test123456' };
      await login(credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no login');
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Entrar no VUR
        </CardTitle>
        <CardDescription className="text-center">
          Faça login para acessar a plataforma de séries temporais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Aviso de desenvolvimento */}
          {shouldShowDevWarnings() && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Modo Desenvolvimento:</strong> Campos preenchidos automaticamente para facilitar testes.
                <br />
                <span className="text-xs">
                  Username: {defaultCredentials.login?.username} | Senha: {defaultCredentials.login?.password}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username ou Email</Label>
            <Input
              id="username"
              type="text"
              placeholder="testuser (padrão para desenvolvimento)"
              {...register('username')}
              disabled={isFormLoading}
              className={errors.username ? 'border-red-500' : ''}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Test123456 (padrão para desenvolvimento)"
                {...register('password')}
                disabled={isFormLoading}
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isFormLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isFormLoading}
            >
              {isFormLoading ? (
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

            {/* Botão de Login Rápido para Desenvolvimento */}
            {shouldShowQuickActions() && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={handleQuickLogin}
                disabled={isFormLoading}
              >
                ⚡ Login Rápido (Dev)
              </Button>
            )}
          </div>

          {onSwitchToRegister && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={onSwitchToRegister}
                  disabled={isFormLoading}
                >
                  Criar conta
                </Button>
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
