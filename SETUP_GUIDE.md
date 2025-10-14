# Guia Rápido de Configuração - SGP v4

Este é um guia simplificado para configurar e executar o projeto pela primeira vez.

## ✅ Pré-requisitos

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Rust** - [Download](https://www.rust-lang.org/tools/install)
3. **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)

## 🚀 Instalação em 5 Passos

### 1️⃣ Instalar PostgreSQL

**Linux (Arch):**
```bash
sudo pacman -S postgresql
sudo -u postgres initdb -D /var/lib/postgres/data
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
- Baixe e instale do site oficial

### 2️⃣ Criar Banco de Dados

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar banco (no console PostgreSQL)
CREATE DATABASE sgp_database;

# Sair
\q

# Executar script de inicialização
psql -U postgres -d sgp_database -f database/init.sql
```

### 3️⃣ Configurar Variáveis de Ambiente

Crie o arquivo `src-tauri/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sgp_database
APP_ENV=development
```

**⚠️ Importante:** Altere a senha se necessário!

### 4️⃣ Instalar Dependências

```bash
# Instalar dependências Node
npm install

# No Linux, instalar dependências do sistema
# Ubuntu/Debian:
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Arch:
sudo pacman -S webkit2gtk base-devel curl wget openssl gtk3 libappindicator-gtk3 librsvg
```

### 5️⃣ Executar o Projeto

```bash
npm run tauri:dev
```

## 🔐 Login

Use as credenciais de teste:

- **Usuário:** `admin` | **Senha:** `admin123`
- **Usuário:** `usuario` | **Senha:** `user123`

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run tauri:dev        # Executar app desktop
npm run dev              # Executar apenas frontend

# Build
npm run tauri:build      # Criar executável

# Testes
npm test                 # Executar testes
npm run lint             # Verificar código
```

## ❌ Problemas Comuns

### PostgreSQL não conecta

**Solução:**
```bash
# Verificar status
sudo systemctl status postgresql

# Iniciar serviço
sudo systemctl start postgresql

# Testar conexão
psql -U postgres -d sgp_database
```

### Erro ao compilar Rust

**Solução:**
```bash
# Atualizar Rust
rustup update

# Limpar cache
cd src-tauri
cargo clean
cd ..
```

### Porta 1420 em uso

**Solução:** Mude a porta em `vite.config.ts` e `tauri.conf.json`

## 📚 Documentação Completa

Para instruções detalhadas, consulte o [README.md](README.md)

---

**Pronto! 🎉** O sistema deve estar rodando agora!

