#!/bin/bash

# Script de instalação e configuração do SGP v4
# Este script instala o aplicativo e configura o arquivo .env

set -e

echo "🚀 Instalando SGP v4..."

# Verificar se estamos executando como root para instalação do sistema
if [ "$EUID" -eq 0 ]; then
    echo "📦 Instalando aplicativo no sistema..."
    
    # Instalar o pacote DEB
    if [ -f "sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_amd64.deb" ]; then
        dpkg -i sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_amd64.deb
        echo "✅ Aplicativo instalado com sucesso!"
    else
        echo "❌ Arquivo .deb não encontrado!"
        exit 1
    fi
    
    # Criar diretório de configuração
    mkdir -p /opt/sgp-sistema-de-gerenciamento-de-pedidos
    
    echo "📋 Configuração do banco de dados:"
    echo "   O arquivo .env deve ser colocado em um dos seguintes locais:"
    echo "   1. /opt/sgp-sistema-de-gerenciamento-de-pedidos/.env"
    echo "   2. ~/.sgp/.env"
    echo "   3. ~/.config/sgp/.env"
    echo "   4. Diretório onde o aplicativo é executado"
    
else
    echo "👤 Instalação para usuário atual..."
    
    # Criar diretórios de configuração do usuário
    mkdir -p ~/.sgp
    mkdir -p ~/.config/sgp
    mkdir -p ~/.local/share/sgp
    
    echo "📋 Configuração do banco de dados:"
    echo "   O arquivo .env deve ser colocado em um dos seguintes locais:"
    echo "   1. ~/.sgp/.env"
    echo "   2. ~/.config/sgp/.env"
    echo "   3. ~/.local/share/sgp/.env"
    echo "   4. Diretório onde o aplicativo é executado"
fi

echo ""
echo "🔧 Para configurar o banco de dados:"
echo "   1. Copie o arquivo env.example para .env"
echo "   2. Configure suas credenciais do PostgreSQL"
echo "   3. Coloque o arquivo .env em um dos locais listados acima"
echo ""
echo "📄 Exemplo de configuração (.env):"
echo "   DATABASE_URL=postgresql://usuario:senha@localhost:5432/sgp_v4"
echo ""
echo "✅ Instalação concluída!"
echo "🚀 Execute: sgp-sistema-de-gerenciamento-de-pedidos"
