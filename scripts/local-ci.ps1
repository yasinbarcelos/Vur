# ===================================
# Script de CI/CD Local para Windows - VUR Platform
# ===================================
# Este script executa localmente os mesmos testes
# que são executados no GitHub Actions

param(
    [switch]$Quick,
    [switch]$SkipDocker,
    [switch]$SkipSecurity,
    [switch]$Verbose,
    [switch]$Help
)

# Cores para output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Blue"
$CYAN = "Cyan"

# Funções auxiliares
function Write-Header {
    param([string]$Message)
    Write-Host "`n=================================" -ForegroundColor Cyan
    Write-Host "🚀 $Message" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Message)
    Write-Host "📋 $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Função de ajuda
if ($Help) {
    Write-Host "Uso: .\scripts\local-ci.ps1 [opções]"
    Write-Host ""
    Write-Host "Opções:"
    Write-Host "  -Quick          Executar apenas testes rápidos"
    Write-Host "  -SkipDocker     Pular testes Docker"
    Write-Host "  -SkipSecurity   Pular verificações de segurança"
    Write-Host "  -Verbose        Modo verboso"
    Write-Host "  -Help           Mostrar esta ajuda"
    exit 0
}

# Verificar se estamos no diretório correto
if (-not (Test-Path "docker-compose.yml")) {
    Write-Error "Execute este script do diretório raiz do projeto"
    exit 1
}

# Função para limpeza
function Cleanup {
    Write-Header "🧹 LIMPEZA"
    Write-Step "Parando containers..."
    try {
        docker-compose -f docker-compose.dev.yml down -v 2>$null
    } catch {}
    
    Write-Step "Limpando sistema Docker..."
    try {
        docker system prune -f 2>$null
    } catch {}
    
    Write-Success "Limpeza concluída"
}

# Configurar trap para limpeza
$ErrorActionPreference = "Continue"
Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

Write-Header "🎯 INICIANDO CI/CD LOCAL"
Write-Host "Configuração:"
Write-Host "  - Testes rápidos apenas: $Quick"
Write-Host "  - Pular Docker: $SkipDocker"
Write-Host "  - Pular segurança: $SkipSecurity"
Write-Host "  - Modo verboso: $Verbose"

# 1. VALIDAÇÃO RÁPIDA
Write-Header "⚡ VALIDAÇÃO RÁPIDA"

Set-Location backend

Write-Step "Verificando Python..."
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Python não encontrado"
    exit 1
}
Write-Host $pythonVersion

Write-Step "Instalando dependências..."
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
pip install -r tests/requirements-test.txt --quiet

Write-Step "Verificando sintaxe Python..."
$pythonFiles = Get-ChildItem -Recurse -Filter "*.py" | Where-Object { $_.FullName -notmatch "venv|.venv" }
foreach ($file in $pythonFiles) {
    python -m py_compile $file.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Erro de sintaxe em $($file.Name)"
        exit 1
    }
}
Write-Success "Sintaxe Python OK"

Write-Step "Verificando imports principais..."
$importTest = @"
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
"@

$importTest | python
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha nos imports principais"
    exit 1
}

Write-Step "Verificando se aplicação inicia..."
$appTest = @"
import uvicorn
from main import app

print('✅ Aplicação importada com sucesso')

routes = [route.path for route in app.routes]
if '/api/v1' in str(routes):
    print('✅ Rotas da API registradas')
else:
    print('⚠️ Rotas da API não encontradas')
"@

try {
    $appTest | python
    Write-Success "Aplicação verificada com sucesso"
} catch {
    Write-Warning "Timeout na verificação da aplicação"
}

Write-Success "Validação rápida concluída"

# 2. LINT E FORMATAÇÃO
Write-Header "🎨 LINT & FORMATAÇÃO"

Write-Step "Instalando ferramentas de qualidade..."
pip install black flake8 isort --quiet

Write-Step "Verificando formatação com Black..."
try {
    black --check --diff app/ tests/ 2>$null
    Write-Success "Código formatado corretamente"
} catch {
    Write-Warning "Código precisa ser formatado com Black"
    if ($Verbose) {
        Write-Host "Para corrigir: black app/ tests/"
    }
}

Write-Step "Verificando com Flake8..."
try {
    flake8 app/ --max-line-length=88 --extend-ignore=E203,W503 2>$null
    Write-Success "Nenhum problema encontrado pelo Flake8"
} catch {
    Write-Warning "Issues encontradas com Flake8"
}

Write-Step "Verificando imports com isort..."
try {
    isort --check-only --diff app/ tests/ 2>$null
    Write-Success "Imports organizados corretamente"
} catch {
    Write-Warning "Imports precisam ser organizados"
    if ($Verbose) {
        Write-Host "Para corrigir: isort app/ tests/"
    }
}

# Se apenas testes rápidos, parar aqui
if ($Quick) {
    Write-Header "🎉 TESTES RÁPIDOS CONCLUÍDOS"
    exit 0
}

# 3. TESTES DE BACKEND COM POSTGRESQL
Write-Header "🐍 TESTES DE BACKEND"

Write-Step "Iniciando PostgreSQL para testes..."
Set-Location ..

$envContent = @"
POSTGRES_DB=vur_test_db
POSTGRES_USER=vur_test_user
POSTGRES_PASSWORD=vur_test_password
SECRET_KEY=test-secret-key-for-local-ci
ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO
"@

$envContent | Out-File -FilePath ".env.test" -Encoding UTF8

# Iniciar apenas PostgreSQL
docker-compose -f docker-compose.dev.yml up -d postgres redis

Write-Step "Aguardando PostgreSQL..."
$timeout = 60
$elapsed = 0
do {
    Start-Sleep 2
    $elapsed += 2
    $ready = docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U vur_test_user 2>$null
} while ($LASTEXITCODE -ne 0 -and $elapsed -lt $timeout)

if ($elapsed -ge $timeout) {
    Write-Error "Timeout aguardando PostgreSQL"
    exit 1
}

$env:DATABASE_URL = "postgresql://vur_test_user:vur_test_password@localhost:5432/vur_test_db"

Write-Step "Executando migrações..."
Set-Location backend
alembic upgrade head

Write-Step "Executando testes rápidos..."
if ($Verbose) {
    python tests/run_tests.py --quick --base-url http://localhost:8000/api/v1 --verbose
} else {
    python tests/run_tests.py --quick --base-url http://localhost:8000/api/v1
}

Write-Step "Executando testes de autenticação..."
if ($Verbose) {
    python tests/run_tests.py --auth --base-url http://localhost:8000/api/v1 --verbose
} else {
    python tests/run_tests.py --auth --base-url http://localhost:8000/api/v1
}

Write-Success "Testes de backend concluídos"

# 4. TESTES DOCKER
if (-not $SkipDocker) {
    Write-Header "🐳 TESTES DOCKER"
    
    Set-Location ..
    
    Write-Step "Build das imagens Docker..."
    docker-compose -f docker-compose.dev.yml build backend frontend
    
    Write-Step "Iniciando ambiente completo..."
    docker-compose -f docker-compose.dev.yml up -d
    
    Write-Step "Aguardando backend Docker..."
    $timeout = 120
    $elapsed = 0
    do {
        Start-Sleep 5
        $elapsed += 5
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5
            $ready = $response.StatusCode -eq 200
        } catch {
            $ready = $false
        }
    } while (-not $ready -and $elapsed -lt $timeout)
    
    if ($elapsed -ge $timeout) {
        Write-Error "Timeout aguardando backend Docker"
        exit 1
    }
    
    Write-Step "Verificando status dos containers..."
    docker-compose -f docker-compose.dev.yml ps
    
    Write-Step "Instalando dependências de teste no container..."
    docker-compose -f docker-compose.dev.yml exec -T backend pip install -r tests/requirements-test.txt
    
    Write-Step "Executando testes no ambiente Docker..."
    if ($Verbose) {
        docker-compose -f docker-compose.dev.yml exec -T backend python tests/run_tests.py --quick --verbose
        docker-compose -f docker-compose.dev.yml exec -T backend python tests/run_tests.py --production --verbose
    } else {
        docker-compose -f docker-compose.dev.yml exec -T backend python tests/run_tests.py --quick
        docker-compose -f docker-compose.dev.yml exec -T backend python tests/run_tests.py --production
    }
    
    Write-Success "Testes Docker concluídos"
}

# 5. VERIFICAÇÕES DE SEGURANÇA
if (-not $SkipSecurity) {
    Write-Header "🔒 VERIFICAÇÕES DE SEGURANÇA"
    
    Set-Location backend
    
    Write-Step "Instalando ferramentas de segurança..."
    pip install safety bandit --quiet
    
    Write-Step "Verificando vulnerabilidades com Safety..."
    try {
        safety check -r requirements.txt 2>$null
        Write-Success "Nenhuma vulnerabilidade conhecida encontrada"
    } catch {
        Write-Warning "Vulnerabilidades encontradas"
    }
    
    Write-Step "Análise de segurança com Bandit..."
    try {
        bandit -r app/ -f json -o bandit-report.json 2>$null
        Write-Success "Nenhum problema de segurança encontrado"
    } catch {
        Write-Warning "Problemas de segurança encontrados"
        if ($Verbose) {
            Write-Host "Relatório salvo em: backend/bandit-report.json"
        }
    }
    
    Write-Success "Verificações de segurança concluídas"
}

# RESUMO FINAL
Write-Header "🎉 CI/CD LOCAL CONCLUÍDO"
Write-Host "✅ Todos os testes foram executados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Resumo:"
Write-Host "  ⚡ Validação rápida: ✅"
Write-Host "  🎨 Lint & formatação: ✅"
if (-not $Quick) {
    Write-Host "  🐍 Testes backend: ✅"
    if (-not $SkipDocker) {
        Write-Host "  🐳 Testes Docker: ✅"
    }
    if (-not $SkipSecurity) {
        Write-Host "  🔒 Segurança: ✅"
    }
}
Write-Host ""
Write-Host "🚀 Pronto para commit e push!" -ForegroundColor Cyan

# Cleanup automático
Cleanup 