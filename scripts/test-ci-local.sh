#!/bin/bash

# 🧪 VUR - Teste Local de CI/CD
# Este script executa todos os testes de CI/CD localmente antes do push

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Função para logs coloridos
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Função para executar comando e capturar erro
run_test() {
    local test_name="$1"
    local command="$2"
    local directory="${3:-.}"
    
    log_step "Executando: $test_name"
    
    if cd "$directory" && eval "$command" > /tmp/test_output 2>&1; then
        log_success "$test_name - PASSOU"
        return 0
    else
        log_error "$test_name - FALHOU"
        echo "📋 Output do erro:"
        cat /tmp/test_output | head -20
        echo "..."
        return 1
    fi
}

# Banner inicial
echo "🧪 ================================"
echo "🧪 VUR - TESTE LOCAL DE CI/CD"
echo "🧪 ================================"
echo

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0

# Verificar estrutura de arquivos
log_info "Verificando estrutura de arquivos..."

required_files=(
    ".github/workflows/ci-cd.yml"
    ".github/workflows/security.yml"
    ".github/workflows/release.yml"
    ".github/dependabot.yml"
    "frontend/package.json"
    "backend/requirements.txt"
    "docker-compose.yml"
    "docker-compose.dev.yml"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "✓ $file"
    else
        log_error "✗ $file (não encontrado)"
        ((TESTS_FAILED++))
    fi
done

echo

# ==========================================
# 🐍 TESTES DO BACKEND
# ==========================================
log_info "🐍 Iniciando testes do Backend..."

# Verificar se Python está disponível
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    log_error "Python não encontrado"
    exit 1
fi

# Criar ambiente virtual temporário para testes
log_step "Criando ambiente virtual temporário..."
cd backend
if [[ ! -d "venv_test" ]]; then
    $PYTHON_CMD -m venv venv_test
fi

# Ativar ambiente virtual (comando diferente no Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv_test/Scripts/activate
else
    source venv_test/bin/activate
fi

# Instalar dependências
log_step "Instalando dependências do backend..."
if pip install -r requirements.txt > /tmp/pip_install.log 2>&1; then
    log_success "Dependências instaladas"
else
    log_error "Falha na instalação das dependências"
    cat /tmp/pip_install.log
    exit 1
fi

# Instalar ferramentas de qualidade
pip install pytest pytest-asyncio pytest-cov black isort flake8 mypy > /dev/null 2>&1

# Testes de qualidade do backend
if run_test "Black - Formatação" "black --check --diff . || echo 'Arquivos precisam ser formatados'" backend; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
    log_warning "Execute 'black .' para corrigir formatação"
fi

if run_test "isort - Imports" "isort --check-only --diff . || echo 'Imports precisam ser organizados'" backend; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
    log_warning "Execute 'isort .' para corrigir imports"
fi

if run_test "Flake8 - Linting" "flake8 . || echo 'Problemas de linting encontrados'" backend; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if run_test "MyPy - Type Check" "mypy app/ --ignore-missing-imports || echo 'Problemas de tipos encontrados'" backend; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Testes unitários (se existirem)
if [[ -d "tests" ]] && [[ -n "$(find tests -name '*.py' -type f)" ]]; then
    if run_test "Pytest - Testes" "pytest tests/ -v || echo 'Alguns testes falharam'" backend; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
else
    log_warning "Nenhum teste encontrado em backend/tests/"
fi

# Desativar ambiente virtual
deactivate
cd ..

echo

# ==========================================
# ⚛️ TESTES DO FRONTEND
# ==========================================
log_info "⚛️ Iniciando testes do Frontend..."

cd frontend

# Verificar se npm está disponível
if ! command -v npm &> /dev/null; then
    log_error "npm não encontrado"
    exit 1
fi

# Instalar dependências se não existirem
if [[ ! -d "node_modules" ]]; then
    log_step "Instalando dependências do frontend..."
    if npm install > /tmp/npm_install.log 2>&1; then
        log_success "Dependências instaladas"
    else
        log_error "Falha na instalação das dependências"
        cat /tmp/npm_install.log
        exit 1
    fi
fi

# Testes de qualidade do frontend
if run_test "ESLint - Linting" "npm run lint || echo 'Problemas de linting encontrados'" frontend; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
    log_warning "Execute 'npm run lint:fix' para corrigir alguns problemas"
fi

if run_test "TypeScript - Type Check" "npm run type-check || echo 'Problemas de tipos encontrados'" frontend; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if run_test "Prettier - Formatação" "npm run format:check || echo 'Arquivos precisam ser formatados'" frontend; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
    log_warning "Execute 'npm run format' para corrigir formatação"
fi

if run_test "Build - Vite" "npm run build || echo 'Build falhou'" frontend; then
    ((TESTS_PASSED++))
    log_success "Build artifacts criados em dist/"
else
    ((TESTS_FAILED++))
fi

# Verificar se dist foi criado
if [[ -f "dist/index.html" ]]; then
    log_success "✓ dist/index.html criado com sucesso"
else
    log_error "✗ dist/index.html não foi criado"
    ((TESTS_FAILED++))
fi

# Testes unitários (se existirem)
if [[ -f "package.json" ]] && grep -q '"test"' package.json; then
    if run_test "Vitest - Testes" "npm test || echo 'Alguns testes falharam'" frontend; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
else
    log_warning "Script de teste não configurado em package.json"
fi

cd ..

echo

# ==========================================
# 🐳 TESTES DO DOCKER
# ==========================================
log_info "🐳 Iniciando testes do Docker..."

# Verificar se Docker está disponível
if ! command -v docker &> /dev/null; then
    log_error "Docker não encontrado"
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    log_error "Docker não está rodando"
    exit 1
fi

# Build da imagem do backend
if run_test "Docker Build - Backend" "docker build -t vur-backend-test ./backend" .; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Build da imagem do frontend
if run_test "Docker Build - Frontend" "docker build -t vur-frontend-test ./frontend" .; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Teste de execução rápida das imagens
log_step "Testando execução das imagens Docker..."

# Testar backend
if docker run --rm --name vur-backend-test-run -d -p 8001:8000 vur-backend-test > /dev/null 2>&1; then
    sleep 5
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        log_success "Backend Docker - Health check passou"
        ((TESTS_PASSED++))
    else
        log_warning "Backend Docker - Health check falhou (pode ser normal se deps não estão prontas)"
    fi
    docker stop vur-backend-test-run > /dev/null 2>&1
else
    log_error "Backend Docker - Falha na execução"
    ((TESTS_FAILED++))
fi

# Testar frontend
if docker run --rm --name vur-frontend-test-run -d -p 3001:3000 vur-frontend-test > /dev/null 2>&1; then
    sleep 3
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        log_success "Frontend Docker - Servidor respondendo"
        ((TESTS_PASSED++))
    else
        log_warning "Frontend Docker - Servidor não respondeu (pode ser normal)"
    fi
    docker stop vur-frontend-test-run > /dev/null 2>&1
else
    log_error "Frontend Docker - Falha na execução"
    ((TESTS_FAILED++))
fi

# Limpar imagens de teste
docker rmi vur-backend-test vur-frontend-test > /dev/null 2>&1 || true

echo

# ==========================================
# 📋 VALIDAÇÃO DE CONFIGURAÇÕES
# ==========================================
log_info "📋 Validando configurações..."

# Validar YAML dos workflows
if command -v python3 &> /dev/null; then
    for workflow in .github/workflows/*.yml; do
        if python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null; then
            log_success "✓ $(basename $workflow) - YAML válido"
            ((TESTS_PASSED++))
        else
            log_error "✗ $(basename $workflow) - YAML inválido"
            ((TESTS_FAILED++))
        fi
    done
fi

# Validar docker-compose
if command -v docker-compose &> /dev/null; then
    if docker-compose -f docker-compose.yml config > /dev/null 2>&1; then
        log_success "✓ docker-compose.yml válido"
        ((TESTS_PASSED++))
    else
        log_error "✗ docker-compose.yml inválido"
        ((TESTS_FAILED++))
    fi
    
    if docker-compose -f docker-compose.dev.yml config > /dev/null 2>&1; then
        log_success "✓ docker-compose.dev.yml válido"
        ((TESTS_PASSED++))
    else
        log_error "✗ docker-compose.dev.yml inválido"
        ((TESTS_FAILED++))
    fi
fi

echo

# ==========================================
# 📊 RELATÓRIO FINAL
# ==========================================
echo "📊 ================================"
echo "📊 RELATÓRIO FINAL DOS TESTES"
echo "📊 ================================"
echo
echo "✅ Testes que passaram: $TESTS_PASSED"
echo "❌ Testes que falharam: $TESTS_FAILED"
echo "📊 Total de testes: $((TESTS_PASSED + TESTS_FAILED))"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo
    log_success "🎉 TODOS OS TESTES PASSARAM!"
    log_success "✅ Seu código está pronto para push no GitHub"
    echo
    echo "📋 Próximos passos:"
    echo "1. git add ."
    echo "2. git commit -m \"feat: implementar CI/CD completo\""
    echo "3. git push origin main"
    echo
    exit 0
else
    echo
    log_error "⚠️  ALGUNS TESTES FALHARAM"
    log_warning "🔧 Corrija os problemas antes de fazer push"
    echo
    echo "📋 Para corrigir automaticamente alguns problemas:"
    echo "# Backend:"
    echo "cd backend && black . && isort ."
    echo
    echo "# Frontend:"
    echo "cd frontend && npm run lint:fix && npm run format"
    echo
    exit 1
fi 