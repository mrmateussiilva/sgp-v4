# 📊 Scripts de Banco de Dados

Este diretório contém os scripts SQL para configuração e manutenção do banco de dados.

## 📁 Arquivos

### `init.sql`
Script principal de inicialização do banco de dados.

**O que faz:**
- Cria as extensões necessárias (`uuid-ossp`)
- Cria as tabelas (`users`, `orders`, `order_items`)
- Define tipos ENUM (`order_status`)
- Insere dados de teste
- Cria triggers para atualização automática

**Quando usar:**
- Primeira configuração do banco
- Resetar o banco para estado inicial

**Como executar:**

```bash
# Via Docker (automático na primeira vez)
npm run docker:up

# Via terminal PostgreSQL
psql -U postgres -d sgp_database -f database/init.sql

# Via Docker (manual)
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/init.sql
```

### `migrate_timestamps.sql`
Script de migração para corrigir tipos de timestamp.

**O que faz:**
- Converte `TIMESTAMP` para `TIMESTAMPTZ` nas tabelas `users` e `orders`

**Quando usar:**
- Se você receber erro: `mismatched types; Rust type ... is not compatible with SQL type TIMESTAMP`
- Ao atualizar de versão antiga do banco

**Como executar:**

```bash
# Via Docker
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/migrate_timestamps.sql

# Via terminal PostgreSQL
psql -U postgres -d sgp_database -f database/migrate_timestamps.sql
```

### `fix_passwords.sql`
Script para corrigir/resetar senhas dos usuários de teste.

**O que faz:**
- Habilita extensão `pgcrypto`
- Gera novos hashes bcrypt para as senhas de teste
- Atualiza senhas dos usuários `admin` e `usuario`

**Quando usar:**
- Se receber erro: "Senha inválida" ao tentar fazer login
- Após resetar o banco de dados
- Se suspeitar que os hashes bcrypt estão incorretos

**Como executar:**

```bash
# Via Docker
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/fix_passwords.sql

# Via Docker (linha de comando)
docker-compose exec postgres psql -U postgres -d sgp_database -c "
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  UPDATE users SET password_hash = crypt('admin123', gen_salt('bf')) WHERE username = 'admin';
  UPDATE users SET password_hash = crypt('user123', gen_salt('bf')) WHERE username = 'usuario';
"
```

## 🔧 Comandos Úteis

### Acessar PostgreSQL

```bash
# Via Docker
npm run db:psql

# Direto (PostgreSQL instalado)
psql -U postgres -d sgp_database
```

### Comandos PostgreSQL Úteis

```sql
-- Listar bancos de dados
\l

-- Conectar ao banco
\c sgp_database

-- Listar tabelas
\dt

-- Descrever tabela
\d users
\d orders
\d order_items

-- Ver dados
SELECT * FROM users;
SELECT * FROM orders;

-- Contar registros
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;

-- Sair
\q
```

### Backup e Restore

```bash
# Fazer backup
docker-compose exec postgres pg_dump -U postgres sgp_database > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres -d sgp_database < backup_20241014.sql
```

### Resetar Banco de Dados

```bash
# Opção 1: Resetar container completo (mais seguro)
npm run docker:reset

# Opção 2: Recriar tabelas
docker-compose exec postgres psql -U postgres -d sgp_database -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/init.sql
```

## 🔍 Troubleshooting

### Erro: "database does not exist"

**Solução:**
```bash
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE sgp_database;"
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/init.sql
```

### Erro: "type order_status already exists"

**Solução:**
O script `init.sql` já trata isso. Se persistir:
```bash
docker-compose exec postgres psql -U postgres -d sgp_database -c "DROP TYPE IF EXISTS order_status CASCADE;"
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/init.sql
```

### Erro: "mismatched types ... TIMESTAMP"

**Solução:**
```bash
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/migrate_timestamps.sql
```

## 📝 Estrutura do Banco

### Tabela: `users`
```sql
- id: SERIAL PRIMARY KEY
- username: VARCHAR(50) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- created_at: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

### Tabela: `orders`
```sql
- id: SERIAL PRIMARY KEY
- customer_name: VARCHAR(255) NOT NULL
- address: TEXT NOT NULL
- total_value: DECIMAL(10, 2) NOT NULL
- created_at: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
- status: order_status DEFAULT 'Pendente'
```

### Tabela: `order_items`
```sql
- id: SERIAL PRIMARY KEY
- order_id: INTEGER REFERENCES orders(id) ON DELETE CASCADE
- item_name: VARCHAR(255) NOT NULL
- quantity: INTEGER NOT NULL CHECK (quantity > 0)
- unit_price: DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0)
- subtotal: DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0)
```

### Tipo ENUM: `order_status`
```sql
'Pendente' | 'Em Processamento' | 'Concluído' | 'Cancelado'
```

## 🔒 Credenciais de Teste

Usuários criados pelo `init.sql`:

| Usuário | Senha    | Hash (bcrypt) |
|---------|----------|---------------|
| admin   | admin123 | $2b$10$... |
| usuario | user123  | $2b$10$... |

## 📚 Referências

- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [PostgreSQL ENUM Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [PostgreSQL Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)

