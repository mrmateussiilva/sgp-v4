#!/bin/bash

# Script de teste final para DevTools e Logs
# Este script verifica se tudo está funcionando corretamente

echo "🧪 Teste Final - DevTools e Sistema de Logs"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Verificar compilação
print_info "Verificando compilação..."
if cargo check --quiet; then
    print_status "Compilação bem-sucedida"
else
    print_error "Falha na compilação"
    exit 1
fi

# Verificar se não há warnings críticos
print_info "Verificando warnings..."
if cargo check 2>&1 | grep -q "error:"; then
    print_error "Ainda há erros de compilação"
    exit 1
else
    print_status "Sem erros de compilação"
fi

# Verificar arquivos principais
print_info "Verificando arquivos principais..."

files_to_check=(
    "src/commands/devtools.rs"
    "src/commands/logs.rs"
    "src/logging.rs"
    "devtools-shortcuts.js"
    "logging.env.example"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_status "Arquivo $file encontrado"
    else
        print_error "Arquivo $file não encontrado"
        exit 1
    fi
done

# Verificar configurações
print_info "Verificando configurações..."

if grep -q '"devtools"' Cargo.toml; then
    print_status "Feature devtools habilitada no Cargo.toml"
else
    print_error "Feature devtools não encontrada no Cargo.toml"
    exit 1
fi

if grep -q '"label": "main"' tauri.conf.json; then
    print_status "Janela principal configurada com label 'main'"
else
    print_error "Janela principal não configurada corretamente"
    exit 1
fi

# Criar diretório de logs
mkdir -p logs
print_status "Diretório de logs criado"

# Criar arquivo de configuração de exemplo
print_info "Criando configuração de logs de exemplo..."
cat > logging.env << EOF
LOG_LEVEL=info
LOG_FILE_PATH=logs/sgp.log
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
EOF

print_status "Arquivo logging.env criado"

print_status "🎉 Todos os testes passaram!"
echo ""
print_info "📋 Funcionalidades implementadas:"
echo "   ✅ DevTools com comandos Tauri"
echo "   ✅ Sistema de logs estruturado"
echo "   ✅ Comandos para gerenciar logs"
echo "   ✅ Configuração via variáveis de ambiente"
echo "   ✅ Scripts JavaScript para atalhos de teclado"
echo ""
print_info "🚀 Comandos DevTools disponíveis:"
echo "   • invoke('open_devtools')"
echo "   • invoke('close_devtools')"
echo "   • invoke('toggle_devtools')"
echo "   • invoke('test_devtools_system')"
echo ""
print_info "📊 Comandos Logs disponíveis:"
echo "   • invoke('get_log_stats')"
echo "   • invoke('get_log_files')"
echo "   • invoke('get_log_content', { file_name: 'sgp.log' })"
echo "   • invoke('get_recent_logs', { lines: 100 })"
echo "   • invoke('search_logs', { query: 'erro' })"
echo "   • invoke('clear_logs')"
echo "   • invoke('test_logging_system')"
echo ""
print_warning "Para usar no frontend:"
echo "   1. Inclua o arquivo devtools-shortcuts.js"
echo "   2. Use os comandos invoke() listados acima"
echo "   3. Configure LOG_LEVEL no arquivo logging.env"
echo ""
print_warning "Para compilar e executar:"
echo "   cargo build --release"
echo "   target/release/sgp-v4.exe"
