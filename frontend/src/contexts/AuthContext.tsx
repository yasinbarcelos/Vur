import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { mockApi, MockApiClient, getApiClient } from '@/lib/mockApi';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  bio?: string;
  profile_picture?: string;
  is_active: boolean;
  is_superuser: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'vur_auth_token';
const TOKEN_EXPIRY_KEY = 'vur_token_expiry';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Verificar se há token salvo e se ainda é válido
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔄 Inicializando autenticação...');

      // Verificar se está em modo mock
      const isMockMode = MockApiClient.shouldUseMock();
      console.log('🔧 Modo Mock:', isMockMode);

      if (isMockMode) {
        // Tentar recuperar usuário mock
        const mockUser = localStorage.getItem('mock_user');
        const mockToken = localStorage.getItem('mock_token');

        if (mockUser && mockToken) {
          console.log('✅ Recuperando sessão mock');
          setUser(JSON.parse(mockUser));
          setToken(mockToken);
          setIsLoading(false);
          return;
        } else {
          console.log('❌ Dados mock não encontrados, limpando modo mock');
          MockApiClient.disableMock();
        }
      }

      // Verificar token real
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

      if (savedToken && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const now = Date.now();

        if (now < expiryTime) {
          setToken(savedToken);
          try {
            await fetchCurrentUser(savedToken);
            console.log('✅ Sessão real recuperada');
          } catch (error) {
            console.error('❌ Falha ao recuperar usuário real:', error);
            clearAuth();
          }
        } else {
          console.log('⏰ Token expirado, limpando auth');
          clearAuth();
        }
      } else {
        console.log('❌ Nenhum token encontrado');
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const clearAuth = () => {
    console.log('🧹 Limpando autenticação...');

    // Limpar tokens reais
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);

    // Limpar dados mock
    localStorage.removeItem('mock_user');
    localStorage.removeItem('mock_token');

    // Limpar estado
    setToken(null);
    setUser(null);

    console.log('✅ Autenticação limpa');
  };

  const saveToken = (authToken: AuthToken) => {
    const expiryTime = Date.now() + (authToken.expires_in * 1000);
    localStorage.setItem(TOKEN_KEY, authToken.access_token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    setToken(authToken.access_token);
  };

  const fetchCurrentUser = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) throw new Error('No token available');

    const url = `${API_BASE_URL}/auth/me`;
    console.log('🔍 Fazendo fetch para:', url);
    console.log('🔍 API_BASE_URL:', API_BASE_URL);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${tokenToUse}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const userData = await response.json();
    setUser(userData);
    return userData;
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      console.log('🔐 Tentando fazer login...', {
        url: `${API_BASE_URL}/auth/login`,
        username: credentials.username
      });

      // Verificar se detecção automática está desabilitada
      const disableDetection = localStorage.getItem('vur_disable_mock_detection') === 'true';
      const forceReal = localStorage.getItem('vur_force_real_api') === 'true';

      if (!disableDetection && !forceReal) {
        // Verificar se deve usar mock API (apenas se detecção não estiver desabilitada)
        const apiClient = await getApiClient();

        if (apiClient) {
          // Usar Mock API
          const authToken = await apiClient.login(credentials);
          saveToken(authToken);

          // Para mock, simular fetchCurrentUser
          const user = await apiClient.getCurrentUser();
          setUser(user);

          toast({
            title: "Login realizado com sucesso! (Mock)",
            description: "Bem-vindo de volta ao VUR (usando dados simulados)",
          });
          return;
        }
      } else {
        console.log('🚀 Detecção automática desabilitada - usando API real diretamente');
      }

      // Usar API real
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📡 Resposta do servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const authToken: AuthToken = await response.json();
      console.log('✅ Token recebido:', {
        token_type: authToken.token_type,
        expires_in: authToken.expires_in
      });

      saveToken(authToken);
      await fetchCurrentUser(authToken.access_token);

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao VUR",
      });
    } catch (error) {
      console.error('❌ Erro no login:', error);

      let message = 'Erro no login';
      let shouldTryMock = false;

      if (error instanceof TypeError && error.message.includes('fetch')) {
        message = `Não foi possível conectar ao servidor. Tentando usar modo offline...`;
        shouldTryMock = true;
      } else if (error instanceof Error) {
        message = error.message;
      }

      // Se houve erro de conectividade, tentar mock como fallback
      if (shouldTryMock && !MockApiClient.shouldUseMock()) {
        try {
          console.log('🔧 Tentando fallback para Mock API...');
          MockApiClient.enableMock();
          const authToken = await mockApi.login(credentials);
          saveToken(authToken);

          const user = await mockApi.getCurrentUser();
          setUser(user);

          toast({
            title: "Login realizado (Modo Offline)!",
            description: "Conectado usando dados simulados. Funcionalidades limitadas.",
          });
          return;
        } catch (mockError) {
          console.error('❌ Erro no mock também:', mockError);
          MockApiClient.disableMock();
        }
      }

      toast({
        title: "Erro no login",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      // Verificar se deve usar mock API
      const apiClient = await getApiClient();

      if (apiClient) {
        // Usar Mock API
        await apiClient.register(data);

        toast({
          title: "Conta criada com sucesso! (Mock)",
          description: "Fazendo login automaticamente...",
        });

        // Fazer login automaticamente após registro
        await login({ username: data.username, password: data.password });
        return;
      }

      // Usar API real
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Fazendo login automaticamente...",
      });

      // Fazer login automaticamente após registro
      await login({ username: data.username, password: data.password });
    } catch (error) {
      console.error('❌ Erro no registro:', error);

      let message = 'Erro no registro';
      let shouldTryMock = false;

      if (error instanceof TypeError && error.message.includes('fetch')) {
        message = `Não foi possível conectar ao servidor. Tentando usar modo offline...`;
        shouldTryMock = true;
      } else if (error instanceof Error) {
        message = error.message;
      }

      // Se houve erro de conectividade, tentar mock como fallback
      if (shouldTryMock && !MockApiClient.shouldUseMock()) {
        try {
          console.log('🔧 Tentando fallback para Mock API no registro...');
          MockApiClient.enableMock();
          await mockApi.register(data);

          toast({
            title: "Conta criada (Modo Offline)!",
            description: "Fazendo login automaticamente...",
          });

          await login({ username: data.username, password: data.password });
          return;
        } catch (mockError) {
          console.error('❌ Erro no mock também:', mockError);
          MockApiClient.disableMock();
        }
      }

      toast({
        title: "Erro no registro",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('👋 Fazendo logout...');

    // Se estava em modo mock, desabilitar
    if (MockApiClient.shouldUseMock()) {
      console.log('🔧 Desabilitando modo mock no logout');
      MockApiClient.disableMock();
    }

    clearAuth();

    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso",
    });
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Profile update failed');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro na atualização';
      toast({
        title: "Erro na atualização",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        await fetchCurrentUser();
      } catch (error) {
        console.error('Failed to refresh user:', error);
        clearAuth();
      }
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
