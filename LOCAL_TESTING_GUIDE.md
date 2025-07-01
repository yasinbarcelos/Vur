# 🧪 Guia de Testes Locais - CI/CD VUR

## 📋 Visão Geral

Antes de fazer push para o GitHub e triggerar os workflows de CI/CD, é essencial testar tudo localmente. Este guia mostra **várias formas** de validar sua configuração.

---

## 🚀 **MÉTODO 1: Script Automático (Recomendado)**

### **Linux/Mac:**
```bash
# Tornar executável e executar
chmod +x scripts/test-ci-local.sh
./scripts/test-ci-local.sh
```

### **Windows:**
```cmd
# Executar script batch
scripts\test-ci-local.bat
```

### **O que o script testa:**
- ✅ Estrutura de arquivos obrigatórios
- ✅ Qualidade de código (Black, ESLint, etc.)
- ✅ Type checking (MyPy, TypeScript)
- ✅ Builds Docker locais
- ✅ Validação de YAMLs
- ✅ Testes unitários (se existirem)

---

## 🔧 **MÉTODO 2: Testes Manuais Passo a Passo**

### **🐍 1. Backend (Python/FastAPI)**

#### **Preparar ambiente:**
```bash
cd backend

# Criar ambiente virtual
python -m venv venv_test
source venv_test/bin/activate  # Linux/Mac
# ou
venv_test\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt
pip install pytest black isort flake8 mypy
```

#### **Executar verificações:**
```bash
# 1. Formatação de código
black --check --diff .
# Para corrigir: black .

# 2. Organização de imports
isort --check-only --diff .
# Para corrigir: isort .

# 3. Linting
flake8 .

# 4. Type checking
mypy app/ --ignore-missing-imports

# 5. Testes (se existirem)
pytest tests/ -v

# 6. Cobertura de testes
pytest --cov=app --cov-report=term-missing
```

### **⚛️ 2. Frontend (React/TypeScript)**

#### **Preparar ambiente:**
```bash
cd frontend

# Instalar dependências
npm install
```

#### **Executar verificações:**
```bash
# 1. Linting
npm run lint
# Para corrigir alguns problemas: npm run lint:fix

# 2. Verificação de tipos
npm run type-check

# 3. Formatação
npm run format:check
# Para corrigir: npm run format

# 4. Build de produção
npm run build

# 5. Verificar se build foi criado
ls -la dist/  # Linux/Mac
dir dist\     # Windows

# 6. Testes (se configurados)
npm test
```

### **🐳 3. Docker**

#### **Builds locais:**
```bash
# Build backend
docker build -t vur-backend-local ./backend

# Build frontend  
docker build -t vur-frontend-local ./frontend

# Verificar imagens criadas
docker images | grep vur
```

#### **Teste de execução:**
```bash
# Testar backend
docker run --rm -d --name backend-test -p 8001:8000 vur-backend-local
sleep 5
curl http://localhost:8001/health
docker stop backend-test

# Testar frontend
docker run --rm -d --name frontend-test -p 3001:3000 vur-frontend-local
sleep 3
curl http://localhost:3001
docker stop frontend-test

# Limpar
docker rmi vur-backend-local vur-frontend-local
```

### **📋 4. Validações de Configuração**

#### **YAML Workflows:**
```bash
# Verificar sintaxe YAML (Python)
python -c "import yaml; [yaml.safe_load(open(f)) for f in ['.github/workflows/ci-cd.yml', '.github/workflows/security.yml', '.github/workflows/release.yml']]"

# Verificar docker-compose
docker-compose -f docker-compose.yml config
docker-compose -f docker-compose.dev.yml config
```

---

## 🎯 **MÉTODO 3: Simulação com GitHub Actions (Avançado)**

### **Usando `act` (GitHub Actions Local Runner):**

#### **Instalação:**
```bash
# Mac
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (via Chocolatey)
choco install act-cli
```

#### **Executar workflows localmente:**
```bash
# Listar workflows disponíveis
act -l

# Executar workflow de CI/CD
act push

# Executar job específico
act -j backend-test
act -j frontend-test

# Executar com eventos específicos
act pull_request

# Debug mode
act -v
```

### **Limitações do `act`:**
- ⚠️ Não executa services (PostgreSQL, Redis)
- ⚠️ Secrets precisam ser configurados
- ⚠️ Algumas actions podem não funcionar

---

## 🔄 **MÉTODO 4: Integração Completa Local**

### **Usando Docker Compose:**

#### **Ambiente de desenvolvimento:**
```bash
# Subir ambiente completo
docker-compose -f docker-compose.dev.yml up --build

# Aguardar inicialização
sleep 30

# Testar endpoints
curl http://localhost:8000/health  # Backend
curl http://localhost:3000         # Frontend

# Verificar logs
docker-compose -f docker-compose.dev.yml logs backend
docker-compose -f docker-compose.dev.yml logs frontend

# Limpar
docker-compose -f docker-compose.dev.yml down
```

---

## 📊 **INTERPRETANDO RESULTADOS**

### **✅ Todos os testes passaram:**
```
📊 RELATÓRIO FINAL DOS TESTES
✅ Testes que passaram: 15
❌ Testes que falharam: 0
🎉 TODOS OS TESTES PASSARAM!
✅ Seu código está pronto para push no GitHub
```

**Próximos passos:**
1. `git add .`
2. `git commit -m "feat: implementar CI/CD completo"`
3. `git push origin main`

### **❌ Alguns testes falharam:**
```
📊 RELATÓRIO FINAL DOS TESTES
✅ Testes que passaram: 12
❌ Testes que falharam: 3
⚠️ ALGUNS TESTES FALHARAM
```

**Ações corretivas:**

#### **Problemas de formatação:**
```bash
# Backend
cd backend && black . && isort .

# Frontend
cd frontend && npm run lint:fix && npm run format
```

#### **Problemas de build:**
```bash
# Verificar logs detalhados
npm run build        # Frontend
docker build ./backend  # Backend
```

#### **Problemas de dependências:**
```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

---

## 🛠️ **TROUBLESHOOTING**

### **Problemas Comuns:**

#### **1. "Python não encontrado"**
```bash
# Verificar versão
python --version
python3 --version

# Instalar Python se necessário
```

#### **2. "npm não encontrado"**
```bash
# Verificar Node.js
node --version
npm --version

# Instalar Node.js se necessário
```

#### **3. "Docker não está rodando"**
```bash
# Verificar status
docker info

# Iniciar Docker Desktop (Windows/Mac)
# ou
sudo systemctl start docker  # Linux
```

#### **4. "Porta já está em uso"**
```bash
# Verificar processos usando a porta
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Matar processo se necessário
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

#### **5. "Módulo não encontrado"**
```bash
# Backend - reinstalar dependências
cd backend
pip install -r requirements.txt

# Frontend - limpar e reinstalar
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📈 **Métricas de Qualidade**

### **Metas recomendadas:**

| Métrica | Meta | Como verificar |
|---------|------|----------------|
| **Code Coverage** | > 80% | `pytest --cov` |
| **Type Coverage** | 100% | `mypy` sem erros |
| **Linting Score** | 100% | `flake8`, `eslint` sem erros |
| **Build Success** | 100% | Builds Docker passam |
| **Performance** | Build < 2min | Cronometrar builds |

### **Dashboard local:**
```bash
# Gerar relatório de cobertura HTML
cd backend && pytest --cov=app --cov-report=html
open htmlcov/index.html

# Relatório de tipos TypeScript
cd frontend && npx tsc --noEmit --pretty
```

---

## 🎯 **Checklist Final**

Antes de fazer push, verifique:

- [ ] ✅ Script de teste local passou 100%
- [ ] ✅ Todos os arquivos YAML são válidos
- [ ] ✅ Builds Docker funcionam localmente
- [ ] ✅ Testes unitários passam (se existirem)
- [ ] ✅ Código está formatado corretamente
- [ ] ✅ Sem erros de tipo ou linting
- [ ] ✅ Frontend builda e gera dist/
- [ ] ✅ Backend responde em health checks

### **Comando final de verificação:**
```bash
# Executar teste completo uma última vez
./scripts/test-ci-local.sh

# Se tudo passou, fazer push
git add .
git commit -m "feat: implementar CI/CD completo

- Adicionar workflows GitHub Actions
- Configurar testes automatizados  
- Implementar qualidade de código
- Configurar builds Docker otimizados"

git push origin main
```

---

## 💡 **Dicas Avançadas**

### **1. Cache local para velocidade:**
```bash
# Backend - usar cache do pip
export PIP_CACHE_DIR=~/.cache/pip

# Frontend - usar cache do npm
npm config set cache ~/.npm-cache
```

### **2. Paralelização de testes:**
```bash
# Backend - testes paralelos
pytest -n auto

# Frontend - builds paralelos
npm run build -- --parallel
```

### **3. Profile de performance:**
```bash
# Tempo de build
time docker build ./backend
time npm run build

# Uso de memória durante testes
/usr/bin/time -v pytest
```

### **4. Integração com IDEs:**
```bash
# VS Code - configurar tasks.json
{
  "label": "Test CI Local",
  "type": "shell", 
  "command": "./scripts/test-ci-local.sh"
}
```

---

**🎉 Com estes testes locais, você terá 95% de confiança que o CI/CD no GitHub funcionará perfeitamente!** 