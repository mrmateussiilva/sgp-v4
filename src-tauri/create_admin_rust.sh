#!/bin/bash

# Script para criar usuário admin usando Rust
echo "=== Criador de Usuário Admin - SGP (Rust) ==="
echo

# Verificar se o Rust está instalado
if ! command -v cargo &> /dev/null; then
    echo "❌ Erro: Cargo não encontrado. Instale o Rust primeiro."
    exit 1
fi

# Compilar o script
echo "Compilando o criador de usuário..."
cargo run --manifest-path create_admin_user_Cargo.toml --bin create_admin_user

echo
echo "Script executado!"
