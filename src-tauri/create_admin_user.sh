#!/bin/bash

# Script para criar usuário admin no SGP
# Uso: ./create_admin_user.sh

echo "=== Criador de Usuário Admin - SGP ==="
echo

# Configurações do banco
DB_HOST="192.168.15.9"
DB_PORT="5432"
DB_NAME="sgp"
DB_USER="postgres"
DB_PASSWORD="MJs119629"

# Solicitar dados do usuário
echo "Digite os dados do usuário admin:"
echo
read -p "Nome de usuário: " USERNAME
read -s -p "Senha: " PASSWORD
echo
read -s -p "Confirme a senha: " PASSWORD_CONFIRM
echo

# Verificar se as senhas coincidem
if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
    echo "❌ Erro: As senhas não coincidem!"
    exit 1
fi

# Verificar se o usuário já existe
echo "Verificando se o usuário já existe..."
USER_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE username = '$USERNAME';" 2>/dev/null | tr -d ' ')

if [ "$USER_EXISTS" -gt 0 ]; then
    echo "❌ Erro: O usuário '$USERNAME' já existe!"
    exit 1
fi

echo "✅ Usuário '$USERNAME' disponível."

# Gerar hash da senha usando bcrypt
echo "Gerando hash da senha..."
PASSWORD_HASH=$(python3 -c "
import bcrypt
password = '$PASSWORD'
salt = bcrypt.gensalt()
hash = bcrypt.hashpw(password.encode('utf-8'), salt)
print(hash.decode('utf-8'))
" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Erro: Falha ao gerar hash da senha. Instale o Python e bcrypt: pip install bcrypt"
    exit 1
fi

echo "✅ Hash da senha gerado."

# Inserir usuário no banco
echo "Criando usuário no banco de dados..."
RESULT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO users (username, password_hash, is_admin) 
VALUES ('$USERNAME', '$PASSWORD_HASH', TRUE)
RETURNING id, username, is_admin, created_at;
" 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ Usuário admin criado com sucesso!"
    echo
    echo "Detalhes do usuário:"
    echo "$RESULT" | grep -E "^[[:space:]]*[0-9]+"
    echo
    echo "🎉 Você pode agora fazer login com:"
    echo "   Usuário: $USERNAME"
    echo "   Senha: [a senha que você digitou]"
else
    echo "❌ Erro ao criar usuário:"
    echo "$RESULT"
    exit 1
fi

