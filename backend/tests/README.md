# 🧪 Testes das APIs de Autenticação - VUR

Este diretório contém scripts de teste para validar todas as APIs de autenticação do sistema VUR.

## 📋 Testes Incluídos

### **Script Principal: `test_auth_apis.py`**

Testa todos os endpoints de autenticação:

- ✅ **Health Check** - Verifica se a API está funcionando
- ✅ **POST /auth/register** - Registro de novo usuário
- ✅ **POST /auth/register** - Teste de usuário duplicado (erro esperado)
- ✅ **POST /auth/login** - Login com usuário recém-criado
- ✅ **POST /auth/login** - Login com usuário existente
- ✅ **POST /auth/login** - Login com credenciais inválidas (erro esperado)
- ✅ **GET /auth/me** - Obter perfil do usuário atual
- ✅ **GET /auth/me** - Teste com token inválido (erro esperado)
- ✅ **PUT /auth/profile** - Atualização de perfil
- ✅ **PUT /auth/profile** - Teste com token inválido (erro esperado)

## 🚀 Como Usar

### **1. Instalar Dependências**

```bash
# Instalar dependências de teste
pip install -r requirements-test.txt

# Ou instalar manualmente
pip install aiohttp pytest pytest-asyncio
```

### **2. Executar Testes**

#### **Execução Básica:**
```bash
cd backend/tests
python test_auth_apis.py
```

#### **Modo Verboso (mostra detalhes das requisições):**
```bash
python test_auth_apis.py --verbose
```

#### **URL Personalizada:**
```bash
python test_auth_apis.py --base-url http://localhost:8000
```

#### **Combinando Opções:**
```bash
python test_auth_apis.py --verbose --base-url http://production-api.com
```

### **3. Exemplo de Saída**

```
🚀 INICIANDO TESTES DAS APIs DE AUTENTICAÇÃO
🌐 Base URL: http://localhost:8000/api/v1
⏰ Timeout: 30s

============================================================
🧪 TESTE: Health Check
============================================================
✅ API está funcionando!

============================================================
🧪 TESTE: Registro de Novo Usuário
============================================================
✅ Usuário registrado com sucesso!
ℹ️  ID: 123
ℹ️  Username: testuser_abc123
ℹ️  Email: test_xyz789@example.com

============================================================
📊 RESUMO DOS TESTES
============================================================
Total de Testes: 10
✅ Passou: 10
❌ Falhou: 0
📈 Taxa de Sucesso: 100.0%
============================================================
```

## 🔧 Configurações

### **Variáveis de Ambiente**

O script usa as seguintes configurações padrão:

- **Base URL**: `http://localhost:8000/api/v1`
- **Timeout**: `30 segundos`
- **Usuário Existente**: `testuser` / `TestPassword123`

### **Dados de Teste**

O script gera automaticamente:
- Email aleatório: `test_xxxxxxxx@example.com`
- Username aleatório: `testuser_xxxxxx`
- Senha padrão: `TestPassword123!`
- Nome completo: `Test User API`

## 📊 Interpretação dos Resultados

### **✅ Teste Passou**
- Status HTTP correto recebido
- Dados válidos retornados
- Funcionalidade funcionando conforme esperado

### **❌ Teste Falhou**
- Status HTTP incorreto
- Erro inesperado
- Funcionalidade não está funcionando

### **⚠️ Aviso**
- Comportamento inesperado mas não crítico
- Pode indicar problema de configuração

## 🛠️ Troubleshooting

### **Erro: "Connection refused"**
```bash
# Verificar se o backend está rodando
docker ps | grep backend
curl http://localhost:8000/health
```

### **Erro: "Token inválido"**
- Normal para testes de token inválido
- Se ocorrer em testes válidos, verificar configuração JWT

### **Erro: "Usuário já existe"**
- Normal para teste de duplicação
- Se ocorrer no primeiro registro, limpar banco de dados

### **Timeout**
```bash
# Aumentar timeout se necessário
python test_auth_apis.py --timeout 60
```

## 📝 Logs Detalhados

Para debug completo, use o modo verboso:

```bash
python test_auth_apis.py --verbose
```

Isso mostrará:
- URLs completas das requisições
- Dados enviados (JSON)
- Status HTTP recebidos
- Respostas completas da API

## 🔄 Integração Contínua

Para usar em CI/CD:

```bash
# Script retorna código de saída apropriado
python test_auth_apis.py
echo $?  # 0 = sucesso, 1 = falha
```

## 📚 Extensão

Para adicionar novos testes:

1. Criar nova função `async def test_nome_do_teste(self)`
2. Adicionar à lista `tests` em `run_all_tests()`
3. Usar `self._record_test_result()` para registrar resultado

## 🆘 Suporte

Se encontrar problemas:

1. Verificar se o backend está rodando
2. Confirmar URL da API
3. Verificar logs do backend
4. Executar em modo verboso para debug 