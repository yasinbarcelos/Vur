# 🚀 Guia de CI/CD - Projeto VUR

## 📋 Visão Geral

Esta documentação descreve a estratégia completa de **CI/CD (Continuous Integration/Continuous Deployment)** implementada para o projeto **VUR** - plataforma de previsão de séries temporais.

## 🏗️ Arquitetura da Pipeline

### **🔄 Workflows Principais**

1. **`ci-cd.yml`** - Pipeline principal de CI/CD
2. **`security.yml`** - Análise de segurança e vulnerabilidades
3. **`release.yml`** - Processo de release automatizado

### **🎯 Estratégias Implementadas**

- ✅ **Detecção inteligente de mudanças** (evita builds desnecessários)
- ✅ **Pipelines paralelos** para frontend e backend
- ✅ **Multi-stage Docker builds** otimizados
- ✅ **Testes automatizados** com cobertura de código
- ✅ **Análise de qualidade** (linting, formatação, type checking)
- ✅ **Scans de segurança** automáticos
- ✅ **Release automático** com semantic versioning
- ✅ **Dependabot** para atualizações automáticas

---

## 🔄 Pipeline Principal (ci-cd.yml)

### **1. 🔍 Detecção de Mudanças**

```yaml
# Executa apenas os jobs necessários baseado nos arquivos alterados
changes:
  - backend/**     → Executa pipeline do backend
  - frontend/**    → Executa pipeline do frontend
  - docker-compose → Executa ambos
```

**Benefícios:**
- ⚡ **Execução mais rápida** (evita builds desnecessários)
- 💰 **Economia de recursos** GitHub Actions
- 🎯 **Feedback mais focado**

### **2. 🐍 Pipeline do Backend**

#### **Serviços de Teste:**
- **PostgreSQL 15** para testes de integração
- **Redis 7** para testes de cache

#### **Verificações de Qualidade:**
```bash
# Formatação de código
black --check --diff .

# Organização de imports
isort --check-only --diff .

# Linting
flake8 .

# Type checking
mypy app/ --ignore-missing-imports

# Testes com cobertura
pytest --cov=app --cov-report=xml
```

#### **Métricas Monitoradas:**
- ✅ Cobertura de testes (mínimo recomendado: 80%)
- ✅ Conformidade de código (Black, isort, Flake8)
- ✅ Type safety (MyPy)
- ✅ Testes de integração com banco de dados

### **3. ⚛️ Pipeline do Frontend**

#### **Verificações de Qualidade:**
```bash
# Linting ESLint
npm run lint

# Type checking TypeScript
npx tsc --noEmit

# Build de produção
npm run build

# Verificação de artefatos
test -f dist/index.html
```

#### **Ferramentas de Qualidade:**
- ✅ **ESLint** - Análise de código JavaScript/TypeScript
- ✅ **Prettier** - Formatação automática
- ✅ **TypeScript** - Type checking
- ✅ **Vite** - Build otimizado

### **4. 🏗️ Build de Imagens Docker**

#### **Estratégia de Tags:**
```yaml
# Para branch main
latest, stable, main-{sha}

# Para branch develop  
develop, develop-{sha}

# Para releases
v1.2.3, latest, stable
```

#### **Otimizações:**
- ✅ **Multi-stage builds** (redução de 60-80% no tamanho)
- ✅ **Cache de layers** do GitHub Actions
- ✅ **Registro GHCR** (GitHub Container Registry)

---

## 🔐 Pipeline de Segurança (security.yml)

### **1. 🔍 Scan de Dependências**

#### **Backend Python:**
```bash
# Usando pip-audit
pip-audit --format sarif backend/requirements.txt
```

#### **Frontend NPM:**
```bash
# Audit nativo do NPM
npm audit --audit-level=moderate
```

### **2. 🔐 Análise de Código (CodeQL)**

- **Linguagens:** Python, JavaScript/TypeScript
- **Detecção:** Vulnerabilidades de segurança, bad practices
- **Integração:** GitHub Security tab

### **3. 🐳 Scan de Imagens Docker**

```bash
# Usando Trivy
trivy image vur-backend:test --format sarif
trivy image vur-frontend:test --format sarif
```

**Vulnerabilidades Detectadas:**
- ✅ CVEs conhecidos
- ✅ Configurações inseguras
- ✅ Secrets expostos
- ✅ Dependências vulneráveis

---

## 🚀 Pipeline de Release (release.yml)

### **1. 📋 Preparação do Release**

#### **Triggers:**
- **Tags:** `v*.*.*` (ex: v1.2.3)
- **Manual:** Workflow dispatch com versão

#### **Geração Automática:**
- ✅ **Changelog** baseado em commits
- ✅ **Release notes** automáticas
- ✅ **Versionamento** semântico

### **2. 🧪 Testes de Release**

```bash
# Deploy temporário para testes
docker-compose -f docker-compose.test.yml up -d

# Verificação de endpoints
curl -f http://localhost:8000/health
curl -f http://localhost:3000

# Cleanup automático
docker-compose -f docker-compose.test.yml down
```

### **3. 📦 Criação do Release**

- ✅ **GitHub Release** automático
- ✅ **Docker images** taggeadas
- ✅ **Changelog** incluído
- ✅ **Assets** anexados

---

## 🤖 Dependabot Configuration

### **Configuração Automática:**

```yaml
# Atualizações semanais às segundas-feiras
schedule:
  interval: "weekly"
  day: "monday" 
  time: "09:00"

# Componentes monitorados:
- Python dependencies (pip)
- NPM dependencies (npm)
- Docker base images
- GitHub Actions
```

### **Estratégia de Review:**
- ✅ **Auto-merge** para patches de segurança
- ⚠️ **Review manual** para major versions
- 🔍 **Testes automáticos** antes do merge

---

## 📊 Ambientes e Deploy

### **🔀 Estratégia de Branches:**

```
main (produção)
├── develop (staging)
├── feature/* (desenvolvimento)
└── hotfix/* (correções urgentes)
```

### **🌍 Ambientes:**

| Ambiente | Branch | Trigger | URL |
|----------|--------|---------|-----|
| **Development** | `feature/*` | Commit | Local/PR |
| **Staging** | `develop` | Push | staging.vur.com |
| **Production** | `main` | Release | vur.com |

### **🚀 Deploy Automático:**

#### **Staging (develop):**
- ✅ Deploy automático após CI passar
- ✅ Banco de dados de staging
- ✅ Monitoramento básico

#### **Production (main):**
- ✅ Deploy após aprovação manual
- ✅ Rollback automático em caso de falha
- ✅ Monitoramento completo

---

## 🔧 Como Usar

### **1. 🚀 Primeiro Deploy**

```bash
# 1. Fazer fork/clone do repositório
git clone https://github.com/your-org/vur.git

# 2. Configurar secrets no GitHub
GITHUB_TOKEN (automático)
DEPLOY_TOKEN (seu token de deploy)

# 3. Fazer primeiro push
git push origin main
```

### **2. 🔄 Desenvolvimento**

```bash
# 1. Criar feature branch
git checkout -b feature/nova-funcionalidade

# 2. Fazer alterações e commit
git add .
git commit -m "feat: adicionar nova funcionalidade"

# 3. Push irá triggerar CI
git push origin feature/nova-funcionalidade

# 4. Criar Pull Request
gh pr create --title "Nova funcionalidade"
```

### **3. 📦 Criar Release**

```bash
# Opção 1: Via tag
git tag v1.2.3
git push origin v1.2.3

# Opção 2: Via GitHub Actions (manual)
# Ir em Actions > Release & Deployment > Run workflow
```

---

## 📈 Métricas e Monitoramento

### **🎯 KPIs Monitorados:**

| Métrica | Meta | Ferramenta |
|---------|------|-----------|
| **Build time** | < 10 min | GitHub Actions |
| **Test coverage** | > 80% | Codecov |
| **Security score** | 0 critical | GitHub Security |
| **Deploy frequency** | Daily | GitHub Insights |
| **Lead time** | < 2 hours | GitHub Actions |

### **📊 Dashboards:**

- ✅ **GitHub Actions** - Status dos workflows
- ✅ **GitHub Security** - Vulnerabilidades
- ✅ **Codecov** - Cobertura de testes
- ✅ **Dependencies** - Status do Dependabot

---

## 🛠️ Troubleshooting

### **❌ Problemas Comuns:**

#### **1. Build Falhando:**
```bash
# Verificar logs específicos
gh run list --workflow=ci-cd.yml
gh run view [RUN_ID] --log
```

#### **2. Testes Falhando:**
```bash
# Rodar localmente
cd backend && pytest -v
cd frontend && npm test
```

#### **3. Docker Build Lento:**
```bash
# Verificar cache
docker system df
docker builder prune
```

### **🔧 Debug Local:**

```bash
# Simular CI localmente
act -j backend-test  # Usando act
act -j frontend-test
```

---

## 🚀 Próximos Passos

### **🎯 Melhorias Futuras:**

- [ ] **E2E Testing** com Playwright
- [ ] **Performance Testing** com k6
- [ ] **Smoke Tests** em produção
- [ ] **Blue-Green Deployment**
- [ ] **A/B Testing** infrastructure
- [ ] **Multi-region deployment**

### **🔄 Otimizações:**

- [ ] **Parallel testing** para reduzir tempo
- [ ] **Cache warming** para dependências
- [ ] **Matrix builds** para múltiplas versões
- [ ] **Conditional deployments** baseado em mudanças

---

## 📚 Recursos Adicionais

### **📖 Documentação:**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### **🛠️ Ferramentas:**
- [act](https://github.com/nektos/act) - Run GitHub Actions locally
- [gh](https://cli.github.com/) - GitHub CLI
- [Codecov](https://codecov.io/) - Code coverage
- [Dependabot](https://github.com/dependabot) - Dependency updates

---

## 💡 Contribuição

Para melhorar esta pipeline de CI/CD:

1. 🍴 **Fork** este repositório
2. 🌿 **Crie** uma feature branch
3. 💻 **Implemente** suas melhorias
4. ✅ **Teste** localmente
5. 📤 **Envie** um Pull Request

**Contato:** team@vur.com

---

*Documentação atualizada em: $(date)*
*Versão da pipeline: v1.0.0* 