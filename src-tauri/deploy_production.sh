#!/bin/bash

# ========================================
# SCRIPT DE DEPLOY PARA PRODUÇÃO - SGP v4
# ========================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy para produção do SGP v4..."

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

# Verificar se o build de produção existe
if [ ! -d "target/release/bundle" ]; then
    error "Build de produção não encontrado. Execute ./build_production.sh primeiro"
    exit 1
fi

# 1. Backup do banco de dados atual
log "💾 Criando backup do banco de dados..."
if command -v pg_dump &> /dev/null; then
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump $DATABASE_URL > "backups/$BACKUP_FILE" 2>/dev/null || warning "Não foi possível criar backup do banco"
    success "Backup criado: backups/$BACKUP_FILE"
else
    warning "pg_dump não encontrado, pulando backup"
fi

# 2. Aplicar migrações
log "🔄 Aplicando migrações do banco de dados..."
if [ -f "apply_migrations.sh" ]; then
    chmod +x apply_migrations.sh
    ./apply_migrations.sh
    success "Migrações aplicadas"
else
    warning "Script de migrações não encontrado"
fi

# 3. Verificar configurações de produção
log "⚙️ Verificando configurações de produção..."
if [ ! -f ".env.production" ]; then
    warning "Arquivo .env.production não encontrado"
    if [ -f "production.env.example" ]; then
        log "Copiando exemplo de configuração..."
        cp production.env.example .env.production
        warning "Configure o arquivo .env.production antes de continuar"
        exit 1
    fi
fi

# 4. Parar serviços existentes
log "🛑 Parando serviços existentes..."
if pgrep -f "sgp-v4" > /dev/null; then
    pkill -f "sgp-v4"
    sleep 2
    success "Serviços parados"
else
    log "Nenhum serviço em execução encontrado"
fi

# 5. Instalar dependências do sistema
log "📦 Instalando dependências do sistema..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y postgresql-client libssl-dev
    success "Dependências instaladas"
elif command -v yum &> /dev/null; then
    sudo yum update -y
    sudo yum install -y postgresql libssl-devel
    success "Dependências instaladas"
else
    warning "Gerenciador de pacotes não reconhecido"
fi

# 6. Criar diretórios necessários
log "📁 Criando diretórios necessários..."
sudo mkdir -p /var/log/sgp-v4
sudo mkdir -p /var/backups/sgp-v4
sudo mkdir -p /var/uploads/sgp-v4
sudo chown -R $USER:$USER /var/log/sgp-v4
sudo chown -R $USER:$USER /var/backups/sgp-v4
sudo chown -R $USER:$USER /var/uploads/sgp-v4
success "Diretórios criados"

# 7. Copiar arquivos de produção
log "📋 Copiando arquivos de produção..."
sudo cp target/release/sgp-v4 /usr/local/bin/
sudo chmod +x /usr/local/bin/sgp-v4
success "Aplicação instalada"

# 8. Criar arquivo de configuração do sistema
log "⚙️ Criando configuração do sistema..."
sudo tee /etc/systemd/system/sgp-v4.service > /dev/null << EOF
[Unit]
Description=SGP v4 - Sistema de Gerenciamento de Pedidos
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
EnvironmentFile=$(pwd)/.env.production
ExecStart=/usr/local/bin/sgp-v4
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 9. Configurar logs
log "📝 Configurando sistema de logs..."
sudo tee /etc/logrotate.d/sgp-v4 > /dev/null << EOF
/var/log/sgp-v4/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF

# 10. Habilitar e iniciar serviço
log "🚀 Habilitando e iniciando serviço..."
sudo systemctl daemon-reload
sudo systemctl enable sgp-v4
sudo systemctl start sgp-v4
success "Serviço iniciado"

# 11. Verificar status
log "🔍 Verificando status do serviço..."
sleep 3
if systemctl is-active --quiet sgp-v4; then
    success "Serviço está rodando"
else
    error "Serviço falhou ao iniciar"
    sudo systemctl status sgp-v4
    exit 1
fi

# 12. Testar conectividade
log "🧪 Testando conectividade..."
sleep 5
if curl -f http://localhost:1420 > /dev/null 2>&1; then
    success "Aplicação respondendo"
else
    warning "Aplicação não está respondendo na porta 1420"
fi

# 13. Configurar firewall
log "🔥 Configurando firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 1420/tcp
    success "Firewall configurado"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=1420/tcp
    sudo firewall-cmd --reload
    success "Firewall configurado"
else
    warning "Firewall não configurado"
fi

# 14. Resumo final
echo ""
echo "=========================================="
success "🎉 DEPLOY PARA PRODUÇÃO CONCLUÍDO!"
echo "=========================================="
echo ""
echo "📊 Status do serviço:"
sudo systemctl status sgp-v4 --no-pager
echo ""
echo "🔗 URLs de acesso:"
echo "   - Aplicação: http://localhost:1420"
echo "   - Logs: sudo journalctl -u sgp-v4 -f"
echo ""
echo "🛠️ Comandos úteis:"
echo "   - Parar: sudo systemctl stop sgp-v4"
echo "   - Iniciar: sudo systemctl start sgp-v4"
echo "   - Reiniciar: sudo systemctl restart sgp-v4"
echo "   - Status: sudo systemctl status sgp-v4"
echo "   - Logs: sudo journalctl -u sgp-v4 -f"
echo ""
echo "📁 Arquivos importantes:"
echo "   - Configuração: .env.production"
echo "   - Logs: /var/log/sgp-v4/"
echo "   - Backups: /var/backups/sgp-v4/"
echo "   - Uploads: /var/uploads/sgp-v4/"
echo ""
