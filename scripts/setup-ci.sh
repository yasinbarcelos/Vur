#!/bin/bash

# 🚀 VUR - Setup de CI/CD
# Este script configura automaticamente o ambiente de CI/CD para o projeto VUR

set -e

echo "🚀 Configurando CI/CD para VUR..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Verificar se GitHub CLI está instalado
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) não está instalado"
    log_info "Instale com: https://cli.github.com/"
    exit 1
fi

# Verificar se está logado no GitHub
if ! gh auth status &> /dev/null; then
    log_error "Não está autenticado no GitHub"
    log_info "Execute: gh auth login"
    exit 1
fi

log_info "Verificando configuração do repositório..."

# Obter informações do repositório
REPO_OWNER=$(gh repo view --json owner --jq .owner.login)
REPO_NAME=$(gh repo view --json name --jq .name)

log_success "Repositório: $REPO_OWNER/$REPO_NAME"

# Verificar se é um repositório GitHub
if [[ "$REPO_OWNER" == "" || "$REPO_NAME" == "" ]]; then
    log_error "Não foi possível identificar o repositório GitHub"
    exit 1
fi

# Habilitar GitHub Actions se não estiver habilitado
log_info "Verificando GitHub Actions..."
if gh api repos/$REPO_OWNER/$REPO_NAME/actions/permissions --jq .enabled | grep -q false; then
    log_warning "GitHub Actions não está habilitado"
    log_info "Habilitando GitHub Actions..."
    gh api --method PUT repos/$REPO_OWNER/$REPO_NAME/actions/permissions \
        --field enabled=true \
        --field allowed_actions="all"
    log_success "GitHub Actions habilitado"
else
    log_success "GitHub Actions já está habilitado"
fi

# Configurar secrets necessários (interativo)
log_info "Configurando secrets do repositório..."

# Lista de secrets necessários
declare -A SECRETS=(
    ["CODECOV_TOKEN"]="Token do Codecov para upload de cobertura (opcional)"
    ["DEPLOY_TOKEN"]="Token para deploy automático (opcional)"
    ["DOCKER_USERNAME"]="Username do Docker Hub (opcional)"
    ["DOCKER_TOKEN"]="Token do Docker Hub (opcional)"
)

for secret_name in "${!SECRETS[@]}"; do
    description="${SECRETS[$secret_name]}"
    
    # Verificar se o secret já existe
    if gh secret list | grep -q "$secret_name"; then
        log_success "Secret $secret_name já existe"
    else
        log_warning "Secret $secret_name não encontrado"
        echo -e "📝 $description"
        read -p "Deseja configurar $secret_name agora? (y/N): " -r
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -s -p "Digite o valor para $secret_name: " secret_value
            echo
            
            if [[ -n "$secret_value" ]]; then
                echo "$secret_value" | gh secret set "$secret_name"
                log_success "Secret $secret_name configurado"
            else
                log_warning "Valor vazio, pulando $secret_name"
            fi
        else
            log_info "Pulando $secret_name (pode ser configurado depois)"
        fi
    fi
done

# Configurar environments
log_info "Configurando environments..."

# Environment de staging
if gh api repos/$REPO_OWNER/$REPO_NAME/environments/staging &> /dev/null; then
    log_success "Environment 'staging' já existe"
else
    log_info "Criando environment 'staging'..."
    gh api --method PUT repos/$REPO_OWNER/$REPO_NAME/environments/staging \
        --field wait_timer=0 \
        --field prevent_self_review=false \
        --field reviewers=null
    log_success "Environment 'staging' criado"
fi

# Environment de production
if gh api repos/$REPO_OWNER/$REPO_NAME/environments/production &> /dev/null; then
    log_success "Environment 'production' já existe"
else
    log_info "Criando environment 'production'..."
    # Environment de produção requer aprovação manual
    gh api --method PUT repos/$REPO_OWNER/$REPO_NAME/environments/production \
        --field wait_timer=0 \
        --field prevent_self_review=true \
        --field reviewers="[{\"type\":\"User\",\"id\":$(gh api user --jq .id)}]"
    log_success "Environment 'production' criado com proteção"
fi

# Habilitar GitHub Container Registry
log_info "Configurando GitHub Container Registry..."
gh api --method PATCH user \
    --field email="$(git config user.email)" \
    --field name="$(git config user.name)" > /dev/null
log_success "GHCR configurado"

# Configurar branch protection
log_info "Configurando proteção da branch main..."

# Verificar se a branch protection já existe
if gh api repos/$REPO_OWNER/$REPO_NAME/branches/main/protection &> /dev/null; then
    log_success "Proteção da branch main já existe"
else
    log_info "Criando proteção da branch main..."
    gh api --method PUT repos/$REPO_OWNER/$REPO_NAME/branches/main/protection \
        --field required_status_checks='{"strict":true,"contexts":["🐍 Backend Tests & Quality","⚛️ Frontend Tests & Quality"]}' \
        --field enforce_admins=false \
        --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
        --field restrictions=null \
        --field allow_force_pushes=false \
        --field allow_deletions=false > /dev/null
    log_success "Proteção da branch main configurada"
fi

# Verificar estrutura de arquivos
log_info "Verificando estrutura de arquivos..."

required_files=(
    ".github/workflows/ci-cd.yml"
    ".github/workflows/security.yml"
    ".github/workflows/release.yml"
    ".github/dependabot.yml"
    "frontend/.prettierrc"
    "CI_CD_GUIDE.md"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "✓ $file"
    else
        log_warning "✗ $file (arquivo não encontrado)"
    fi
done

# Verificar dependências do frontend
log_info "Verificando dependências do frontend..."

if [[ -f "frontend/package.json" ]]; then
    cd frontend
    
    # Verificar se prettier está instalado
    if npm list prettier &> /dev/null; then
        log_success "Prettier instalado"
    else
        log_warning "Prettier não encontrado, instalando..."
        npm install --save-dev prettier
        log_success "Prettier instalado"
    fi
    
    # Verificar se vitest está instalado  
    if npm list vitest &> /dev/null; then
        log_success "Vitest instalado"
    else
        log_warning "Vitest não encontrado, instalando..."
        npm install --save-dev vitest @vitest/ui @vitest/coverage-v8
        log_success "Vitest instalado"
    fi
    
    cd ..
else
    log_warning "package.json do frontend não encontrado"
fi

# Executar primeiro teste do CI
log_info "Testando configuração do CI..."

if [[ $(git status --porcelain) ]]; then
    log_info "Commitando alterações de configuração..."
    git add .
    git commit -m "🔧 Configurar CI/CD automático

- Adicionar workflows GitHub Actions
- Configurar Dependabot
- Adicionar ferramentas de qualidade
- Configurar environments"
    
    log_info "Fazendo push para triggerar primeiro CI..."
    git push
    
    log_success "Push realizado - verifique o GitHub Actions"
else
    log_info "Nenhuma alteração para commit"
fi

# Finalização
echo
echo "🎉 Configuração de CI/CD concluída!"
echo
echo "📋 Próximos passos:"
echo "1. Verifique os workflows em: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo "2. Configure secrets adicionais se necessário"
echo "3. Revise as configurações de proteção da branch"
echo "4. Leia o guia completo em: CI_CD_GUIDE.md"
echo
echo "🔗 Links úteis:"
echo "   • Actions: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo "   • Security: https://github.com/$REPO_OWNER/$REPO_NAME/security"
echo "   • Settings: https://github.com/$REPO_OWNER/$REPO_NAME/settings"
echo
log_success "Setup concluído com sucesso!" 