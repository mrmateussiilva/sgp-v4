#!/usr/bin/env bash

# ===============================
# 🚀 Deploy automático do banco
# ===============================

set -e  # Para o script se der erro


# BANCO DE DADOS
# Ajuste conforme sua configuração do PostgreSQL
#DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sgp_database
DATABASE_URL=postgresql://postgres:MJs119629@192.168.15.4:5432/sgp
# Configurações
DEV_URL="postgres://postgres:postgres@localhost:5432/sgp_database"
PROD_URL="postgres://postgres:postgres@192.168.15.4:5432/sgp"

echo "======================================"
echo "🧩 Sincronizando banco de produção..."
echo "======================================"

# 1️⃣ Confere migrações pendentes em produção
echo "🔍 Verificando migrações pendentes..."
sqlx migrate info --database-url "$PROD_URL"

# 2️⃣ Executa migrações no banco de produção
echo "🚀 Aplicando migrações..."
sqlx migrate run --database-url "$PROD_URL"

# 3️⃣ Exibe status final
echo "✅ Migrações aplicadas com sucesso!"
echo "--------------------------------------"
sqlx migrate info --database-url "$PROD_URL"

echo "🏁 Banco de produção agora está igual ao de desenvolvimento."

