#!/bin/bash
# Script temporário para gerar hash bcrypt

docker exec -i sgp_postgres psql -U postgres -d sgp -c "DELETE FROM users WHERE username = 'admin';"

# Criar admin usando a interface da aplicação
echo "Usuário admin deletado. Use a interface para criar um novo usuário admin!"
echo ""
echo "Ou use este comando SQL com hash gerado pelo Python:"
python3 -c "import bcrypt; print(bcrypt.hashpw(b'admin', bcrypt.gensalt()).decode())"

