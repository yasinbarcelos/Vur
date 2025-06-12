// Função para forçar o uso da API real e limpar completamente o modo mock

export const forceRealAPIMode = () => {
  console.log('🚀 FORÇANDO USO DA API REAL...');
  
  // 1. Limpar TODOS os dados relacionados ao mock
  console.log('🧹 Limpando dados mock...');
  localStorage.removeItem('vur_use_mock_api');
  localStorage.removeItem('mock_user');
  localStorage.removeItem('mock_token');
  
  // 2. Limpar dados de autenticação existentes
  console.log('🧹 Limpando dados de auth...');
  localStorage.removeItem('vur_auth_token');
  localStorage.removeItem('vur_token_expiry');
  
  // 3. Limpar qualquer outro dado VUR
  console.log('🧹 Limpando outros dados VUR...');
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('vur_') || key.startsWith('mock_')) {
      localStorage.removeItem(key);
    }
  });
  
  // 4. Desabilitar detecção automática e forçar API real
  localStorage.setItem('vur_disable_mock_detection', 'true');
  localStorage.setItem('vur_force_real_api', 'true');

  console.log('✅ Limpeza completa realizada!');
  console.log('🚀 Detecção automática de mock DESABILITADA');
  console.log('🔄 Redirecionando para login...');

  // 5. Redirecionar para página de login
  window.location.href = '/auth';
};

// Função para verificar se deve forçar API real
export const shouldForceRealAPI = (): boolean => {
  return localStorage.getItem('vur_force_real_api') === 'true';
};

// Função para limpar flag de força
export const clearForceRealAPI = () => {
  localStorage.removeItem('vur_force_real_api');
};

// Expor globalmente para uso no console
if (typeof window !== 'undefined') {
  (window as any).FORCE_REAL_API = forceRealAPIMode;
  console.log('🛠️ Função FORCE_REAL_API() disponível no console');
}
