#!/bin/bash

echo "🔍 Verificando compilação do SGP v4..."

# Verificar se estamos no diretório correto
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Erro: Execute este script no diretório src-tauri do projeto"
    exit 1
fi

echo "📦 Executando cargo check..."
cargo check

if [ $? -eq 0 ]; then
    echo "✅ Compilação bem-sucedida!"
    echo ""
    echo "🚀 Pronto para executar com migrações:"
    echo "   RUN_MIGRATIONS=true cargo run"
else
    echo "❌ Erros de compilação encontrados"
    echo "   Verifique os logs acima para detalhes"
    exit 1
fi
