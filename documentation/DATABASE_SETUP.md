# Configuração do Banco de Dados PostgreSQL

Guia detalhado para instalar e configurar o PostgreSQL para o SGP v4.

## 📦 Instalação do PostgreSQL

### Windows

1. **Download:**
   - Acesse: https://www.postgresql.org/download/windows/
   - Baixe o instalador (versão 14 ou superior)

2. **Instalação:**
   - Execute o instalador
   - Defina uma senha para o usuário `postgres` (anote essa senha!)
   - Porta padrão: `5432`
   - Marque a opção para incluir o pgAdmin (interface gráfica)

3. **Verificação:**
   ```cmd
   # No prompt de comando (CMD)
   psql --version
   ```

### macOS

1. **Instalação via Homebrew:**
   ```bash
   brew install postgresql@14
   ```

2. **Iniciar serviço:**
   ```bash
   brew services start postgresql@14
   ```

3. **Verificação:**
   ```bash
   psql --version
   ```

### Linux (Ubuntu/Debian)

1. **Instalação:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Iniciar serviço:**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. **Verificação:**
   ```bash
   psql --version
   sudo systemctl status postgresql
   ```

### Linux (Arch)

1. **Instalação:**
   ```bash
   sudo pacman -S postgresql
   ```

2. **Inicializar banco:**
   ```bash
   sudo -u postgres initdb -D /var/lib/postgres/data
   ```

3. **Iniciar serviço:**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

4. **Verificação:**
   ```bash
   psql --version
   sudo systemctl status postgresql
   ```

## 🔧 Configuração do Banco de Dados

### Passo 1: Acessar PostgreSQL

**Linux/macOS:**
```bash
sudo -u postgres psql
```

**Windows:**
```cmd
psql -U postgres
```

### Passo 2: Criar Banco de Dados

No console do PostgreSQL (`postgres=#`):

```sql
-- Criar banco de dados
CREATE DATABASE sgp_database;

-- Verificar criação
\l

-- Conectar ao banco
\c sgp_database

-- Sair
\q
```

### Passo 3: Executar Script de Inicialização

**Linux/macOS:**
```bash
psql -U postgres -d sgp_database -f database/init.sql
```

**Windows (PowerShell):**
```powershell
psql -U postgres -d sgp_database -f database\init.sql
```

### Passo 4: Verificar Tabelas

```bash
psql -U postgres -d sgp_database
```

No console PostgreSQL:
```sql
-- Listar tabelas
\dt

-- Ver estrutura de uma tabela
\d orders

-- Contar registros
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM users;

-- Sair
\q
```

## 🔐 Configurar Senha do PostgreSQL

### Alterar senha do usuário postgres

```bash
sudo -u postgres psql
```

```sql
ALTER USER postgres WITH PASSWORD 'nova_senha_segura';
\q
```

### Criar usuário específico para o app

```sql
CREATE USER sgp_user WITH PASSWORD 'senha_segura';
GRANT ALL PRIVILEGES ON DATABASE sgp_database TO sgp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sgp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sgp_user;
\q
```

## 📝 String de Conexão

Configure no arquivo `src-tauri/.env`:

### Usando usuário postgres:
```env
DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/sgp_database
```

### Usando usuário específico:
```env
DATABASE_URL=postgresql://sgp_user:senha_segura@localhost:5432/sgp_database
```

### Para servidor remoto:
```env
DATABASE_URL=postgresql://usuario:senha@ip_servidor:5432/sgp_database
```

## 🗂️ Estrutura do Banco de Dados

### Tabelas

1. **users** - Usuários do sistema
   - `id` (SERIAL PRIMARY KEY)
   - `username` (VARCHAR UNIQUE)
   - `password_hash` (VARCHAR)
   - `created_at` (TIMESTAMP)

2. **orders** - Pedidos
   - `id` (SERIAL PRIMARY KEY)
   - `customer_name` (VARCHAR)
   - `address` (TEXT)
   - `total_value` (DECIMAL)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)
   - `status` (ENUM: Pendente, Em Processamento, Concluído, Cancelado)

3. **order_items** - Itens dos pedidos
   - `id` (SERIAL PRIMARY KEY)
   - `order_id` (INTEGER FK → orders.id)
   - `item_name` (VARCHAR)
   - `quantity` (INTEGER)
   - `unit_price` (DECIMAL)
   - `subtotal` (DECIMAL)

## 🔍 Comandos Úteis do PostgreSQL

### Console PostgreSQL (`psql`)

```sql
-- Listar bancos de dados
\l

-- Conectar a um banco
\c nome_do_banco

-- Listar tabelas
\dt

-- Descrever tabela
\d nome_tabela

-- Listar usuários
\du

-- Executar arquivo SQL
\i caminho/para/arquivo.sql

-- Sair
\q
```

### Linha de Comando

```bash
# Ver versão
psql --version

# Conectar ao banco
psql -U usuario -d banco

# Executar SQL de arquivo
psql -U usuario -d banco -f script.sql

# Backup
pg_dump -U postgres sgp_database > backup.sql

# Restore
psql -U postgres -d sgp_database < backup.sql
```

## 🛠️ Solução de Problemas

### Erro: "role 'postgres' does not exist"

**Solução (Linux):**
```bash
sudo -u postgres createuser -s postgres
```

### Erro: "connection refused"

**Verificar se PostgreSQL está rodando:**
```bash
# Linux
sudo systemctl status postgresql
sudo systemctl start postgresql

# macOS
brew services list
brew services start postgresql@14
```

### Erro: "authentication failed"

1. Verifique a senha no `.env`
2. Resete a senha:
   ```bash
   sudo -u postgres psql
   ALTER USER postgres WITH PASSWORD 'nova_senha';
   \q
   ```

### Erro: "database does not exist"

```bash
sudo -u postgres psql
CREATE DATABASE sgp_database;
\q
```

### Problemas com permissões

```sql
GRANT ALL PRIVILEGES ON DATABASE sgp_database TO seu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seu_usuario;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO seu_usuario;
```

## 🔄 Reset Completo do Banco

**⚠️ CUIDADO: Isso apagará todos os dados!**

```bash
# Conectar ao PostgreSQL
sudo -u postgres psql

# No console PostgreSQL:
DROP DATABASE IF EXISTS sgp_database;
CREATE DATABASE sgp_database;
\c sgp_database
\i database/init.sql
\q
```

## 📊 Consultas Úteis

### Ver todos os pedidos com itens

```sql
SELECT 
    o.id,
    o.customer_name,
    o.status,
    o.total_value,
    COUNT(oi.id) as total_items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id
ORDER BY o.created_at DESC;
```

### Ver pedidos por status

```sql
SELECT status, COUNT(*) as total
FROM orders
GROUP BY status
ORDER BY total DESC;
```

### Ver valor total de vendas

```sql
SELECT 
    SUM(total_value) as valor_total,
    COUNT(*) as total_pedidos,
    AVG(total_value) as ticket_medio
FROM orders
WHERE status != 'Cancelado';
```

## 🔒 Segurança

### Boas práticas:

1. **Nunca use senha padrão em produção**
2. **Crie usuário específico para a aplicação**
3. **Use SSL para conexões remotas**
4. **Faça backups regulares**
5. **Limite permissões do usuário do app**

### Configurar SSL (produção):

No `postgresql.conf`:
```
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

String de conexão com SSL:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

## 📚 Recursos Adicionais

- [Documentação Oficial PostgreSQL](https://www.postgresql.org/docs/)
- [Tutorial PostgreSQL](https://www.postgresqltutorial.com/)
- [pgAdmin - Interface Gráfica](https://www.pgadmin.org/)

---

**Dúvidas?** Consulte a documentação oficial ou abra uma issue no repositório.

