#!/bin/bash

# Script de build para o SGP v4
# Este script compila o aplicativo Tauri e prepara para distribuição

set -e

echo "🚀 Iniciando build do SGP v4..."

# Verificar se estamos no diretório correto
if [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ Erro: Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Aviso: Arquivo .env não encontrado"
    echo "📋 Copiando arquivo de exemplo..."
    cp env.example .env
    echo "✅ Arquivo .env criado a partir do exemplo"
    echo "🔧 Configure o arquivo .env com suas credenciais antes de executar o aplicativo"
fi

# Instalar dependências do frontend
echo "📦 Instalando dependências do frontend..."
npm install

# Build do frontend
echo "🏗️  Fazendo build do frontend..."
npm run build

# Build do backend (Tauri)
echo "🔨 Compilando aplicativo Tauri..."
cd src-tauri
cargo build --release
cd ..

echo "✅ Build concluído com sucesso!"
echo ""
echo "📁 Executável gerado em: src-tauri/target/release/"
echo "📋 Arquivo de configuração: .env"
echo ""
echo "🚀 Para executar o aplicativo:"
echo "   1. Configure o arquivo .env com suas credenciais do banco"
echo "   2. Execute o arquivo executável gerado"
echo ""
echo "💡 Dica: O aplicativo lerá automaticamente as configurações do arquivo .env"
