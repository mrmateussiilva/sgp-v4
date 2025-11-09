# 🚀 Início Rápido - SGP v4

Guia rápido para começar a usar o SGP v4 em 2 minutos!

## ✅ Pré-requisitos

- Node.js 18+ instalado
- Rust instalado
- Docker instalado (recomendado)

## 📦 Instalação

### 1. Instalar Dependências

```bash
npm install
# ou
pnpm install
```

### 2. Configurar Banco de Dados (Docker)

```bash
# Copiar configuração
cp src-tauri/.env.example src-tauri/.env

# Iniciar PostgreSQL
npm run docker:up
```

### 3. Executar Aplicação

```bash
npm run tauri:dev
```

Pronto! O aplicativo vai abrir automaticamente. 🎉

## 🔐 Login

Use estas credenciais para acessar:

- **Usuário:** `admin`
- **Senha:** `admin123`

## 📚 Comandos Úteis

```bash
# Docker
npm run docker:up        # Iniciar banco
npm run docker:down      # Parar banco
npm run docker:logs      # Ver logs
npm run docker:reset     # Resetar banco

# Desenvolvimento
npm run tauri:dev        # Rodar aplicação
npm run dev              # Apenas frontend
npm test                 # Testes

# PgAdmin (Interface Web)
npm run docker:pgadmin   # http://localhost:5050
# Login: admin@sgp.local / admin
```

## 🐛 Problemas?

### Banco não conecta
```bash
# Verificar se está rodando
docker-compose ps

# Ver logs
npm run docker:logs

# Resetar tudo
npm run docker:reset
```

### Porta 5432 em uso
```bash
# Parar PostgreSQL local
sudo systemctl stop postgresql  # Linux
brew services stop postgresql   # macOS
```

## 📖 Documentação Completa

- [README.md](README.md) - Documentação completa
- [DOCKER.md](DOCKER.md) - Guia detalhado do Docker
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Configuração do banco

---

**Dica:** Mantenha o Docker rodando enquanto desenvolve! 🐳

