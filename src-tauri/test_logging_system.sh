#!/bin/bash

# Script para testar o sistema de logs no Windows
# Este script compila o projeto e testa o sistema de logs

echo "📋 Testando sistema de logs para Windows..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "Cargo.toml" ]; then
    print_error "Este script deve ser executado no diretório src-tauri"
    exit 1
fi

print_status "Diretório correto encontrado"

# Verificar dependências de logging
print_info "Verificando dependências de logging..."

if grep -q "tracing-appender" Cargo.toml; then
    print_status "tracing-appender encontrado"
else
    print_error "tracing-appender não encontrado no Cargo.toml"
    exit 1
fi

if grep -q "env_logger" Cargo.toml; then
    print_status "env_logger encontrado"
else
    print_error "env_logger não encontrado no Cargo.toml"
    exit 1
fi

# Verificar arquivos de logging
if [ -f "src/logging.rs" ]; then
    print_status "Arquivo logging.rs encontrado"
else
    print_error "Arquivo logging.rs não encontrado"
    exit 1
fi

if [ -f "src/commands/logs.rs" ]; then
    print_status "Arquivo commands/logs.rs encontrado"
else
    print_error "Arquivo commands/logs.rs não encontrado"
    exit 1
fi

if [ -f "logging.env.example" ]; then
    print_status "Arquivo logging.env.example encontrado"
else
    print_error "Arquivo logging.env.example não encontrado"
    exit 1
fi

# Criar arquivo de configuração de logs para teste
print_info "Criando configuração de logs para teste..."
cat > logging.env << EOF
LOG_LEVEL=debug
LOG_FILE_PATH=logs/sgp_test.log
LOG_MAX_FILES=5
LOG_MAX_SIZE_MB=5
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_ENABLE_JSON=false
EOF

print_status "Arquivo logging.env criado"

# Compilar o projeto
print_warning "Compilando projeto..."
if cargo build --release; then
    print_status "Compilação bem-sucedida"
else
    print_error "Falha na compilação"
    exit 1
fi

# Verificar se o binário foi criado
if [ -f "target/release/sgp-v4.exe" ]; then
    print_status "Binário de produção criado"
else
    print_error "Binário de produção não encontrado"
    exit 1
fi

# Criar diretório de logs se não existir
mkdir -p logs
print_status "Diretório de logs criado"

print_status "🎉 Sistema de logs configurado com sucesso!"
echo ""
print_info "📋 Funcionalidades disponíveis:"
echo "   • Logs estruturados com diferentes níveis (debug, info, warn, error)"
echo "   • Rotação automática de logs por dia"
echo "   • Limite de arquivos e tamanho configurável"
echo "   • Logs tanto no console quanto em arquivo"
echo "   • Formato JSON opcional"
echo "   • Comandos Tauri para gerenciar logs"
echo ""
print_info "🚀 Comandos Tauri disponíveis:"
echo "   • get_log_stats() - Estatísticas dos logs"
echo "   • get_log_files() - Lista arquivos de log"
echo "   • get_log_content(file) - Conteúdo de arquivo específico"
echo "   • get_recent_logs(lines) - Últimas N linhas"
echo "   • search_logs(query) - Pesquisar nos logs"
echo "   • clear_logs() - Limpar todos os logs"
echo "   • test_logging_system() - Testar sistema"
echo ""
print_info "📁 Arquivos de log serão salvos em: logs/"
print_info "⚙️  Configure LOG_LEVEL, LOG_FILE_PATH, etc. no arquivo logging.env"
echo ""
print_warning "Para testar:"
echo "  1. Execute: target/release/sgp-v4.exe"
echo "  2. Use os comandos Tauri no frontend"
echo "  3. Verifique os arquivos em logs/"
echo ""
print_warning "Para desenvolvimento, use LOG_LEVEL=debug"
print_warning "Para produção, use LOG_LEVEL=info e LOG_ENABLE_CONSOLE=false"
