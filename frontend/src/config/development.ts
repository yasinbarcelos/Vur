// Configurações para desenvolvimento
export const DEV_CONFIG = {
  // Habilitar valores padrão nos formulários
  enableDefaultValues: import.meta.env.VITE_DEV_DEFAULT_VALUES !== 'false',

  // Habilitar botões de login/registro rápido
  enableQuickActions: import.meta.env.VITE_DEV_QUICK_ACTIONS !== 'false',

  // Mostrar avisos de desenvolvimento
  showDevWarnings: import.meta.env.VITE_DEV_WARNINGS !== 'false',

  // Credenciais padrão para desenvolvimento
  defaultCredentials: {
    login: {
      username: import.meta.env.VITE_DEV_USERNAME || 'testuser',
      password: import.meta.env.VITE_DEV_PASSWORD || 'TestPassword123',
    },
    register: {
      email: import.meta.env.VITE_DEV_EMAIL || 'test@example.com',
      username: import.meta.env.VITE_DEV_USERNAME || 'testuser',
      password: import.meta.env.VITE_DEV_PASSWORD || 'Test123456',
      full_name: import.meta.env.VITE_DEV_FULLNAME || 'Usuário de Teste',
    },
  },
  
  // URLs da API
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
  },
  
  // Configurações de debug
  debug: {
    enableLogs: true,
    enableReactQueryDevtools: true,
    logApiCalls: true,
  },
  
  // Configurações de UI para desenvolvimento
  ui: {
    showTestData: true,
    enableMockData: false,
    fastAnimations: true,
  },
};

// Verificar se está em modo de desenvolvimento
export const isDevelopment = import.meta.env.DEV;

// Verificar se deve usar configurações de desenvolvimento
export const useDevConfig = isDevelopment && DEV_CONFIG.enableDefaultValues;

// Função para obter credenciais padrão
export const getDefaultCredentials = () => {
  if (!useDevConfig) return {};
  
  return DEV_CONFIG.defaultCredentials;
};

// Função para verificar se deve mostrar botões rápidos
export const shouldShowQuickActions = () => {
  return isDevelopment && DEV_CONFIG.enableQuickActions;
};

// Função para verificar se deve mostrar avisos de desenvolvimento
export const shouldShowDevWarnings = () => {
  return isDevelopment && DEV_CONFIG.showDevWarnings;
};

// Função para log de desenvolvimento
export const devLog = (message: string, data?: any) => {
  if (isDevelopment && DEV_CONFIG.debug.enableLogs) {
    console.log(`[VUR DEV] ${message}`, data || '');
  }
};

// Função para log de API calls
export const apiLog = (method: string, url: string, data?: any) => {
  if (isDevelopment && DEV_CONFIG.debug.logApiCalls) {
    console.log(`[VUR API] ${method.toUpperCase()} ${url}`, data || '');
  }
};

export default DEV_CONFIG;
