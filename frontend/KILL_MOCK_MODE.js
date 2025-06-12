// SCRIPT DE EMERGÊNCIA - MATAR MODO MOCK COMPLETAMENTE
// Execute este código no console do navegador (F12 → Console)

console.log('🔥🔥🔥 MATANDO MODO MOCK COMPLETAMENTE 🔥🔥🔥');

// 1. LIMPAR TUDO DO LOCALSTORAGE
console.log('🧹 Limpando localStorage...');
localStorage.clear();
sessionStorage.clear();

// 2. DESABILITAR TODAS AS DETECÇÕES AUTOMÁTICAS
console.log('🚫 Desabilitando detecções automáticas...');
localStorage.setItem('vur_disable_mock_detection', 'true');
localStorage.setItem('vur_force_real_api', 'true');
localStorage.setItem('vur_never_use_mock', 'true');

// 3. REMOVER QUALQUER REFERÊNCIA A MOCK
console.log('💀 Removendo referências a mock...');
localStorage.removeItem('vur_use_mock_api');
localStorage.removeItem('mock_user');
localStorage.removeItem('mock_token');

// 4. SOBRESCREVER FUNÇÕES DE MOCK (HACK TEMPORÁRIO)
console.log('🔧 Sobrescrevendo funções de mock...');
if (window.MockApiClient) {
  window.MockApiClient.shouldUseMock = () => false;
  window.MockApiClient.enableMock = () => console.log('Mock desabilitado!');
}

// 5. FORÇAR RECARREGAMENTO COMPLETO
console.log('🔄 Forçando recarregamento...');
setTimeout(() => {
  window.location.href = '/auth?force_real=true';
}, 500);

console.log('✅ MODO MOCK MORTO! Recarregando em 0.5s...');
