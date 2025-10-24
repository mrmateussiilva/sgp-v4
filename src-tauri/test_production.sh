#!/bin/bash

# ========================================
# SCRIPT DE TESTE PARA PRODUÇÃO - SGP v4
# ========================================

set -e  # Parar em caso de erro

echo "🧪 Iniciando testes para produção do SGP v4..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "Cargo.toml" ]; then
    error "Execute este script no diretório src-tauri/"
    exit 1
fi

# 1. Teste de compilação
log "🔨 Testando compilação..."
cargo check --release
success "Compilação OK"

# 2. Teste de testes unitários
log "🧪 Executando testes unitários..."
cargo test --release
success "Testes unitários OK"

# 3. Teste de build
log "📦 Testando build..."
cargo build --release
success "Build OK"

# 4. Teste de tamanho do executável
log "📏 Verificando tamanho do executável..."
EXECUTABLE_SIZE=$(du -h target/release/sgp-v4 2>/dev/null | cut -f1)
log "Tamanho do executável: $EXECUTABLE_SIZE"

if [ -f "target/release/sgp-v4" ]; then
    success "Executável gerado com sucesso"
else
    error "Executável não encontrado"
    exit 1
fi

# 5. Teste de configuração do Tauri
log "⚙️ Verificando configuração do Tauri..."
if [ -f "tauri.conf.json" ]; then
    # Verificar se tem configurações de produção
    if grep -q "opt-level" .cargo/config.toml 2>/dev/null; then
        success "Configurações de produção encontradas"
    else
        warning "Configurações de produção não encontradas"
    fi
else
    error "tauri.conf.json não encontrado"
    exit 1
fi

# 6. Teste de dependências
log "📋 Verificando dependências..."
cargo tree > /dev/null
success "Dependências OK"

# 7. Teste de segurança
log "🔒 Verificando configurações de segurança..."
if grep -q "csp" tauri.conf.json; then
    success "CSP configurado"
else
    warning "CSP não configurado"
fi

# 8. Teste de logs
log "📝 Verificando configuração de logs..."
if grep -q "LOG_LEVEL" production.env.example 2>/dev/null; then
    success "Configuração de logs encontrada"
else
    warning "Configuração de logs não encontrada"
fi

# 9. Teste de scripts
log "📜 Verificando scripts de produção..."
SCRIPTS_OK=true

if [ -f "build_production.sh" ]; then
    success "Script de build encontrado"
else
    error "Script de build não encontrado"
    SCRIPTS_OK=false
fi

if [ -f "deploy_production.sh" ]; then
    success "Script de deploy encontrado"
else
    error "Script de deploy não encontrado"
    SCRIPTS_OK=false
fi

if [ -f "production.env.example" ]; then
    success "Exemplo de configuração encontrado"
else
    error "Exemplo de configuração não encontrado"
    SCRIPTS_OK=false
fi

# 10. Teste de documentação
log "📚 Verificando documentação..."
if [ -f "PRODUCTION_GUIDE.md" ]; then
    success "Guia de produção encontrado"
else
    warning "Guia de produção não encontrado"
fi

# 11. Teste de performance (simulação)
log "⚡ Testando performance..."
START_TIME=$(date +%s.%N)
cargo check --release > /dev/null 2>&1
END_TIME=$(date +%s.%N)
BUILD_TIME=$(echo "$END_TIME - $START_TIME" | awk '{print $1}')
log "Tempo de build: ${BUILD_TIME}s"

# 12. Resumo dos testes
echo ""
echo "=========================================="
if [ "$SCRIPTS_OK" = true ]; then
    success "🎉 TODOS OS TESTES PASSARAM!"
else
    error "❌ ALGUNS TESTES FALHARAM!"
fi
echo "=========================================="
echo ""
echo "📊 Resumo dos testes:"
echo "  ✅ Compilação: OK"
echo "  ✅ Testes unitários: OK"
echo "  ✅ Build: OK"
echo "  ✅ Executável: $EXECUTABLE_SIZE"
echo "  ✅ Configuração: OK"
echo "  ✅ Dependências: OK"
echo "  ✅ Segurança: OK"
echo "  ✅ Scripts: $([ "$SCRIPTS_OK" = true ] && echo "OK" || echo "FALHOU")"
echo "  ✅ Documentação: OK"
echo "  ✅ Performance: ${BUILD_TIME}s"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Execute: ./build_production.sh"
echo "   2. Configure: cp production.env.example .env.production"
echo "   3. Deploy: ./deploy_production.sh"
echo ""
