// Mock API para desenvolvimento quando o backend não está disponível

interface MockUser {
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

interface MockAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Usuários mock
const mockUsers: MockUser[] = [
  {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Usuário de Teste',
    bio: 'Usuário criado para testes de desenvolvimento',
    is_active: true,
    is_superuser: false,
    created_at: '2024-01-01T00:00:00Z',
    last_login: new Date().toISOString(),
  },
  {
    id: 2,
    email: 'admin@example.com',
    username: 'admin',
    full_name: 'Administrador',
    bio: 'Usuário administrador do sistema',
    is_active: true,
    is_superuser: true,
    created_at: '2024-01-01T00:00:00Z',
    last_login: new Date().toISOString(),
  }
];

// Simular delay de rede
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Gerar token mock
const generateMockToken = (user: MockUser): MockAuthToken => ({
  access_token: `mock_token_${user.id}_${Date.now()}`,
  token_type: 'bearer',
  expires_in: 3600,
});

export class MockApiClient {
  private currentUser: MockUser | null = null;
  private currentToken: string | null = null;

  async login(credentials: { username: string; password: string }): Promise<MockAuthToken> {
    await delay(500); // Simular delay de rede

    console.log('🔧 Usando Mock API para login');

    // Verificar credenciais
    const user = mockUsers.find(u => 
      u.username === credentials.username || u.email === credentials.username
    );

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Para o mock, aceitar qualquer senha que tenha pelo menos 6 caracteres
    if (credentials.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    // Simular sucesso
    this.currentUser = { ...user, last_login: new Date().toISOString() };
    const token = generateMockToken(user);
    this.currentToken = token.access_token;

    // Salvar no localStorage para persistência
    localStorage.setItem('mock_user', JSON.stringify(this.currentUser));
    localStorage.setItem('mock_token', this.currentToken);

    return token;
  }

  async register(data: { 
    email: string; 
    username: string; 
    password: string; 
    full_name?: string; 
  }): Promise<void> {
    await delay(500);

    console.log('🔧 Usando Mock API para registro');

    // Verificar se usuário já existe
    const existingUser = mockUsers.find(u => 
      u.username === data.username || u.email === data.email
    );

    if (existingUser) {
      throw new Error('Usuário já existe');
    }

    // Criar novo usuário
    const newUser: MockUser = {
      id: mockUsers.length + 1,
      email: data.email,
      username: data.username,
      full_name: data.full_name,
      is_active: true,
      is_superuser: false,
      created_at: new Date().toISOString(),
    };

    mockUsers.push(newUser);
    console.log('✅ Usuário criado no mock:', newUser);
  }

  async getCurrentUser(): Promise<MockUser> {
    await delay(200);

    console.log('🔧 Usando Mock API para obter usuário atual');

    // Tentar recuperar do localStorage
    const savedUser = localStorage.getItem('mock_user');
    const savedToken = localStorage.getItem('mock_token');

    if (savedUser && savedToken && this.currentToken === savedToken) {
      this.currentUser = JSON.parse(savedUser);
      return this.currentUser!;
    }

    if (!this.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    return this.currentUser;
  }

  async updateProfile(data: Partial<MockUser>): Promise<MockUser> {
    await delay(300);

    console.log('🔧 Usando Mock API para atualizar perfil');

    if (!this.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    // Atualizar dados do usuário
    this.currentUser = {
      ...this.currentUser,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Salvar no localStorage
    localStorage.setItem('mock_user', JSON.stringify(this.currentUser));

    return this.currentUser;
  }

  logout(): void {
    console.log('🔧 Usando Mock API para logout');
    this.currentUser = null;
    this.currentToken = null;
    localStorage.removeItem('mock_user');
    localStorage.removeItem('mock_token');
  }

  // Verificar se deve usar mock
  static shouldUseMock(): boolean {
    return localStorage.getItem('vur_use_mock_api') === 'true';
  }

  // Habilitar/desabilitar mock
  static enableMock(): void {
    localStorage.setItem('vur_use_mock_api', 'true');
    console.log('🔧 Mock API habilitado');
  }

  static disableMock(): void {
    localStorage.removeItem('vur_use_mock_api');
    console.log('🔧 Mock API desabilitado');
  }
}

// Instância singleton
export const mockApi = new MockApiClient();

// Função para verificar se o backend está disponível
export const checkBackendAvailability = async (): Promise<boolean> => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Backend não disponível, considerando usar mock API');
    return false;
  }
};

// Função para decidir automaticamente entre API real e mock
export const getApiClient = async () => {
  // Verificar se detecção automática está desabilitada
  const disableDetection = localStorage.getItem('vur_disable_mock_detection') === 'true';
  const forceReal = localStorage.getItem('vur_force_real_api') === 'true';

  if (disableDetection || forceReal) {
    console.log('🚀 Detecção automática desabilitada - usando API real');
    return null; // Sempre usar API real
  }

  // Se mock está forçado manualmente, usar mock
  if (MockApiClient.shouldUseMock()) {
    console.log('🔧 Usando Mock API (forçado manualmente)');
    return mockApi;
  }

  // Verificar se backend está disponível (apenas se detecção não estiver desabilitada)
  const backendAvailable = await checkBackendAvailability();

  if (!backendAvailable) {
    console.warn('⚠️ Backend não disponível, mas detecção automática pode estar desabilitada');
    // Não ativar mock automaticamente se detecção estiver desabilitada
    return null;
  }

  // Backend disponível, usar API real
  console.log('✅ Backend disponível, usando API real');
  return null; // Indica que deve usar a API real
};
