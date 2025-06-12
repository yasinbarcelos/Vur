import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultCredentials, shouldShowQuickActions, shouldShowDevWarnings } from '@/config/development';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z.string()
    .min(3, 'Username deve ter pelo menos 3 caracteres')
    .max(50, 'Username deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username pode conter apenas letras, números e underscore'),
  full_name: z.string().optional(),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register: registerUser, isLoading } = useAuth();

  const defaultCredentials = getDefaultCredentials();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: defaultCredentials.register ? {
      ...defaultCredentials.register,
      confirmPassword: defaultCredentials.register.password,
    } : {},
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no registro');
    }
  };

  const handleQuickRegister = async () => {
    try {
      setError(null);
      const registerData = defaultCredentials.register || {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123456',
        full_name: 'Usuário de Teste',
      };
      await registerUser(registerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no registro');
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  // Validações de senha em tempo real
  const passwordValidations = [
    { test: password?.length >= 8, label: 'Pelo menos 8 caracteres' },
    { test: /[A-Z]/.test(password || ''), label: 'Uma letra maiúscula' },
    { test: /[a-z]/.test(password || ''), label: 'Uma letra minúscula' },
    { test: /[0-9]/.test(password || ''), label: 'Um número' },
  ];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Criar Conta
        </CardTitle>
        <CardDescription className="text-center">
          Registre-se para acessar a plataforma VUR
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Aviso de desenvolvimento */}
          {shouldShowDevWarnings() && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800 text-sm">
                <strong>Modo Desenvolvimento:</strong> Campos preenchidos automaticamente para facilitar testes.
                <br />
                <span className="text-xs">
                  Email: {defaultCredentials.register?.email} | Username: {defaultCredentials.register?.username} | Senha: {defaultCredentials.register?.password}
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="test@example.com (padrão para desenvolvimento)"
              {...register('email')}
              disabled={isFormLoading}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
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
            <Label htmlFor="full_name">Nome Completo (Opcional)</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Usuário de Teste (padrão para desenvolvimento)"
              {...register('full_name')}
              disabled={isFormLoading}
            />
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
            
            {/* Indicadores de validação da senha */}
            {password && (
              <div className="space-y-1">
                {passwordValidations.map((validation, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {validation.test ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <X className="h-3 w-3 text-red-500" />
                    )}
                    <span className={validation.test ? 'text-green-600' : 'text-red-600'}>
                      {validation.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Test123456 (confirmação)"
                {...register('confirmPassword')}
                disabled={isFormLoading}
                className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isFormLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
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
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Conta
                </>
              )}
            </Button>

            {/* Botão de Registro Rápido para Desenvolvimento */}
            {shouldShowQuickActions() && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-green-300 text-green-600 hover:bg-green-50"
                onClick={handleQuickRegister}
                disabled={isFormLoading}
              >
                ⚡ Registro Rápido (Dev)
              </Button>
            )}
          </div>

          {onSwitchToLogin && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={onSwitchToLogin}
                  disabled={isFormLoading}
                >
                  Fazer login
                </Button>
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default RegisterForm;
