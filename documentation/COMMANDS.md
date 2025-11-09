# 🔧 Comandos Úteis - SGP v4

Referência rápida de todos os comandos disponíveis no projeto.

## 📦 Instalação

```bash
# Instalar todas as dependências
npm install

# Instalar dependências e limpar cache
npm cache clean --force && npm install
```

## 🚀 Desenvolvimento

### Executar Aplicação

```bash
# Modo desenvolvimento completo (Tauri + Frontend)
npm run tauri:dev

# Apenas frontend (navegador)
npm run dev

# Preview da build de produção
npm run preview
```

### Build

```bash
# Build do frontend
npm run build

# Build do executável desktop
npm run tauri:build

# Build com log detalhado
npm run tauri:build -- --verbose
```

## 🐳 Docker (PostgreSQL)

```bash
# Iniciar banco de dados
npm run docker:up

# Parar banco de dados
npm run docker:down

# Ver logs do PostgreSQL
npm run docker:logs

# Resetar banco (APAGA DADOS!)
npm run docker:reset

# Iniciar com pgAdmin (interface web)
npm run docker:pgadmin

# Acessar PostgreSQL via terminal
npm run db:psql
```

### Comandos Docker Diretos

```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Parar e remover volumes
docker-compose down -v

# Reconstruir imagens
docker-compose up -d --build

# Acessar shell do container PostgreSQL
docker-compose exec postgres bash
```

## 🗄️ Banco de Dados

### PostgreSQL Local

```bash
# Iniciar serviço (Linux)
sudo systemctl start postgresql

# Parar serviço (Linux)
sudo systemctl stop postgresql

# Status do serviço (Linux)
sudo systemctl status postgresql

# Iniciar serviço (macOS)
brew services start postgresql@14

# Acessar PostgreSQL
psql -U postgres

# Conectar ao banco SGP
psql -U postgres -d sgp_database

# Executar script SQL
psql -U postgres -d sgp_database -f database/init.sql
```

### Comandos SQL Úteis

```sql
-- Listar bancos de dados
\l

-- Conectar a um banco
\c sgp_database

-- Listar tabelas
\dt

-- Descrever tabela
\d orders

-- Ver usuários
\du

-- Sair
\q
```

### Scripts de Migração

```bash
# Executar migração de timestamps
psql -U postgres -d sgp_database -f database/migrate_timestamps.sql

# Corrigir senhas
psql -U postgres -d sgp_database -f database/fix_passwords.sql
```

## 🧪 Testes e Qualidade

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com cobertura
npm run test:coverage

# Verificar erros de lint
npm run lint

# Formatar código
npm run format

# Verificar formatação sem modificar
npm run format:check
```

## 🎨 Shadcn UI

```bash
# Adicionar novo componente
npx shadcn-ui@latest add [component-name]

# Exemplos:
npx shadcn-ui@latest add accordion
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add switch

# Listar componentes disponíveis
npx shadcn-ui@latest add
```

## 🔨 Rust/Tauri

```bash
# Verificar instalação Rust
rustc --version
cargo --version

# Atualizar Rust
rustup update

# Verificar setup Tauri
npm run tauri info

# Limpar cache de build Rust
cd src-tauri && cargo clean

# Build release otimizado
cargo build --release

# Verificar dependências Rust
cargo tree
```

## 🛠️ Utilitários

### Limpeza

```bash
# Limpar node_modules
rm -rf node_modules

# Limpar cache npm
npm cache clean --force

# Limpar build frontend
rm -rf dist

# Limpar build Tauri (Rust)
cd src-tauri && cargo clean && cd ..

# Limpeza completa (tudo)
rm -rf node_modules dist src-tauri/target && npm cache clean --force
```

### Informações do Sistema

```bash
# Versão do Node
node --version

# Versão do npm
npm --version

# Versão do Rust
rustc --version

# Informações do Tauri
npm run tauri info

# Listar dependências do projeto
npm list --depth=0

# Verificar dependências desatualizadas
npm outdated
```

## 📝 Git (Comandos Úteis)

```bash
# Ver status
git status

# Ver mudanças
git diff

# Adicionar arquivos
git add .

# Commit
git commit -m "feat: adicionar nova funcionalidade"

# Push
git push origin main

# Ver histórico
git log --oneline --graph --all

# Criar branch
git checkout -b feature/nova-funcionalidade

# Voltar mudanças não commitadas
git restore .

# Ver branches
git branch -a
```

## 🔍 Debug

### Frontend

```bash
# Abrir DevTools do navegador
# Ctrl+Shift+I (Windows/Linux)
# Cmd+Option+I (macOS)

# Ver console Vite
npm run dev -- --debug

# Build com source maps
npm run build -- --sourcemap
```

### Backend (Rust)

```bash
# Build debug
cargo build

# Executar com logs
RUST_LOG=debug npm run tauri:dev

# Ver logs do Tauri
npm run tauri:dev -- --verbose
```

## 📊 Monitoramento

```bash
# Ver processos Node
ps aux | grep node

# Ver uso de porta
lsof -i :1420  # Porta do Vite
lsof -i :5432  # Porta PostgreSQL

# Matar processo em porta específica
kill -9 $(lsof -t -i:1420)
```

## 🚨 Solução de Problemas

### Problema: Porta em uso

```bash
# Encontrar processo
lsof -i :1420

# Matar processo
kill -9 [PID]

# Ou mudar porta no vite.config.ts
```

### Problema: Erro de compilação Rust

```bash
# Limpar e reconstruir
cd src-tauri
cargo clean
cargo build
cd ..
```

### Problema: Erro de dependências

```bash
# Reinstalar tudo
rm -rf node_modules package-lock.json
npm install
```

### Problema: Banco não conecta

```bash
# Verificar se está rodando
docker-compose ps
# ou
sudo systemctl status postgresql

# Reiniciar
npm run docker:down && npm run docker:up
```

## 📚 Documentação Rápida

```bash
# Abrir docs no navegador
open https://ui.shadcn.com
open https://tailwindcss.com/docs
open https://tauri.app/v1/guides/
open https://www.radix-ui.com/primitives
```

## ⚡ Atalhos de Produtividade

### Desenvolvimento Completo (uma linha)

```bash
# Iniciar banco e aplicação
npm run docker:up && npm run tauri:dev
```

### Reset Completo do Projeto

```bash
# Limpar tudo e reinstalar
rm -rf node_modules dist src-tauri/target && \
npm cache clean --force && \
npm install && \
npm run docker:reset && \
npm run tauri:dev
```

### Build de Produção Completa

```bash
# Build frontend e desktop
npm run build && npm run tauri:build
```

## 🔐 Variáveis de Ambiente

### Ver variáveis carregadas

```bash
# No Linux/macOS
env | grep DATABASE

# Criar .env se não existe
cp src-tauri/.env.example src-tauri/.env

# Editar .env
nano src-tauri/.env
# ou
code src-tauri/.env
```

## 📦 Atualização de Dependências

```bash
# Verificar atualizações
npm outdated

# Atualizar todas (cuidado!)
npm update

# Atualizar específica
npm update [package-name]

# Atualizar para latest (ignora semver)
npm install [package-name]@latest

# Instalar versão específica
npm install [package-name]@1.2.3
```

## 🎯 Comandos Personalizados

### Adicionar ao package.json

```json
{
  "scripts": {
    "dev:full": "npm run docker:up && npm run tauri:dev",
    "clean": "rm -rf node_modules dist src-tauri/target",
    "reinstall": "npm run clean && npm install",
    "db:reset": "npm run docker:reset && npm run db:psql"
  }
}
```

---

**💡 Dica:** Adicione estes comandos aos seus favoritos ou crie aliases no seu shell!

```bash
# Adicionar ao ~/.bashrc ou ~/.zshrc
alias sgp-dev="cd /home/mateus/Projetcs/Testes/sgp_v4 && npm run docker:up && npm run tauri:dev"
alias sgp-db="cd /home/mateus/Projetcs/Testes/sgp_v4 && npm run db:psql"
```

**📝 Uso:** Depois de adicionar, execute `source ~/.bashrc` e use `sgp-dev` para iniciar tudo!

