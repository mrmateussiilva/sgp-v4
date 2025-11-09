# 🐳 Guia Docker - PostgreSQL

Este guia explica como usar o Docker para rodar o PostgreSQL do projeto SGP v4.

## 📋 Pré-requisitos

- Docker instalado ([Instalar Docker](https://docs.docker.com/get-docker/))
- Docker Compose instalado (já vem com Docker Desktop)

## 🚀 Início Rápido

### 1. Copiar arquivo de configuração

```bash
cp src-tauri/.env.example src-tauri/.env
```

### 2. Iniciar o banco de dados

```bash
# Iniciar apenas o PostgreSQL
docker-compose up -d

# OU iniciar com PgAdmin (interface web)
docker-compose --profile tools up -d
```

### 3. Verificar se está rodando

```bash
docker-compose ps
```

Você deve ver:
```
NAME                IMAGE                    STATUS
sgp_postgres        postgres:15-alpine       Up
```

## 🔧 Comandos Úteis

### Gerenciar Containers

```bash
# Iniciar containers
docker-compose up -d

# Parar containers
docker-compose stop

# Parar e remover containers
docker-compose down

# Parar e remover containers + volumes (⚠️ APAGA OS DADOS!)
docker-compose down -v
```

### Ver Logs

```bash
# Ver logs do PostgreSQL
docker-compose logs postgres

# Ver logs em tempo real
docker-compose logs -f postgres
```

### Acessar o PostgreSQL

```bash
# Via terminal
docker-compose exec postgres psql -U postgres -d sgp_database

# Comandos úteis dentro do psql:
# \dt          - listar tabelas
# \d tabela    - descrever tabela
# \q           - sair
```

### Backup e Restore

```bash
# Fazer backup
docker-compose exec postgres pg_dump -U postgres sgp_database > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres -d sgp_database < backup.sql
```

## 🌐 PgAdmin (Interface Web)

O PgAdmin é uma interface web opcional para gerenciar o banco de dados.

### Iniciar com PgAdmin

```bash
docker-compose --profile tools up -d
```

### Acessar PgAdmin

1. Abra o navegador em: http://localhost:5050
2. Login:
   - Email: `admin@sgp.local`
   - Senha: `admin`

### Conectar ao PostgreSQL no PgAdmin

1. Clique em "Add New Server"
2. Aba **General**:
   - Name: `SGP Local`
3. Aba **Connection**:
   - Host: `postgres` (nome do container)
   - Port: `5432`
   - Database: `sgp_database`
   - Username: `postgres`
   - Password: `postgres`
4. Clique em "Save"

## 🔍 Verificação de Saúde

O PostgreSQL tem um healthcheck configurado. Para verificar:

```bash
docker-compose ps
```

O status deve ser **healthy** após alguns segundos.

## 📊 Dados e Volumes

Os dados do PostgreSQL são armazenados em um volume Docker persistente:

```bash
# Ver volumes
docker volume ls | grep sgp

# Informações do volume
docker volume inspect sgp_v4_postgres_data
```

### ⚠️ Resetar Banco de Dados

Para começar com banco limpo:

```bash
# Para e remove containers e volumes
docker-compose down -v

# Inicia novamente (vai recriar o banco)
docker-compose up -d
```

O script `init.sql` será executado automaticamente na primeira inicialização.

## 🐛 Troubleshooting

**📖 Guia completo:** Veja [TROUBLESHOOTING.md](TROUBLESHOOTING.md#-problemas-com-docker) para soluções detalhadas.

### Porta 5432 já está em uso

Se você tem PostgreSQL instalado localmente:

**Opção 1:** Parar o PostgreSQL local
```bash
# Linux
sudo systemctl stop postgresql

# macOS
brew services stop postgresql
```

**Opção 2:** Mudar a porta no `docker-compose.yml`
```yaml
ports:
  - "5433:5432"  # Usar porta 5433 no host
```

E atualizar o `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sgp_database
```

### Erro de tipo TIMESTAMP

Se receber erro sobre tipos incompatíveis:
```bash
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/migrate_timestamps.sql
```

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs postgres

# Remover e recriar
docker-compose down
docker-compose up -d
```

### Erro de conexão no app

1. Verifique se o container está rodando:
   ```bash
   docker-compose ps
   ```

2. Verifique se o `.env` está correto:
   ```bash
   cat src-tauri/.env
   ```

3. Teste a conexão manualmente:
   ```bash
   docker-compose exec postgres psql -U postgres -d sgp_database
   ```

## 📝 Configurações

### Credenciais Padrão

- **Usuário:** postgres
- **Senha:** postgres
- **Banco:** sgp_database
- **Porta:** 5432

### Arquivos Importantes

- `docker-compose.yml` - Configuração dos containers
- `src-tauri/.env` - Variáveis de ambiente da aplicação
- `database/init.sql` - Script de inicialização do banco

## 🔒 Segurança em Produção

⚠️ **Para produção, altere:**

1. Senha do PostgreSQL
2. Credenciais do PgAdmin
3. Use secrets do Docker
4. Configure SSL/TLS

## 📚 Referências

- [Docker Compose - PostgreSQL](https://hub.docker.com/_/postgres)
- [PgAdmin Container](https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html)

---

**Pronto para desenvolver!** 🚀

Execute `pnpm tauri dev` após iniciar o banco de dados.

