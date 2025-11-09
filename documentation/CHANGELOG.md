# Changelog - SGP v4

## [1.0.2] - 2025-10-14

### 🐛 Corrigido
- **Erro de autenticação**: Corrigidos hashes bcrypt das senhas de teste
  - Usuários agora usam pgcrypto do PostgreSQL para gerar hashes compatíveis
  - Senhas atualizadas no banco de dados existente
  - `init.sql` atualizado para gerar hashes corretos automaticamente

### 🔧 Melhorado
- `init.sql`: Agora usa `pgcrypto` para gerar hashes bcrypt diretamente no PostgreSQL
- Hashes mais compatíveis entre PostgreSQL e Rust bcrypt

## [1.0.1] - 2025-10-14

### 🐳 Adicionado
- **Suporte completo ao Docker** para PostgreSQL
  - `docker-compose.yml` configurado com PostgreSQL 15 Alpine
  - PgAdmin opcional via profile
  - Volume persistente para dados
  - Healthcheck automático
  - Scripts NPM para facilitar uso do Docker

### 📝 Documentação
- `DOCKER.md` - Guia completo sobre uso do Docker
- `QUICKSTART.md` - Guia de início rápido em 2 minutos
- `database/README.md` - Documentação dos scripts SQL
- `database/migrate_timestamps.sql` - Script de migração
- Atualizações no `README.md` com instruções Docker
- Seção sobre Docker no `TROUBLESHOOTING.md`

### 🔧 Scripts NPM
- `npm run docker:up` - Iniciar banco de dados
- `npm run docker:down` - Parar banco de dados
- `npm run docker:logs` - Ver logs em tempo real
- `npm run docker:reset` - Resetar banco (apaga dados)
- `npm run docker:pgadmin` - Iniciar com interface web
- `npm run db:psql` - Acessar PostgreSQL via terminal

### 🐛 Corrigido
- **Erro de tipo TIMESTAMP**: Corrigido incompatibilidade entre `TIMESTAMP` e `TIMESTAMPTZ`
  - Alterado `init.sql` para usar `TIMESTAMPTZ`
  - Criado script de migração para bancos existentes
  - Documentado solução no guia de troubleshooting

- **Erro de ícones Tauri**: Removidos ícones PNG incompatíveis da configuração
  - Mantidos apenas ícones `.icns` e `.ico`
  - Configuração atualizada em `tauri.conf.json`

### 🔄 Alterado
- `docker-compose.yml`: Removido `version` obsoleto
- `.gitignore`: Já protegia corretamente arquivos `.env`
- Estrutura de documentação reorganizada

### 📦 Arquivos Criados
```
docker-compose.yml           # Configuração Docker
src-tauri/.env.example       # Template de configuração
.dockerignore                # Otimização Docker
DOCKER.md                    # Guia Docker
QUICKSTART.md               # Início rápido
database/README.md          # Docs dos scripts SQL
database/migrate_timestamps.sql  # Script de migração
```

### ✅ Validações
- ✅ PostgreSQL rodando no Docker (porta 5432)
- ✅ Banco `sgp_database` criado automaticamente
- ✅ Tabelas com tipos corretos (`TIMESTAMPTZ`)
- ✅ Dados de teste carregados
- ✅ Conexão Rust/SQLx funcional
- ✅ Arquivo `.env` configurado

## [1.0.0] - 2025-10-14

### Lançamento Inicial
- Sistema de Gerenciamento de Pedidos desktop
- Frontend: React + TypeScript + Material-UI
- Backend: Tauri (Rust) + PostgreSQL
- Autenticação com bcrypt
- CRUD completo de pedidos
- Exportação para PDF e CSV
- Testes unitários com Vitest

