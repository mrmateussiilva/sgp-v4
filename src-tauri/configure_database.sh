#!/bin/bash
# configure_database.sh - Script de configuração automática do banco

set -e

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

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Configurações
DB_USER="sgp_user"
DB_NAME="sgp_production"
DB_PASSWORD="Sgp2024!Strong"
DB_HOST="localhost"
DB_PORT="5432"

log "🗄️ Iniciando configuração do banco de dados PostgreSQL para SGP v4..."

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Execute como usuário normal."
fi

# 1. Verificar se PostgreSQL está instalado
log "📦 Verificando instalação do PostgreSQL..."
if ! command -v psql &> /dev/null; then
    log "📦 Instalando PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    success "PostgreSQL instalado com sucesso"
else
    success "PostgreSQL já está instalado"
fi

# 2. Iniciar e habilitar serviço
log "🚀 Configurando serviço PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql
success "Serviço PostgreSQL configurado"

# 3. Verificar se serviço está rodando
log "🔍 Verificando status do serviço..."
if sudo systemctl is-active --quiet postgresql; then
    success "PostgreSQL está rodando"
else
    error "PostgreSQL não está rodando"
fi

# 4. Configurar banco de dados
log "⚙️ Configurando banco de dados..."
sudo -u postgres psql << EOF
-- Criar usuário se não existir
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Criar banco se não existir
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
success "Banco de dados configurado"

# 5. Configurar acesso remoto
log "🔒 Configurando acesso remoto..."
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

if [ -d "$PG_CONFIG_DIR" ]; then
    # Configurar listen_addresses
    sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONFIG_DIR/postgresql.conf"
    
    # Configurar pg_hba.conf para permitir conexões locais
    if ! grep -q "host.*$DB_NAME.*$DB_USER.*127.0.0.1.*md5" "$PG_CONFIG_DIR/pg_hba.conf"; then
        echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" | sudo tee -a "$PG_CONFIG_DIR/pg_hba.conf"
    fi
    
    success "Acesso remoto configurado"
else
    warning "Diretório de configuração PostgreSQL não encontrado: $PG_CONFIG_DIR"
fi

# 6. Configurar firewall
log "🔥 Configurando firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 5432/tcp
    success "Firewall configurado (UFW)"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=5432/tcp
    sudo firewall-cmd --reload
    success "Firewall configurado (firewalld)"
else
    warning "Gerenciador de firewall não encontrado"
fi

# 7. Reiniciar PostgreSQL
log "🔄 Reiniciando PostgreSQL..."
sudo systemctl restart postgresql
sleep 2

# Verificar se reiniciou corretamente
if sudo systemctl is-active --quiet postgresql; then
    success "PostgreSQL reiniciado com sucesso"
else
    error "Erro ao reiniciar PostgreSQL"
fi

# 8. Testar conexão
log "🧪 Testando conexão..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" &> /dev/null; then
    success "Conexão testada com sucesso"
else
    error "Falha na conexão com o banco"
fi

# 9. Criar arquivo de configuração
log "📝 Criando arquivo de configuração..."
cat > db_config.json << EOF
{
  "host": "$DB_HOST",
  "port": "$DB_PORT",
  "user": "$DB_USER",
  "password": "$DB_PASSWORD",
  "database": "$DB_NAME"
}
EOF
success "Arquivo db_config.json criado"

# 10. Criar arquivo .env
log "📝 Criando arquivo .env..."
cat > .env << EOF
# Configurações do Banco de Dados PostgreSQL
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_MAX_CONNECTIONS=10

# Configurações da Aplicação
SESSION_TIMEOUT_HOURS=24
CACHE_TTL_SECONDS=3600
RUN_MIGRATIONS=true

# Logs
RUST_LOG=info
EOF
success "Arquivo .env criado"

# 11. Criar script de backup
log "💾 Criando script de backup..."
cat > backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sgp_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Carregar variáveis do .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup criado: $BACKUP_FILE"
    # Manter apenas os últimos 7 backups
    ls -t $BACKUP_DIR/sgp_backup_*.sql | tail -n +8 | xargs -r rm
else
    echo "❌ Erro ao criar backup"
    exit 1
fi
EOF

chmod +x backup_db.sh
success "Script de backup criado"

# 12. Informações finais
echo ""
echo "=========================================="
success "🎉 Banco de dados configurado com sucesso!"
echo "=========================================="
echo ""
echo "📋 Informações de conexão:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASSWORD"
echo ""
echo "📁 Arquivos criados:"
echo "   - db_config.json (configuração alternativa)"
echo "   - .env (variáveis de ambiente)"
echo "   - backup_db.sh (script de backup)"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Execute as migrações: ./deploy_db.sh"
echo "   2. Teste a aplicação: cargo run"
echo "   3. Configure backup automático no cron"
echo ""
echo "💡 Para backup automático diário, adicione ao crontab:"
echo "   0 2 * * * cd $(pwd) && ./backup_db.sh"
echo ""
success "Configuração concluída! 🎊"
