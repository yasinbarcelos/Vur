// Funções de debug para serem usadas no console do navegador

import { MockApiClient } from '@/lib/mockApi';

// Função para limpar completamente o sistema
export const resetVURSystem = () => {
  console.log('🧹 Iniciando reset completo do sistema VUR...');
  
  // Limpar todos os dados relacionados ao VUR
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('vur_') || 
    key.startsWith('mock_') ||
    key === 'vur_auth_token' ||
    key === 'vur_token_expiry'
  );
  
  console.log('🗑️ Removendo chaves:', keysToRemove);
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  // Desabilitar modo mock
  MockApiClient.disableMock();
  
  console.log('✅ Reset completo realizado!');
  console.log('🔄 Recarregando página...');
  
  // Recarregar página
  window.location.href = '/auth';
};

// Função para forçar API real
export const forceRealAPI = () => {
  console.log('🌐 Forçando uso da API real...');
  
  // Desabilitar mock
  MockApiClient.disableMock();
  
  // Limpar dados mock
  localStorage.removeItem('mock_user');
  localStorage.removeItem('mock_token');
  
  console.log('✅ API real ativada!');
  console.log('🔄 Recarregando página...');
  
  window.location.reload();
};

// Função para forçar modo mock
export const forceMockMode = () => {
  console.log('🔧 Forçando modo mock...');
  
  // Habilitar mock
  MockApiClient.enableMock();
  
  console.log('✅ Modo mock ativado!');
  console.log('🔄 Redirecionando para login...');
  
  window.location.href = '/auth';
};

// Função para mostrar status atual
export const showVURStatus = () => {
  const isMockMode = MockApiClient.shouldUseMock();
  const hasAuthToken = !!localStorage.getItem('vur_auth_token');
  const hasMockUser = !!localStorage.getItem('mock_user');
  const hasMockToken = !!localStorage.getItem('mock_token');
  const allVURKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('vur_') || key.startsWith('mock_')
  );

  console.log('📊 Status atual do VUR:');
  console.log('🔧 Modo Mock:', isMockMode ? '✅ Ativo' : '❌ Inativo');
  console.log('🔑 Token Real:', hasAuthToken ? '✅ Presente' : '❌ Ausente');
  console.log('👤 Usuário Mock:', hasMockUser ? '✅ Presente' : '❌ Ausente');
  console.log('🔑 Token Mock:', hasMockToken ? '✅ Presente' : '❌ Ausente');
  console.log('💾 Chaves no localStorage:', allVURKeys);
  
  return {
    isMockMode,
    hasAuthToken,
    hasMockUser,
    hasMockToken,
    allVURKeys
  };
};

// Função para testar conectividade
export const testBackendConnection = async () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  console.log('🔍 Testando conectividade com backend...');
  console.log('🌐 URL:', API_BASE_URL);
  
  try {
    const healthUrl = API_BASE_URL.replace('/api/v1', '/health');
    console.log('🏥 Testando health endpoint:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend conectado!', data);
      return { status: 'success', data };
    } else {
      console.log('⚠️ Backend respondeu com erro:', response.status, response.statusText);
      return { status: 'error', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ Erro de conectividade:', error);
    return { status: 'failed', error: error.message };
  }
};

// Função para fazer login de teste
export const testLogin = async (username = 'testuser', password = 'Test123456') => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  console.log('🔐 Testando login...');
  console.log('👤 Username:', username);
  console.log('🔑 Password:', password);
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('📡 Resposta:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login bem-sucedido!', data);
      return { status: 'success', data };
    } else {
      const error = await response.json();
      console.log('❌ Login falhou:', error);
      return { status: 'failed', error };
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error);
    return { status: 'error', error: error.message };
  }
};

// Expor funções globalmente para uso no console
if (typeof window !== 'undefined') {
  (window as any).VUR_DEBUG = {
    reset: resetVURSystem,
    forceReal: forceRealAPI,
    forceMock: forceMockMode,
    status: showVURStatus,
    testConnection: testBackendConnection,
    testLogin: testLogin,
    help: () => {
      console.log('🛠️ Funções de debug disponíveis:');
      console.log('VUR_DEBUG.reset() - Reset completo do sistema');
      console.log('VUR_DEBUG.forceReal() - Forçar API real');
      console.log('VUR_DEBUG.forceMock() - Forçar modo mock');
      console.log('VUR_DEBUG.status() - Mostrar status atual');
      console.log('VUR_DEBUG.testConnection() - Testar conectividade');
      console.log('VUR_DEBUG.testLogin() - Testar login');
      console.log('VUR_DEBUG.help() - Mostrar esta ajuda');
    }
  };
  
  console.log('🛠️ Funções de debug VUR carregadas!');
  console.log('Digite VUR_DEBUG.help() para ver comandos disponíveis');
}
