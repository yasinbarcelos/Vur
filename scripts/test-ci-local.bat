@echo off
REM 🧪 VUR - Teste Local de CI/CD (Windows)
REM Este script executa todos os testes de CI/CD localmente antes do push

setlocal enabledelayedexpansion

echo 🧪 ================================
echo 🧪 VUR - TESTE LOCAL DE CI/CD
echo 🧪 ================================
echo.

set TESTS_PASSED=0
set TESTS_FAILED=0

REM Verificar estrutura de arquivos
echo ℹ️  Verificando estrutura de arquivos...

set "files=.github\workflows\ci-cd.yml .github\workflows\security.yml .github\workflows\release.yml .github\dependabot.yml frontend\package.json backend\requirements.txt docker-compose.yml docker-compose.dev.yml"

for %%f in (%files%) do (
    if exist "%%f" (
        echo ✅ %%f
    ) else (
        echo ❌ %%f ^(não encontrado^)
        set /a TESTS_FAILED+=1
    )
)

echo.

REM ==========================================
REM 🐍 TESTES DO BACKEND
REM ==========================================
echo ℹ️  🐍 Iniciando testes do Backend...

REM Verificar se Python está disponível
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não encontrado
    goto :end_error
)

REM Criar ambiente virtual temporário
echo 🔄 Criando ambiente virtual temporário...
cd backend
if not exist "venv_test" (
    python -m venv venv_test
)

REM Ativar ambiente virtual
call venv_test\Scripts\activate.bat

REM Instalar dependências
echo 🔄 Instalando dependências do backend...
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo ❌ Falha na instalação das dependências
    goto :end_error
)

REM Instalar ferramentas de qualidade
pip install pytest pytest-asyncio pytest-cov black isort flake8 mypy >nul 2>&1

REM Testes de qualidade do backend
echo 🔄 Executando Black - Formatação...
black --check --diff . >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Black - Arquivos precisam ser formatados
    set /a TESTS_FAILED+=1
) else (
    echo ✅ Black - PASSOU
    set /a TESTS_PASSED+=1
)

echo 🔄 Executando isort - Imports...
isort --check-only --diff . >nul 2>&1
if errorlevel 1 (
    echo ⚠️  isort - Imports precisam ser organizados
    set /a TESTS_FAILED+=1
) else (
    echo ✅ isort - PASSOU
    set /a TESTS_PASSED+=1
)

echo 🔄 Executando Flake8 - Linting...
flake8 . >nul 2>&1
if errorlevel 1 (
    echo ❌ Flake8 - Problemas de linting encontrados
    set /a TESTS_FAILED+=1
) else (
    echo ✅ Flake8 - PASSOU
    set /a TESTS_PASSED+=1
)

echo 🔄 Executando MyPy - Type Check...
mypy app\ --ignore-missing-imports >nul 2>&1
if errorlevel 1 (
    echo ❌ MyPy - Problemas de tipos encontrados
    set /a TESTS_FAILED+=1
) else (
    echo ✅ MyPy - PASSOU
    set /a TESTS_PASSED+=1
)

REM Testes unitários (se existirem)
if exist "tests" (
    echo 🔄 Executando Pytest - Testes...
    pytest tests\ -v >nul 2>&1
    if errorlevel 1 (
        echo ❌ Pytest - Alguns testes falharam
        set /a TESTS_FAILED+=1
    ) else (
        echo ✅ Pytest - PASSOU
        set /a TESTS_PASSED+=1
    )
) else (
    echo ⚠️  Nenhum teste encontrado em backend\tests\
)

REM Desativar ambiente virtual
call deactivate
cd ..

echo.

REM ==========================================
REM ⚛️ TESTES DO FRONTEND
REM ==========================================
echo ℹ️  ⚛️ Iniciando testes do Frontend...

cd frontend

REM Verificar se npm está disponível
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm não encontrado
    goto :end_error
)

REM Instalar dependências se não existirem
if not exist "node_modules" (
    echo 🔄 Instalando dependências do frontend...
    npm install >nul 2>&1
    if errorlevel 1 (
        echo ❌ Falha na instalação das dependências
        goto :end_error
    ) else (
        echo ✅ Dependências instaladas
    )
)

REM Testes de qualidade do frontend
echo 🔄 Executando ESLint - Linting...
npm run lint >nul 2>&1
if errorlevel 1 (
    echo ❌ ESLint - Problemas de linting encontrados
    echo ⚠️  Execute 'npm run lint:fix' para corrigir alguns problemas
    set /a TESTS_FAILED+=1
) else (
    echo ✅ ESLint - PASSOU
    set /a TESTS_PASSED+=1
)

echo 🔄 Executando TypeScript - Type Check...
npm run type-check >nul 2>&1
if errorlevel 1 (
    echo ❌ TypeScript - Problemas de tipos encontrados
    set /a TESTS_FAILED+=1
) else (
    echo ✅ TypeScript - PASSOU
    set /a TESTS_PASSED+=1
)

echo 🔄 Executando Prettier - Formatação...
npm run format:check >nul 2>&1
if errorlevel 1 (
    echo ❌ Prettier - Arquivos precisam ser formatados
    echo ⚠️  Execute 'npm run format' para corrigir formatação
    set /a TESTS_FAILED+=1
) else (
    echo ✅ Prettier - PASSOU
    set /a TESTS_PASSED+=1
)

echo 🔄 Executando Build - Vite...
npm run build >nul 2>&1
if errorlevel 1 (
    echo ❌ Build - Build falhou
    set /a TESTS_FAILED+=1
) else (
    echo ✅ Build - PASSOU
    set /a TESTS_PASSED+=1
)

REM Verificar se dist foi criado
if exist "dist\index.html" (
    echo ✅ dist\index.html criado com sucesso
) else (
    echo ❌ dist\index.html não foi criado
    set /a TESTS_FAILED+=1
)

cd ..

echo.

REM ==========================================
REM 🐳 TESTES DO DOCKER
REM ==========================================
echo ℹ️  🐳 Iniciando testes do Docker...

REM Verificar se Docker está disponível
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não encontrado
    goto :skip_docker
)

REM Verificar se Docker está rodando
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não está rodando
    goto :skip_docker
)

REM Build da imagem do backend
echo 🔄 Executando Docker Build - Backend...
docker build -t vur-backend-test ./backend >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Build Backend - FALHOU
    set /a TESTS_FAILED+=1
) else (
    echo ✅ Docker Build Backend - PASSOU
    set /a TESTS_PASSED+=1
)

REM Build da imagem do frontend
echo 🔄 Executando Docker Build - Frontend...
docker build -t vur-frontend-test ./frontend >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Build Frontend - FALHOU
    set /a TESTS_FAILED+=1
) else (
    echo ✅ Docker Build Frontend - PASSOU
    set /a TESTS_PASSED+=1
)

REM Limpar imagens de teste
docker rmi vur-backend-test vur-frontend-test >nul 2>&1

goto :after_docker

:skip_docker
echo ⚠️  Testes Docker pulados (Docker não disponível)

:after_docker
echo.

REM ==========================================
REM 📊 RELATÓRIO FINAL
REM ==========================================
echo 📊 ================================
echo 📊 RELATÓRIO FINAL DOS TESTES
echo 📊 ================================
echo.
echo ✅ Testes que passaram: %TESTS_PASSED%
echo ❌ Testes que falharam: %TESTS_FAILED%
set /a TOTAL_TESTS=TESTS_PASSED + TESTS_FAILED
echo 📊 Total de testes: %TOTAL_TESTS%

if %TESTS_FAILED% equ 0 (
    echo.
    echo ✅ 🎉 TODOS OS TESTES PASSARAM!
    echo ✅ Seu código está pronto para push no GitHub
    echo.
    echo 📋 Próximos passos:
    echo 1. git add .
    echo 2. git commit -m "feat: implementar CI/CD completo"
    echo 3. git push origin main
    echo.
    exit /b 0
) else (
    echo.
    echo ❌ ⚠️  ALGUNS TESTES FALHARAM
    echo ⚠️  🔧 Corrija os problemas antes de fazer push
    echo.
    echo 📋 Para corrigir automaticamente alguns problemas:
    echo # Backend:
    echo cd backend ^&^& python -m venv venv ^&^& venv\Scripts\activate ^&^& pip install black isort ^&^& black . ^&^& isort .
    echo.
    echo # Frontend:
    echo cd frontend ^&^& npm run lint:fix ^&^& npm run format
    echo.
    exit /b 1
)

:end_error
echo ❌ Erro crítico encontrado. Verificação interrompida.
exit /b 1 