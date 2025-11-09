# Guia de Solução de Problemas

Este guia cobre os problemas mais comuns ao configurar e executar o SGP v4.

## 🗄️ Problemas com PostgreSQL

### ❌ Erro: "connection refused" ou "could not connect to server"

**Sintomas:**
```
Error: error connecting to database: Connection refused
```

**Soluções:**

1. **Verificar se PostgreSQL está rodando:**
   ```bash
   # Linux
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   
   # macOS
   brew services list
   brew services start postgresql@14
   
   # Windows
   services.msc → PostgreSQL → Iniciar
   ```

2. **Verificar porta:**
   ```bash
   # PostgreSQL deve estar na porta 5432
   sudo netstat -plnt | grep 5432
   ```

3. **Testar conexão manual:**
   ```bash
   psql -U postgres -h localhost -d sgp_database
   ```

### ❌ Erro: "authentication failed for user"

**Sintomas:**
```
Error: password authentication failed for user "postgres"
```

**Soluções:**

1. **Verificar senha no .env:**
   ```env
   DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/sgp_database
   ```

2. **Resetar senha do PostgreSQL:**
   ```bash
   sudo -u postgres psql
   ALTER USER postgres WITH PASSWORD 'nova_senha';
   \q
   ```

3. **Verificar arquivo pg_hba.conf:**
   ```bash
   # Localizar arquivo
   sudo find / -name pg_hba.conf 2>/dev/null
   
   # Editar para permitir senha
   # Trocar "peer" por "md5" para conexões locais
   sudo nano /etc/postgresql/14/main/pg_hba.conf
   
   # Reiniciar PostgreSQL
   sudo systemctl restart postgresql
   ```

### ❌ Erro: "database does not exist"

**Sintomas:**
```
Error: database "sgp_database" does not exist
```

**Solução:**
```bash
sudo -u postgres psql
CREATE DATABASE sgp_database;
\q

# Executar script de inicialização
psql -U postgres -d sgp_database -f database/init.sql
```

### ❌ Erro: "role does not exist"

**Sintomas:**
```
Error: role "postgres" does not exist
```

**Solução (Linux):**
```bash
sudo -u postgres createuser -s postgres
```

### ❌ Erro: "mismatched types ... TIMESTAMP"

**Sintomas:**
```
error occurred while decoding column "created_at": mismatched types; 
Rust type `core::option::Option<chrono::datetime::DateTime<chrono::offset::utc::Utc>>` 
(as SQL type `TIMESTAMPTZ`) is not compatible with SQL type `TIMESTAMP`
```

**Causa:**
As colunas de data/hora no banco estão como `TIMESTAMP` mas o código Rust espera `TIMESTAMPTZ` (timestamp com timezone).

**Solução Rápida (Docker):**
```bash
# Executar script de migração
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/migrate_timestamps.sql
```

**Solução Manual:**
```bash
# Acessar banco
psql -U postgres -d sgp_database

# Alterar tipos
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE orders ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE orders ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

# Verificar
\d users
\d orders
\q
```

**Prevenção:**
Se estiver iniciando do zero, use `npm run docker:reset` para recriar o banco com os tipos corretos.

## 🐳 Problemas com Docker

### ❌ Erro: "Port 5432 is already in use"

**Sintomas:**
```
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Causa:**
PostgreSQL já está rodando localmente na porta 5432.

**Solução 1 - Parar PostgreSQL local:**
```bash
# Linux
sudo systemctl stop postgresql

# macOS
brew services stop postgresql

# Windows
services.msc → PostgreSQL → Parar
```

**Solução 2 - Mudar porta do Docker:**

Em `docker-compose.yml`, altere:
```yaml
ports:
  - "5433:5432"  # Usar porta 5433 no host
```

E no `src-tauri/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sgp_database
```

### ❌ Erro: "Cannot connect to Docker daemon"

**Sintomas:**
```
Cannot connect to the Docker daemon. Is the docker daemon running?
```

**Solução:**
```bash
# Linux
sudo systemctl start docker
sudo systemctl enable docker

# macOS/Windows
# Inicie o Docker Desktop
```

### ❌ Container não inicia / fica reiniciando

**Verificar logs:**
```bash
docker-compose logs postgres
```

**Soluções comuns:**
```bash
# 1. Remover volumes corrompidos
docker-compose down -v

# 2. Limpar sistema Docker
docker system prune -a

# 3. Recriar containers
docker-compose up -d --force-recreate
```

### ❌ Erro: "healthcheck timeout"

**Sintomas:**
Container fica com status "unhealthy".

**Solução:**
```bash
# Dar mais tempo para inicializar
docker-compose down
docker-compose up -d

# Aguardar 10-15 segundos
sleep 15

# Verificar status
docker-compose ps
```

### ❌ Erro: "permission denied" ao acessar Docker

**Solução (Linux):**
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Fazer logout e login novamente
# Ou usar:
newgrp docker

# Testar
docker ps
```

## 🦀 Problemas com Rust/Tauri

### ❌ Erro: "rustc not found" ou "cargo not found"

**Solução:**
```bash
# Instalar Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Adicionar ao PATH (Linux/macOS)
source $HOME/.cargo/env

# Verificar instalação
rustc --version
cargo --version
```

### ❌ Erro de compilação: "linking with cc failed"

**Solução (Linux):**
```bash
# Ubuntu/Debian
sudo apt install build-essential

# Arch
sudo pacman -S base-devel
```

### ❌ Erro: "webkit2gtk not found"

**Sintomas:**
```
error: failed to run custom build command for `webkit2gtk-sys`
```

**Solução:**

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

**Arch Linux:**
```bash
sudo pacman -S webkit2gtk \
    gtk3 \
    libappindicator-gtk3 \
    librsvg
```

**macOS:**
```bash
# Geralmente não necessário, mas se houver problemas:
xcode-select --install
```

### ❌ Erro: "SSL/TLS error" ou "openssl not found"

**Solução:**

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install libssl-dev pkg-config

# Arch
sudo pacman -S openssl pkg-config
```

**macOS:**
```bash
brew install openssl pkg-config
```

## ⚛️ Problemas com Node.js/React

### ❌ Erro: "Module not found" ou "Cannot find module"

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### ❌ Erro: "Port 1420 is already in use"

**Solução:**

1. **Matar processo na porta:**
   ```bash
   # Linux/macOS
   lsof -ti:1420 | xargs kill -9
   
   # Windows (PowerShell)
   Get-Process -Id (Get-NetTCPConnection -LocalPort 1420).OwningProcess | Stop-Process
   ```

2. **Ou alterar a porta:**
   
   Em `vite.config.ts`:
   ```typescript
   server: {
     port: 1421,  // Nova porta
     strictPort: true,
   }
   ```
   
   Em `tauri.conf.json`:
   ```json
   "devPath": "http://localhost:1421"
   ```

### ❌ Erro: "TypeScript version mismatch"

**Solução:**
```bash
npm install --save-dev typescript@latest
npm install --save-dev @types/react@latest @types/react-dom@latest
```

## 🔧 Problemas de Build

### ❌ Erro ao executar `npm run tauri:build`

**Solução:**

1. **Limpar caches:**
   ```bash
   # Limpar frontend
   rm -rf dist node_modules
   npm install
   npm run build
   
   # Limpar backend
   cd src-tauri
   cargo clean
   cd ..
   ```

2. **Verificar dependências:**
   ```bash
   # Atualizar Rust
   rustup update
   
   # Verificar Node
   node --version  # Deve ser 18+
   ```

3. **Build passo a passo:**
   ```bash
   # 1. Build frontend
   npm run build
   
   # 2. Build Tauri
   cd src-tauri
   cargo build --release
   cd ..
   ```

### ❌ Erro: "failed to bundle project"

**Solução (Linux):**
```bash
# Instalar ferramentas de empacotamento
# Debian/Ubuntu
sudo apt install dpkg fakeroot patchelf

# Arch
sudo pacman -S dpkg fakeroot patchelf
```

## 🧪 Problemas com Testes

### ❌ Testes falham com "Cannot find module @tauri-apps/api"

**Solução:**

Certifique-se de que os mocks estão configurados corretamente no arquivo de teste.

### ❌ Erro: "jsdom not found"

**Solução:**
```bash
npm install --save-dev jsdom @types/jsdom
```

## 🐛 Problemas em Runtime

### ❌ Login não funciona / "Erro ao processar login"

**Verificar:**

1. **Banco de dados:**
   ```bash
   psql -U postgres -d sgp_database
   SELECT * FROM users;
   \q
   ```

2. **Logs do Tauri:**
   ```bash
   # Executar com logs detalhados
   RUST_LOG=debug npm run tauri:dev
   ```

3. **Verificar senhas de teste:**
   - Usuário: `admin` / Senha: `admin123`
   - Usuário: `usuario` / Senha: `user123`

### ❌ Erro: "Senha inválida" mas a senha está correta

**Sintomas:**
```
INFO: Tentativa de login para usuário: admin
INFO: Senha inválida para usuário: admin
```

**Causa:**
Os hashes bcrypt no banco de dados não correspondem às senhas ou estão incompatíveis.

**Solução Rápida (Docker):**
```bash
# Executar script de correção de senhas
docker-compose exec -T postgres psql -U postgres -d sgp_database < database/fix_passwords.sql
```

**Solução Manual:**
```bash
# Acessar banco
docker-compose exec postgres psql -U postgres -d sgp_database

# Habilitar pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

# Resetar senhas
UPDATE users SET password_hash = crypt('admin123', gen_salt('bf')) 
WHERE username = 'admin';

UPDATE users SET password_hash = crypt('user123', gen_salt('bf')) 
WHERE username = 'usuario';

# Verificar
SELECT username, LEFT(password_hash, 7) as hash FROM users;
\q
```

**Após corrigir:**
Tente fazer login novamente com:
- Usuário: `admin` / Senha: `admin123`

### ❌ Pedidos não aparecem / Lista vazia

**Solução:**

1. **Verificar dados no banco:**
   ```bash
   psql -U postgres -d sgp_database
   SELECT COUNT(*) FROM orders;
   SELECT * FROM orders;
   \q
   ```

2. **Re-executar script de inicialização:**
   ```bash
   psql -U postgres -d sgp_database -f database/init.sql
   ```

### ❌ Erro ao exportar PDF/CSV

**Verificar:**

1. **Dependências instaladas:**
   ```bash
   npm list jspdf papaparse
   ```

2. **Reinstalar se necessário:**
   ```bash
   npm install jspdf jspdf-autotable papaparse
   ```

## 🔍 Debug Avançado

### Logs do Rust

**Habilitar logs detalhados:**
```bash
# No terminal
RUST_LOG=debug npm run tauri:dev

# Ou no .env
RUST_LOG=debug
RUST_BACKTRACE=1
```

### Logs do Frontend

**Console do navegador:**
- Abra DevTools (F12)
- Vá para Console
- Veja erros em vermelho

**Network requests:**
- DevTools → Network
- Veja chamadas para o backend Tauri

### Inspetor de Banco de Dados

**Via linha de comando:**
```bash
psql -U postgres -d sgp_database

# Ver tabelas
\dt

# Ver dados
SELECT * FROM orders;
SELECT * FROM users;
SELECT * FROM order_items;

# Ver estrutura
\d orders
```

**Via pgAdmin:**
1. Abra pgAdmin
2. Conecte ao servidor
3. Navegue até sgp_database
4. Explore tabelas visualmente

## 📞 Ainda com Problemas?

1. **Verifique os logs:**
   ```bash
   # Logs do sistema
   journalctl -xe
   
   # Logs do PostgreSQL
   sudo tail -f /var/log/postgresql/postgresql-14-main.log
   ```

2. **Versões do sistema:**
   ```bash
   node --version
   npm --version
   rustc --version
   cargo --version
   psql --version
   ```

3. **Crie uma issue:**
   - Descreva o problema
   - Cole mensagens de erro completas
   - Informe versões e sistema operacional
   - Descreva passos para reproduzir

## ✅ Checklist Geral

Antes de reportar um problema, verifique:

- [ ] PostgreSQL está rodando
- [ ] Banco `sgp_database` existe
- [ ] Script `init.sql` foi executado
- [ ] Arquivo `.env` está configurado corretamente
- [ ] Dependências instaladas (`npm install`)
- [ ] Rust atualizado (`rustup update`)
- [ ] Sem erros de lint (`npm run lint`)
- [ ] Logs verificados (`RUST_LOG=debug`)

---

**Dica:** A maioria dos problemas é resolvida com:
```bash
# Reset completo
rm -rf node_modules package-lock.json
npm install
cd src-tauri && cargo clean && cd ..
npm run tauri:dev
```

