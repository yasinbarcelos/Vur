import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types
interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

interface UpdateProfileData {
  email?: string;
  username?: string;
  full_name?: string;
  bio?: string;
  profile_picture?: string;
}

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

// Hook para obter dados do usuário atual
export const useCurrentUser = () => {
  const { token, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => api.auth.me(),
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: (failureCount, error: any) => {
      // Não tentar novamente se for erro 401
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Hook para login
export const useLogin = () => {
  const { login } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      await login(credentials);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas ao usuário
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao VUR",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook para registro
export const useRegister = () => {
  const { register } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      await register(data);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas ao usuário
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao VUR",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook para logout
export const useLogout = () => {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      logout();
    },
    onSuccess: () => {
      // Limpar todas as queries em cache
      queryClient.clear();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    },
  });
};

// Hook para atualizar perfil
export const useUpdateProfile = () => {
  const { updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      await updateProfile(data);
    },
    onSuccess: () => {
      // Invalidar query do usuário atual
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na atualização",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook para verificar se o usuário tem permissão
export const usePermissions = () => {
  const { user } = useAuth();

  return {
    isAdmin: user?.is_superuser || false,
    isActive: user?.is_active || false,
    canCreatePipelines: user?.is_active || false,
    canManageData: user?.is_active || false,
    canViewMonitoring: user?.is_active || false,
    canAccessAdmin: user?.is_superuser || false,
  };
};

// Hook para validar sessão
export const useValidateSession = () => {
  const { token, refreshUser } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('No token available');
      }
      await refreshUser();
    },
    onError: () => {
      toast({
        title: "Sessão expirada",
        description: "Por favor, faça login novamente",
        variant: "destructive",
      });
    },
  });
};
