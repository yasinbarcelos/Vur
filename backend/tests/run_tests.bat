@echo off
REM Script Batch para Executar Testes das APIs - VUR
REM Windows PowerShell Script

echo.
echo ========================================
echo 🧪 TESTADOR DE APIs VUR
echo ========================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não encontrado! Instale Python primeiro.
    pause
    exit /b 1
)

REM Verificar se aiohttp está instalado
python -c "import aiohttp" >nul 2>&1
if errorlevel 1 (
    echo 📦 Instalando dependências...
    pip install aiohttp
    if errorlevel 1 (
        echo ❌ Falha ao instalar dependências!
        pause
        exit /b 1
    )
)

REM Menu de opções
:menu
echo.
echo Escolha o tipo de teste:
echo.
echo 1. 🚀 Testes Completos de Autenticação
echo 2. ⚡ Testes Rápidos (Health + Login)
echo 3. 🏭 Testes de Produção (Sem modificar dados)
echo 4. 🔍 Testes Verbosos (Mostra detalhes)
echo 5. 🌐 Testes com URL Personalizada
echo 6. ❓ Ajuda
echo 0. 🚪 Sair
echo.
set /p choice="Digite sua escolha (0-6): "

if "%choice%"=="1" goto full_tests
if "%choice%"=="2" goto quick_tests
if "%choice%"=="3" goto production_tests
if "%choice%"=="4" goto verbose_tests
if "%choice%"=="5" goto custom_url_tests
if "%choice%"=="6" goto help
if "%choice%"=="0" goto exit
echo ❌ Opção inválida! Tente novamente.
goto menu

:full_tests
echo.
echo 🚀 Executando Testes Completos de Autenticação...
python test_auth_apis.py
goto end

:quick_tests
echo.
echo ⚡ Executando Testes Rápidos...
python run_tests.py --quick
goto end

:production_tests
echo.
echo 🏭 Executando Testes de Produção...
python run_tests.py --production
goto end

:verbose_tests
echo.
echo 🔍 Executando Testes Verbosos...
python test_auth_apis.py --verbose
goto end

:custom_url_tests
echo.
set /p custom_url="Digite a URL da API (ex: http://localhost:8000): "
if "%custom_url%"=="" (
    echo ❌ URL não pode estar vazia!
    goto menu
)
echo.
echo 🌐 Executando testes com URL: %custom_url%
python test_auth_apis.py --base-url "%custom_url%/api/v1"
goto end

:help
echo.
echo ========================================
echo 📚 AJUDA - TESTADOR DE APIs VUR
echo ========================================
echo.
echo 🧪 TIPOS DE TESTE:
echo.
echo 1. TESTES COMPLETOS:
echo    - Registra novo usuário
echo    - Testa login/logout
echo    - Verifica perfil do usuário
echo    - Atualiza dados do perfil
echo    - Testa cenários de erro
echo.
echo 2. TESTES RÁPIDOS:
echo    - Health check da API
echo    - Login com usuário existente
echo    - Verificação do perfil
echo.
echo 3. TESTES DE PRODUÇÃO:
echo    - Apenas testes que não modificam dados
echo    - Adequado para ambientes de produção
echo    - Testa cenários de erro
echo.
echo 4. TESTES VERBOSOS:
echo    - Mostra detalhes de todas as requisições
echo    - URLs, dados enviados e recebidos
echo    - Útil para debug
echo.
echo 🔧 CONFIGURAÇÃO:
echo    - URL padrão: http://localhost:8000/api/v1
echo    - Timeout: 30 segundos
echo    - Usuário de teste: testuser / TestPassword123
echo.
echo 📊 RESULTADOS:
echo    - ✅ Verde: Teste passou
echo    - ❌ Vermelho: Teste falhou
echo    - ⚠️ Amarelo: Aviso
echo    - ℹ️ Azul: Informação
echo.
pause
goto menu

:end
echo.
echo ========================================
echo 📊 TESTES CONCLUÍDOS
echo ========================================
echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto menu

:exit
echo.
echo 👋 Obrigado por usar o Testador de APIs VUR!
echo.
exit /b 0 