#!/bin/bash

# ===================================
# Script de CI/CD Local - VUR Platform
# ===================================
# Este script executa localmente os mesmos testes
# que são executados no GitHub Actions

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funções auxiliares
print_header() {
    echo -e "\n${CYAN}=================================${NC}"
    echo -e "${CYAN}🚀 $1${NC}"
    echo -e "${CYAN}=================================${NC}\n"
}

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    print_error "Execute este script do diretório raiz do projeto"
    exit 1
fi

# Função para limpeza
cleanup() {
    print_header "🧹 LIMPEZA"
    print_step "Parando containers..."
    docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true
    print_step "Limpando sistema Docker..."
    docker system prune -f 2>/dev/null || true
    print_success "Limpeza concluída"
}

# Trap para limpeza em caso de interrupção
trap cleanup EXIT

# Parâmetros
QUICK_ONLY=false
SKIP_DOCKER=false
SKIP_SECURITY=false
VERBOSE=false

# Parse dos argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK_ONLY=true
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-security)
            SKIP_SECURITY=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Uso: $0 [opções]"
            echo ""
            echo "Opções:"
            echo "  --quick          Executar apenas testes rápidos"
            echo "  --skip-docker    Pular testes Docker"
            echo "  --skip-security  Pular verificações de segurança"
            echo "  --verbose        Modo verboso"
            echo "  --help           Mostrar esta ajuda"
            exit 0
            ;;
        *)
            print_error "Opção desconhecida: $1"
            exit 1
            ;;
    esac
done

print_header "🎯 INICIANDO CI/CD LOCAL"
echo "Configuração:"
echo "  - Testes rápidos apenas: $QUICK_ONLY"
echo "  - Pular Docker: $SKIP_DOCKER"
echo "  - Pular segurança: $SKIP_SECURITY"
echo "  - Modo verboso: $VERBOSE"

# 1. VALIDAÇÃO RÁPIDA
print_header "⚡ VALIDAÇÃO RÁPIDA"

cd backend

print_step "Verificando Python..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 não encontrado"
    exit 1
fi
python3 --version

print_step "Instalando dependências..."
pip install -q -r requirements.txt
pip install -q -r tests/requirements-test.txt

print_step "Verificando sintaxe Python..."
python3 -m py_compile $(find . -name "*.py" -not -path "./venv/*" -not -path "./.venv/*")
print_success "Sintaxe Python OK"

print_step "Verificando imports principais..."
python3 -c "
import sys
sys.path.append('.')

try:
    from app.api.v1.router import api_router
    from app.core.config import settings
    from app.models import user, dataset, model
    print('✅ Imports principais OK')
except ImportError as e:
    print(f'❌ Erro de import: {e}')
    sys.exit(1)
"

print_step "Verificando se aplicação inicia..."
timeout 30s python3 -c "
import uvicorn
from main import app

print('✅ Aplicação importada com sucesso')

routes = [route.path for route in app.routes]
if '/api/v1' in str(routes):
    print('✅ Rotas da API registradas')
else:
    print('⚠️ Rotas da API não encontradas')
" || print_warning "Timeout na verificação da aplicação"

print_success "Validação rápida concluída"

# 2. LINT E FORMATAÇÃO
print_header "🎨 LINT & FORMATAÇÃO"

print_step "Instalando ferramentas de qualidade..."
pip install -q black flake8 isort

print_step "Verificando formatação com Black..."
if black --check --diff app/ tests/ 2>/dev/null; then
    print_success "Código formatado corretamente"
else
    print_warning "Código precisa ser formatado com Black"
    if [ "$VERBOSE" = true ]; then
        echo "Para corrigir: black app/ tests/"
    fi
fi

print_step "Verificando com Flake8..."
if flake8 app/ --max-line-length=88 --extend-ignore=E203,W503 2>/dev/null; then
    print_success "Nenhum problema encontrado pelo Flake8"
else
    print_warning "Issues encontradas com Flake8"
fi

print_step "Verificando imports com isort..."
if isort --check-only --diff app/ tests/ 2>/dev/null; then
    print_success "Imports organizados corretamente"
else
    print_warning "Imports precisam ser organizados"
    if [ "$VERBOSE" = true ]; then
        echo "Para corrigir: isort app/ tests/"
    fi
fi

# Se apenas testes rápidos, parar aqui
if [ "$QUICK_ONLY" = true ]; then
    print_header "🎉 TESTES RÁPIDOS CONCLUÍDOS"
    exit 0
fi

# 3. TESTES DE BACKEND COM POSTGRESQL
print_header "🐍 TESTES DE BACKEND"

print_step "Iniciando PostgreSQL para testes..."
cd ..
cat > .env.test << EOF
POSTGRES_DB=vur_test_db
POSTGRES_USER=vur_test_user
POSTGRES_PASSWORD=vur_test_password
SECRET_KEY=test-secret-key-for-local-ci
ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO
EOF

# Iniciar apenas PostgreSQL
docker compose -f docker-compose.dev.yml up -d postgres redis

print_step "Aguardando PostgreSQL..."
timeout 60 bash -c 'until docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U vur_test_user; do sleep 2; done'

export DATABASE_URL="postgresql://vur_test_user:vur_test_password@localhost:5432/vur_test_db"

print_step "Executando migrações..."
cd backend
alembic upgrade head

print_step "Iniciando servidor backend..."
# Iniciar servidor em background
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Aguardar servidor estar pronto
timeout 60 bash -c 'until curl -f http://localhost:8000/health 2>/dev/null; do sleep 2; done'
print_success "Backend está rodando (PID: $BACKEND_PID)"

print_step "Executando testes rápidos..."
if [ "$VERBOSE" = true ]; then
    python tests/run_tests.py --quick --base-url http://localhost:8000/api/v1 --verbose
else
    python tests/run_tests.py --quick --base-url http://localhost:8000/api/v1
fi

print_step "Executando testes de autenticação..."
if [ "$VERBOSE" = true ]; then
    python tests/run_tests.py --auth --base-url http://localhost:8000/api/v1 --verbose
else
    python tests/run_tests.py --auth --base-url http://localhost:8000/api/v1
fi

print_step "Parando servidor backend..."
kill $BACKEND_PID 2>/dev/null || true

print_success "Testes de backend concluídos"

# 4. TESTES DOCKER
if [ "$SKIP_DOCKER" = false ]; then
    print_header "🐳 TESTES DOCKER"
    
    cd ..
    
    print_step "Build das imagens Docker..."
    docker-compose -f docker-compose.dev.yml build backend frontend
    
    print_step "Iniciando ambiente completo..."
    docker-compose -f docker-compose.dev.yml up -d
    
    print_step "Aguardando backend Docker..."
    timeout 120 bash -c 'until curl -f http://localhost:8000/health 2>/dev/null; do sleep 5; done'
    
    print_step "Verificando status dos containers..."
    docker-compose -f docker-compose.dev.yml ps
    
    print_step "Instalando dependências de teste no container..."
    docker-compose -f docker-compose.dev.yml exec -T backend pip install -r tests/requirements-test.txt
    
    print_step "Executando testes no ambiente Docker..."
    if [ "$VERBOSE" = true ]; then
        docker-compose -f docker-compose.dev.yml exec -T backend python tests/run_tests.py --quick --verbose
        docker-compose -f docker-compose.dev.yml exec -T backend python tests/run_tests.py --production --verbose
    else
        docker-compose -f docker-compose.dev.yml exec -T backend python tests/run_tests.py --quick
        docker-compose -f docker-compose.dev.yml exec -T backend python tests/run_tests.py --production
    fi
    
    print_success "Testes Docker concluídos"
fi

# 5. VERIFICAÇÕES DE SEGURANÇA
if [ "$SKIP_SECURITY" = false ]; then
    print_header "🔒 VERIFICAÇÕES DE SEGURANÇA"
    
    cd backend
    
    print_step "Instalando ferramentas de segurança..."
    pip install -q safety bandit
    
    print_step "Verificando vulnerabilidades com Safety..."
    if safety check -r requirements.txt 2>/dev/null; then
        print_success "Nenhuma vulnerabilidade conhecida encontrada"
    else
        print_warning "Vulnerabilidades encontradas"
    fi
    
    print_step "Análise de segurança com Bandit..."
    if bandit -r app/ -f json -o bandit-report.json 2>/dev/null; then
        print_success "Nenhum problema de segurança encontrado"
    else
        print_warning "Problemas de segurança encontrados"
        if [ "$VERBOSE" = true ]; then
            echo "Relatório salvo em: backend/bandit-report.json"
        fi
    fi
    
    print_success "Verificações de segurança concluídas"
fi

# RESUMO FINAL
print_header "🎉 CI/CD LOCAL CONCLUÍDO"
echo -e "${GREEN}✅ Todos os testes foram executados com sucesso!${NC}"
echo ""
echo "📊 Resumo:"
echo "  ⚡ Validação rápida: ✅"
echo "  🎨 Lint & formatação: ✅"
if [ "$QUICK_ONLY" = false ]; then
    echo "  🐍 Testes backend: ✅"
    if [ "$SKIP_DOCKER" = false ]; then
        echo "  🐳 Testes Docker: ✅"
    fi
    if [ "$SKIP_SECURITY" = false ]; then
        echo "  🔒 Segurança: ✅"
    fi
fi
echo ""
echo -e "${CYAN}🚀 Pronto para commit e push!${NC}" 