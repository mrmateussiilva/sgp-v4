# Configuração de Variáveis de Ambiente

## Arquivo: `src-tauri/.env`

Crie o arquivo `.env` dentro da pasta `src-tauri/` com o seguinte conteúdo:

```env
# ========================================
# CONFIGURAÇÃO DO BANCO DE DADOS
# ========================================

# String de conexão do PostgreSQL
# Formato: postgresql://usuario:senha@host:porta/banco
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sgp_database

# ========================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ========================================

# Ambiente de execução (development, production)
APP_ENV=development
```

## 📝 Personalização

### Opção 1: Usando usuário padrão do PostgreSQL

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/sgp_database
```

**⚠️ Importante:** Substitua `SUA_SENHA_AQUI` pela senha real do usuário `postgres`.

### Opção 2: Usando usuário personalizado

Se você criou um usuário específico para o app:

```env
DATABASE_URL=postgresql://sgp_user:senha_segura@localhost:5432/sgp_database
```

### Opção 3: Servidor PostgreSQL remoto

Para conectar a um servidor PostgreSQL remoto:

```env
DATABASE_URL=postgresql://usuario:senha@192.168.1.100:5432/sgp_database
```

## 🔧 Como Descobrir sua Senha do PostgreSQL

### No Linux/macOS:

Se você acabou de instalar e não definiu senha:

```bash
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'nova_senha';
\q
```

### No Windows:

A senha foi definida durante a instalação. Se esqueceu:

1. Abra o pgAdmin
2. Clique com botão direito em "PostgreSQL"
3. Properties → General → Password

## ✅ Verificar Conexão

Teste se a string de conexão está correta:

```bash
# Substitua com seus dados
psql -U postgres -h localhost -d sgp_database

# Se conectou com sucesso, a configuração está correta!
\q
```

## 🔒 Segurança

### ⚠️ NUNCA faça commit do arquivo `.env`!

O arquivo `.env` está no `.gitignore` e **não deve** ser versionado.

### ✅ Boas práticas:

1. **Desenvolvimento:** Use `.env` local
2. **Produção:** Use variáveis de ambiente do sistema
3. **Senha forte:** Use senhas complexas em produção
4. **Backup:** Documente as configurações (sem senhas) em local seguro

## 📋 Template Completo

Copie e cole no arquivo `src-tauri/.env`:

```env
# ========================================
# SGP v4 - Configuração de Ambiente
# ========================================

# BANCO DE DADOS
# Ajuste conforme sua configuração do PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sgp_database

# APLICAÇÃO
APP_ENV=development

# CONFIGURAÇÕES ADICIONAIS (opcional)
# RUST_LOG=info
# RUST_BACKTRACE=1
```

## 🆘 Problemas Comuns

### Erro: "DATABASE_URL não definida"

**Solução:** Certifique-se de que o arquivo `.env` está em `src-tauri/.env` (não na raiz do projeto).

### Erro: "connection refused"

**Solução:** 
1. Verifique se PostgreSQL está rodando: `sudo systemctl status postgresql`
2. Verifique o host e porta na string de conexão

### Erro: "authentication failed"

**Solução:** Verifique usuário e senha na string de conexão.

### Erro: "database does not exist"

**Solução:** 
```bash
sudo -u postgres psql
CREATE DATABASE sgp_database;
\q
```

## 📚 Referências

- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Tauri Environment Variables](https://tauri.app/v1/guides/building/env-variables)

---

**Após configurar o `.env`, execute:**

```bash
npm run tauri:dev
```

