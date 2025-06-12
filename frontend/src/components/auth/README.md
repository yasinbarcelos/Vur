# Sistema de Autenticação VUR

Este diretório contém todos os componentes relacionados ao sistema de autenticação da plataforma VUR.

## Componentes

### AuthContext.tsx
Context React que gerencia o estado global de autenticação:
- **Estado do usuário**: Informações do usuário logado
- **Token JWT**: Gerenciamento automático de tokens
- **Persistência**: Salva estado no localStorage
- **Auto-refresh**: Verifica validade do token automaticamente

### LoginForm.tsx
Formulário de login com:
- Validação com Zod
- Mostrar/ocultar senha
- Estados de loading
- Tratamento de erros
- Integração com AuthContext

### RegisterForm.tsx
Formulário de registro com:
- Validação avançada de senha
- Indicadores visuais de força da senha
- Confirmação de senha
- Validação de email e username
- Auto-login após registro

### AuthPage.tsx
Página principal de autenticação:
- Design responsivo
- Alternância entre login/registro
- Informações da plataforma
- Redirecionamento automático

### ProtectedRoute.tsx
Componente para proteger rotas:
- Verificação de autenticação
- Redirecionamento para login
- Loading states
- Preservação de destino original

### UserProfile.tsx
Componente de perfil do usuário:
- Edição de informações
- Avatar com iniciais
- Badges de status (admin, ativo)
- Informações da conta
- Logout

## Hooks Personalizados

### useAuth.ts
Hook principal para autenticação:
- `useLogin()` - Mutation para login
- `useRegister()` - Mutation para registro
- `useLogout()` - Mutation para logout
- `useUpdateProfile()` - Mutation para atualizar perfil
- `useCurrentUser()` - Query para dados do usuário
- `usePermissions()` - Verificação de permissões

## Fluxo de Autenticação

1. **Inicialização**: AuthContext verifica token salvo
2. **Login**: Usuário faz login → token salvo → redirecionamento
3. **Navegação**: ProtectedRoute verifica autenticação
4. **Auto-refresh**: Token verificado automaticamente
5. **Logout**: Token removido → redirecionamento para login

## Configuração

### Variáveis de Ambiente
```env
VITE_API_URL=http://localhost:8000/api/v1
```

### Integração com Backend
O sistema espera as seguintes rotas da API:
- `POST /auth/login` - Login
- `POST /auth/register` - Registro
- `GET /auth/me` - Dados do usuário atual
- `PUT /auth/profile` - Atualizar perfil

### Estrutura de Token
```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## Uso

### Proteger uma Rota
```tsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

### Usar Dados do Usuário
```tsx
const { user, isAuthenticated, logout } = useAuth();

if (isAuthenticated) {
  return <div>Olá, {user?.username}!</div>;
}
```

### Fazer Login Programaticamente
```tsx
const { mutate: login, isLoading } = useLogin();

const handleLogin = () => {
  login({ username: 'user', password: 'pass' });
};
```

## Segurança

- **JWT Storage**: Tokens armazenados no localStorage
- **Auto-expiry**: Verificação automática de expiração
- **Interceptors**: Axios interceptors para adicionar tokens
- **Error Handling**: Tratamento de erros 401/403
- **Validation**: Validação robusta de formulários

## Personalização

### Temas
Os componentes usam classes Tailwind e podem ser personalizados via:
- Variáveis CSS customizadas
- Modificação das classes Tailwind
- Componentes UI shadcn/ui

### Validação
Esquemas Zod podem ser modificados em cada formulário para ajustar regras de validação.

### Estados de Loading
Componentes de loading personalizáveis em `@/components/ui/loading.tsx`.

## Troubleshooting

### Token não persiste
Verifique se o localStorage está disponível e se não há conflitos de domínio.

### Redirecionamento infinito
Verifique se as rotas estão configuradas corretamente e se não há loops entre ProtectedRoute e páginas de auth.

### Erro 401 constante
Verifique se o backend está retornando tokens válidos e se as rotas da API estão corretas.
