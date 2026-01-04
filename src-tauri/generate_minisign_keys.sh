#!/bin/bash

# ========================================
# SCRIPT PARA GERAR CHAVES MINISIGN - Tauri v2
# ========================================

set -e  # Parar em caso de erro

echo "🔐 Gerando chaves minisign para o Tauri v2..."

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

# Verificar se minisign está instalado
if ! command -v minisign &> /dev/null; then
    error "minisign não está instalado!"
    echo ""
    echo "Para instalar minisign:"
    echo "  - Linux: sudo apt install minisign (ou equivalente)"
    echo "  - macOS: brew install minisign"
    echo "  - Windows: Baixe de https://github.com/jedisct1/minisign/releases"
    echo ""
    echo "Ou use o Tauri CLI para gerar as chaves:"
    echo "  cargo install tauri-cli"
    echo "  cargo tauri signer generate -w ~/.tauri/myapp.key"
    exit 1
fi

# Criar diretório para chaves
mkdir -p keys

# Gerar chaves minisign
log "🔑 Gerando chaves minisign..."
minisign -G -s keys/sgp-v4-secret.key -p keys/sgp-v4-public.key

if [ ! -f "keys/sgp-v4-public.key" ]; then
    error "Falha ao gerar chaves minisign"
    exit 1
fi

success "Chaves minisign geradas!"

# Ler a chave pública e extrair apenas a parte base64
log "📝 Extraindo chave pública..."
PUBLIC_KEY=$(grep -v "^untrusted comment:" keys/sgp-v4-public.key | head -n 1 | tr -d '\n')

if [ -z "$PUBLIC_KEY" ]; then
    error "Não foi possível extrair a chave pública"
    exit 1
fi

# Criar arquivo de configuração
log "📝 Criando arquivo de configuração..."
cat > keys/tauri-updater-config.txt << EOF
# Configuração do Updater - SGP v4 (Tauri v2 - Minisign)
# ======================================================

# Chave pública (para tauri.conf.json)
PUBLIC_KEY="$PUBLIC_KEY"

# Chave privada (para assinar atualizações)
PRIVATE_KEY_PATH="keys/sgp-v4-secret.key"

# Chave pública (para verificação)
PUBLIC_KEY_PATH="keys/sgp-v4-public.key"

# Como usar:
# 1. Copie PUBLIC_KEY para o campo "pubkey" no tauri.conf.json
# 2. Use PRIVATE_KEY_PATH para assinar as atualizações durante o build
# 3. Mantenha as chaves seguras e não as compartilhe

# Exemplo de uso no tauri.conf.json:
# "pubkey": "$PUBLIC_KEY"

# Para assinar atualizações durante o build, configure:
# export TAURI_SIGNING_PRIVATE_KEY="\$(cat keys/sgp-v4-secret.key)"
# export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""  # Se a chave tiver senha
EOF

success "Arquivo de configuração criado: keys/tauri-updater-config.txt"

# Mostrar informações importantes
echo ""
echo "=========================================="
success "🎉 CHAVES MINISIGN GERADAS!"
echo "=========================================="
echo ""
echo "📁 Arquivos criados:"
echo "  - keys/sgp-v4-secret.key (MANTENHA SEGURO!)"
echo "  - keys/sgp-v4-public.key"
echo "  - keys/tauri-updater-config.txt"
echo ""
echo "🔑 Chave pública para tauri.conf.json:"
echo "  $PUBLIC_KEY"
echo ""
echo "⚠️ IMPORTANTE:"
echo "  - Mantenha a chave privada (secret.key) SEGURA e NÃO a compartilhe"
echo "  - Use a chave privada apenas para assinar atualizações durante o build"
echo "  - A chave pública pode ser compartilhada"
echo ""
echo "🚀 Próximos passos:"
echo "  1. Copie a chave pública acima para o campo 'pubkey' no tauri.conf.json"
echo "  2. Configure as variáveis de ambiente para assinar durante o build:"
echo "     export TAURI_SIGNING_PRIVATE_KEY=\"\$(cat keys/sgp-v4-secret.key)\""
echo "     export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=\"\"  # Se necessário"
echo "  3. Configure o servidor de atualizações"
echo "  4. Ative o updater no tauri.conf.json: \"active\": true"
echo ""
echo "📋 Para atualizar o tauri.conf.json:"
echo "  Substitua o campo 'pubkey' por:"
echo "  \"pubkey\": \"$PUBLIC_KEY\""
echo "  E altere \"active\": false para \"active\": true"
echo ""

