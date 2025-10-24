#!/bin/bash

# ========================================
# SCRIPT DE BUILD PARA PRODUÇÃO - SGP v4
# ========================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando build para produção do SGP v4..."

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

# 1. Limpar builds anteriores
log "🧹 Limpando builds anteriores..."
cargo clean
rm -rf target/release
success "Builds anteriores removidos"

# 2. Verificar dependências
log "📦 Verificando dependências..."
cargo check --release
success "Dependências verificadas"

# 3. Executar testes
log "🧪 Executando testes..."
cargo test --release
success "Testes executados com sucesso"

# 4. Build do frontend
log "🎨 Buildando frontend..."
cd ..
if [ -f "package.json" ]; then
    npm ci --production
    npm run build
    success "Frontend buildado"
else
    warning "package.json não encontrado, pulando build do frontend"
fi
cd src-tauri

# 5. Build do Rust em modo release
log "🦀 Buildando aplicação Rust em modo release..."
cargo build --release
success "Aplicação Rust buildada"

# 6. Build do Tauri
log "📱 Buildando aplicação Tauri..."
cargo tauri build
success "Aplicação Tauri buildada"

# 7. Verificar arquivos gerados
log "📋 Verificando arquivos gerados..."
if [ -d "target/release/bundle" ]; then
    success "Arquivos de bundle encontrados:"
    ls -la target/release/bundle/
else
    error "Diretório de bundle não encontrado"
    exit 1
fi

# 8. Informações sobre o build
log "📊 Informações do build:"
echo "  - Tamanho do executável: $(du -h target/release/sgp-v4 2>/dev/null || echo 'N/A')"
echo "  - Arquivos de bundle: $(find target/release/bundle -name "*.exe" -o -name "*.deb" -o -name "*.dmg" -o -name "*.app" | wc -l)"
echo "  - Data do build: $(date)"

# 9. Criar arquivo de informações do build
cat > target/release/BUILD_INFO.txt << EOF
SGP v4 - Build de Produção
==========================

Data do Build: $(date)
Versão: 1.0.0
Commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')
Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')

Arquivos Gerados:
$(find target/release/bundle -type f 2>/dev/null || echo 'Nenhum arquivo encontrado')

Configurações de Produção:
- Otimizações: Máximas (opt-level = 3)
- LTO: Habilitado
- Debug: Desabilitado
- Strip: Habilitado
- Logs: Nível INFO

Próximos Passos:
1. Testar a aplicação gerada
2. Distribuir os arquivos de bundle
3. Configurar banco de dados de produção
4. Configurar variáveis de ambiente
EOF

success "Arquivo BUILD_INFO.txt criado"

# 10. Resumo final
echo ""
echo "=========================================="
success "🎉 BUILD PARA PRODUÇÃO CONCLUÍDO!"
echo "=========================================="
echo ""
echo "📁 Arquivos gerados em: target/release/bundle/"
echo "📋 Informações do build: target/release/BUILD_INFO.txt"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Teste a aplicação gerada"
echo "   2. Configure o banco de dados de produção"
echo "   3. Configure as variáveis de ambiente"
echo "   4. Distribua os arquivos de bundle"
echo ""
echo "💡 Para testar:"
echo "   ./target/release/sgp-v4"
echo ""
