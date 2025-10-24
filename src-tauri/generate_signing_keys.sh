#!/bin/bash

# ========================================
# SCRIPT PARA GERAR CHAVES DE ASSINATURA - SGP v4
# ========================================

set -e  # Parar em caso de erro

echo "🔐 Gerando chaves de assinatura para o SGP v4..."

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

# Criar diretório para chaves
mkdir -p keys

# Gerar chave privada
log "🔑 Gerando chave privada..."
openssl genrsa -out keys/sgp-v4-private.key 4096
success "Chave privada gerada: keys/sgp-v4-private.key"

# Gerar chave pública
log "🔑 Gerando chave pública..."
openssl rsa -in keys/sgp-v4-private.key -pubout -out keys/sgp-v4-public.key
success "Chave pública gerada: keys/sgp-v4-public.key"

# Gerar chave pública em formato base64 para o tauri.conf.json
log "🔑 Convertendo chave pública para base64..."
PUBLIC_KEY_BASE64=$(openssl rsa -in keys/sgp-v4-private.key -pubout | base64 -w 0)
success "Chave pública em base64 gerada"

# Criar arquivo de configuração
log "📝 Criando arquivo de configuração..."
cat > keys/tauri-updater-config.txt << EOF
# Configuração do Updater - SGP v4
# =================================

# Chave pública (para tauri.conf.json)
PUBLIC_KEY_BASE64="$PUBLIC_KEY_BASE64"

# Chave privada (para assinar atualizações)
PRIVATE_KEY_PATH="keys/sgp-v4-private.key"

# Chave pública (para verificação)
PUBLIC_KEY_PATH="keys/sgp-v4-public.key"

# Como usar:
# 1. Copie PUBLIC_KEY_BASE64 para o campo "pubkey" no tauri.conf.json
# 2. Use PRIVATE_KEY_PATH para assinar as atualizações
# 3. Mantenha as chaves seguras e não as compartilhe

# Exemplo de uso no tauri.conf.json:
# "pubkey": "$PUBLIC_KEY_BASE64"

# Comando para assinar uma atualização:
# tauri signer sign -k keys/sgp-v4-private.key -f update.tar.gz
EOF

success "Arquivo de configuração criado: keys/tauri-updater-config.txt"

# Criar script de assinatura
log "📝 Criando script de assinatura..."
cat > keys/sign_update.sh << 'EOF'
#!/bin/bash

# Script para assinar atualizações do SGP v4
# Uso: ./sign_update.sh <arquivo-da-atualização>

if [ $# -eq 0 ]; then
    echo "Uso: $0 <arquivo-da-atualização>"
    echo "Exemplo: $0 sgp-v4-update.tar.gz"
    exit 1
fi

UPDATE_FILE="$1"
PRIVATE_KEY="sgp-v4-private.key"

if [ ! -f "$UPDATE_FILE" ]; then
    echo "Erro: Arquivo $UPDATE_FILE não encontrado"
    exit 1
fi

if [ ! -f "$PRIVATE_KEY" ]; then
    echo "Erro: Chave privada $PRIVATE_KEY não encontrada"
    exit 1
fi

echo "🔐 Assinando arquivo: $UPDATE_FILE"
echo "🔑 Usando chave: $PRIVATE_KEY"

# Assinar o arquivo
openssl dgst -sha256 -sign "$PRIVATE_KEY" -out "${UPDATE_FILE}.sig" "$UPDATE_FILE"

echo "✅ Arquivo assinado: ${UPDATE_FILE}.sig"
echo "📋 Para verificar a assinatura:"
echo "   openssl dgst -sha256 -verify sgp-v4-public.key -signature ${UPDATE_FILE}.sig $UPDATE_FILE"
EOF

chmod +x keys/sign_update.sh
success "Script de assinatura criado: keys/sign_update.sh"

# Criar script de verificação
log "📝 Criando script de verificação..."
cat > keys/verify_update.sh << 'EOF'
#!/bin/bash

# Script para verificar assinaturas de atualizações do SGP v4
# Uso: ./verify_update.sh <arquivo-da-atualização> <arquivo-de-assinatura>

if [ $# -ne 2 ]; then
    echo "Uso: $0 <arquivo-da-atualização> <arquivo-de-assinatura>"
    echo "Exemplo: $0 sgp-v4-update.tar.gz sgp-v4-update.tar.gz.sig"
    exit 1
fi

UPDATE_FILE="$1"
SIGNATURE_FILE="$2"
PUBLIC_KEY="sgp-v4-public.key"

if [ ! -f "$UPDATE_FILE" ]; then
    echo "Erro: Arquivo $UPDATE_FILE não encontrado"
    exit 1
fi

if [ ! -f "$SIGNATURE_FILE" ]; then
    echo "Erro: Arquivo de assinatura $SIGNATURE_FILE não encontrado"
    exit 1
fi

if [ ! -f "$PUBLIC_KEY" ]; then
    echo "Erro: Chave pública $PUBLIC_KEY não encontrada"
    exit 1
fi

echo "🔍 Verificando assinatura de: $UPDATE_FILE"
echo "🔑 Usando chave pública: $PUBLIC_KEY"

# Verificar a assinatura
if openssl dgst -sha256 -verify "$PUBLIC_KEY" -signature "$SIGNATURE_FILE" "$UPDATE_FILE"; then
    echo "✅ Assinatura válida!"
    exit 0
else
    echo "❌ Assinatura inválida!"
    exit 1
fi
EOF

chmod +x keys/verify_update.sh
success "Script de verificação criado: keys/verify_update.sh"

# Mostrar informações importantes
echo ""
echo "=========================================="
success "🎉 CHAVES DE ASSINATURA GERADAS!"
echo "=========================================="
echo ""
echo "📁 Arquivos criados:"
echo "  - keys/sgp-v4-private.key (MANTENHA SEGURO!)"
echo "  - keys/sgp-v4-public.key"
echo "  - keys/tauri-updater-config.txt"
echo "  - keys/sign_update.sh"
echo "  - keys/verify_update.sh"
echo ""
echo "🔑 Chave pública para tauri.conf.json:"
echo "  $PUBLIC_KEY_BASE64"
echo ""
echo "⚠️ IMPORTANTE:"
echo "  - Mantenha a chave privada SEGURA e NÃO a compartilhe"
echo "  - Use a chave privada apenas para assinar atualizações"
echo "  - A chave pública pode ser compartilhada"
echo ""
echo "🚀 Próximos passos:"
echo "  1. Copie a chave pública para o tauri.conf.json"
echo "  2. Configure o servidor de atualizações"
echo "  3. Use o script de assinatura para assinar atualizações"
echo ""
echo "📋 Para atualizar o tauri.conf.json:"
echo "  Substitua o campo 'pubkey' por:"
echo "  \"pubkey\": \"$PUBLIC_KEY_BASE64\""
echo ""

