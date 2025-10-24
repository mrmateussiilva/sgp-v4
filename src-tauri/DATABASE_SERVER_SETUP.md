# 🗄️ Guia Completo: Configuração do Banco de Dados no Servidor

## 📋 Visão Geral

Este guia te ajudará a configurar o banco de dados PostgreSQL no servidor para o SGP v4.

## 🎯 Passos para Configurar o Banco no Servidor

### **1. Preparação do Servidor**

#### **1.1 Instalar PostgreSQL**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Verificar status
sudo systemctl status postgresql
```

#### **1.2 Configurar PostgreSQL**
```bash
# Acessar como usuário postgres
sudo -u postgres psql

# Criar usuário e banco
CREATE USER sgp_user WITH PASSWORD 'sua_senha_forte_aqui';
CREATE DATABASE sgp_production OWNER sgp_user;
GRANT ALL PRIVILEGES ON DATABASE sgp_production TO sgp_user;

# Sair do psql
\q
```

### **2. Configuração de Segurança**

#### **2.1 Configurar pg_hba.conf**
```bash
# Localizar arquivo de configuração
sudo find /etc -name "pg_hba.conf" 2>/dev/null

# Editar arquivo (exemplo para Ubuntu)
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Adicionar linha para permitir conexões do seu IP
# host    sgp_production    sgp_user    SEU_IP/32    md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

#### **2.2 Configurar postgresql.conf**
```bash
# Editar arquivo de configuração
sudo nano /etc/postgresql/14/main/postgresql.conf

# Configurações recomendadas:
listen_addresses = '*'  # ou IP específico
port = 5432
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
```

### **3. Configuração da Aplicação**

#### **3.1 Arquivo de Configuração (.env)**
```bash
# Criar arquivo .env no servidor
nano /opt/sgp-v4/.env

# Conteúdo do arquivo:
DATABASE_URL=postgresql://sgp_user:sua_senha_forte_aqui@localhost:5432/sgp_production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sgp_production
DB_USER=sgp_user
DB_PASSWORD=sua_senha_forte_aqui
DB_MAX_CONNECTIONS=10
SESSION_TIMEOUT_HOURS=24
CACHE_TTL_SECONDS=3600
RUN_MIGRATIONS=true
RUST_LOG=info
```

#### **3.2 Arquivo db_config.json**
```bash
# Criar arquivo de configuração alternativa
nano /opt/sgp-v4/db_config.json

# Conteúdo:
{
  "host": "localhost",
  "port": "5432",
  "user": "sgp_user",
  "password": "sua_senha_forte_aqui",
  "database": "sgp_production"
}
```

### **4. Executar Migrações**

#### **4.1 Usando Script Automático**
```bash
# Tornar executável
chmod +x /opt/sgp-v4/deploy_db.sh

# Executar deploy
cd /opt/sgp-v4
./deploy_db.sh
```

#### **4.2 Usando SQLx CLI**
```bash
# Instalar SQLx CLI
cargo install sqlx-cli

# Executar migrações
sqlx migrate run --database-url "postgresql://sgp_user:sua_senha_forte_aqui@localhost:5432/sgp_production"
```

#### **4.3 Usando a Aplicação**
```bash
# A aplicação executará migrações automaticamente na inicialização
# se RUN_MIGRATIONS=true no .env
```

### **5. Testar Conexão**

#### **5.1 Teste Manual**
```bash
# Conectar ao banco
psql -h localhost -U sgp_user -d sgp_production

# Verificar tabelas
\dt

# Sair
\q
```

#### **5.2 Teste via Aplicação**
```bash
# Executar aplicação e verificar logs
cd /opt/sgp-v4
./sgp-v4

# Logs esperados:
# ✅ Conexão com banco estabelecida!
# ✅ Migrações aplicadas com sucesso.
```

### **6. Configuração de Firewall**

#### **6.1 Ubuntu/Debian (UFW)**
```bash
# Permitir PostgreSQL
sudo ufw allow 5432/tcp

# Verificar status
sudo ufw status
```

#### **6.2 CentOS/RHEL (firewalld)**
```bash
# Permitir PostgreSQL
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload

# Verificar
sudo firewall-cmd --list-ports
```

### **7. Backup e Monitoramento**

#### **7.1 Script de Backup**
```bash
# Criar script de backup
nano /opt/sgp-v4/backup_db.sh

# Conteúdo:
#!/bin/bash
BACKUP_DIR="/opt/sgp-v4/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sgp_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U sgp_user -d sgp_production > $BACKUP_FILE

echo "Backup criado: $BACKUP_FILE"

# Tornar executável
chmod +x /opt/sgp-v4/backup_db.sh
```

#### **7.2 Cron para Backup Automático**
```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário às 2h
0 2 * * * /opt/sgp-v4/backup_db.sh
```

## 🔧 Scripts de Configuração Automática

### **Script Completo de Configuração**
```bash
#!/bin/bash
# configure_database.sh

set -e

echo "🗄️ Configurando banco de dados PostgreSQL para SGP v4..."

# 1. Instalar PostgreSQL
echo "📦 Instalando PostgreSQL..."
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 2. Iniciar serviço
echo "🚀 Iniciando PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Configurar banco
echo "⚙️ Configurando banco de dados..."
sudo -u postgres psql << EOF
CREATE USER sgp_user WITH PASSWORD 'Sgp2024!Strong';
CREATE DATABASE sgp_production OWNER sgp_user;
GRANT ALL PRIVILEGES ON DATABASE sgp_production TO sgp_user;
\q
EOF

# 4. Configurar acesso
echo "🔒 Configurando acesso..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# 5. Configurar firewall
echo "🔥 Configurando firewall..."
sudo ufw allow 5432/tcp

# 6. Reiniciar PostgreSQL
echo "🔄 Reiniciando PostgreSQL..."
sudo systemctl restart postgresql

# 7. Testar conexão
echo "🧪 Testando conexão..."
psql -h localhost -U sgp_user -d sgp_production -c "SELECT version();"

echo "✅ Banco de dados configurado com sucesso!"
echo "📋 Informações de conexão:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: sgp_production"
echo "   User: sgp_user"
echo "   Password: Sgp2024!Strong"
```

## 🚨 Troubleshooting

### **Problemas Comuns**

#### **1. Erro de Conexão**
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Testar conexão local
psql -h localhost -U sgp_user -d sgp_production
```

#### **2. Erro de Permissão**
```bash
# Verificar configuração pg_hba.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf

# Recriar usuário se necessário
sudo -u postgres psql << EOF
DROP USER IF EXISTS sgp_user;
CREATE USER sgp_user WITH PASSWORD 'Sgp2024!Strong';
GRANT ALL PRIVILEGES ON DATABASE sgp_production TO sgp_user;
\q
EOF
```

#### **3. Erro de Migração**
```bash
# Verificar se banco existe
sudo -u postgres psql -c "\l"

# Executar migrações manualmente
cd /opt/sgp-v4
sqlx migrate run --database-url "postgresql://sgp_user:Sgp2024!Strong@localhost:5432/sgp_production"
```

## 📊 Monitoramento

### **Comandos Úteis**
```bash
# Verificar conexões ativas
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Verificar tamanho do banco
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('sgp_production'));"

# Verificar tabelas
sudo -u postgres psql -d sgp_production -c "\dt"

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

## 🎯 Checklist Final

- [ ] PostgreSQL instalado e rodando
- [ ] Usuário e banco criados
- [ ] Configurações de segurança aplicadas
- [ ] Firewall configurado
- [ ] Arquivo .env configurado
- [ ] Migrações executadas
- [ ] Conexão testada
- [ ] Backup configurado
- [ ] Monitoramento ativo

## 🎉 Conclusão

Com estes passos, seu banco de dados PostgreSQL estará configurado e funcionando no servidor!

**Próximos passos:**
1. Execute o script de configuração
2. Teste a conexão
3. Execute as migrações
4. Configure backup automático
5. Monitore o desempenho

**Banco de dados pronto para produção!** 🚀
