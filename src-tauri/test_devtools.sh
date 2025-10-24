#!/bin/bash

# Script para testar a funcionalidade DevTools no build de produção
# Este script compila o projeto e testa se o DevTools está funcionando

echo "🔧 Testando funcionalidade DevTools no build de produção..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Verificar se estamos no diretório correto
if [ ! -f "Cargo.toml" ]; then
    print_error "Este script deve ser executado no diretório src-tauri"
    exit 1
fi

print_status "Diretório correto encontrado"

# Verificar se o Cargo.toml tem a feature devtools
if grep -q '"devtools"' Cargo.toml; then
    print_status "Feature 'devtools' encontrada no Cargo.toml"
else
    print_error "Feature 'devtools' não encontrada no Cargo.toml"
    exit 1
fi

# Verificar se o arquivo devtools.rs existe
if [ -f "src/commands/devtools.rs" ]; then
    print_status "Arquivo devtools.rs encontrado"
else
    print_error "Arquivo devtools.rs não encontrado"
    exit 1
fi

# Verificar se o tauri.conf.json tem as configurações corretas
if grep -q '"keyboardShortcuts"' tauri.conf.json; then
    print_status "Atalhos de teclado configurados no tauri.conf.json"
else
    print_error "Atalhos de teclado não configurados no tauri.conf.json"
    exit 1
fi

# Verificar se a janela tem label "main"
if grep -q '"label": "main"' tauri.conf.json; then
    print_status "Janela principal configurada com label 'main'"
else
    print_error "Janela principal não configurada com label 'main'"
    exit 1
fi

# Compilar o projeto em modo debug primeiro
print_warning "Compilando projeto em modo debug..."
if cargo build; then
    print_status "Compilação debug bem-sucedida"
else
    print_error "Falha na compilação debug"
    exit 1
fi

# Compilar o projeto em modo release
print_warning "Compilando projeto em modo release..."
if cargo build --release; then
    print_status "Compilação release bem-sucedida"
else
    print_error "Falha na compilação release"
    exit 1
fi

# Verificar se o binário foi criado
if [ -f "target/release/sgp-v4" ]; then
    print_status "Binário de produção criado com sucesso"
elif [ -f "target/release/sgp-v4.exe" ]; then
    print_status "Binário de produção Windows criado com sucesso"
else
    print_error "Binário de produção não encontrado"
    exit 1
fi

print_status "🎉 Todas as verificações passaram!"
print_warning "Para testar o DevTools:"
echo "  1. Execute o aplicativo: ./target/release/sgp-v4"
echo "  2. Pressione F12 ou Ctrl+Shift+I para abrir o DevTools"
echo "  3. Ou use os comandos Tauri:"
echo "     - invoke('open_devtools')"
echo "     - invoke('close_devtools')"
echo "     - invoke('toggle_devtools')"

print_warning "Nota: O DevTools só funcionará se o aplicativo for executado com as permissões adequadas"
