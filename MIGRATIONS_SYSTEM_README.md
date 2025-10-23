# Sistema Profissional de Migrações Automáticas - SGP v4

## 🎯 Objetivo Implementado

Sistema profissional de migrações automáticas embutidas no binário, com controle via variável de ambiente `.env`.

## ✅ Requisitos Atendidos

1. ✅ **Migrações embutidas no binário** (`sqlx::migrate!("./migrations")`)
2. ✅ **Execução automática** na inicialização quando `RUN_MIGRATIONS=true`
3. ✅ **Controle via .env** com variável `RUN_MIGRATIONS`
4. ✅ **Logs claros** via `tracing` com prefixo `[INFO sgp_v4]`
5. ✅ **Funciona sem sqlx-cli** instalado no servidor
6. ✅ **Mesmo executável** funciona em vários computadores

## 🏗️ Estrutura Implementada

### 1️⃣ Arquivo `src/migrator.rs`
```rust
use sqlx::migrate::Migrator;

// 🔥 Embute as migrações dentro do binário
pub static MIGRATOR: Migrator = sqlx::migrate!("./migrations");
```

### 2️⃣ Arquivo `src/db.rs` - Função `try_connect_db()`
```rust
use sqlx::{Pool, Postgres, PgPool};
use tracing::{info, warn};
use std::env;

use crate::migrator::MIGRATOR;

pub type DbPool = Pool<Postgres>;

/// Conecta ao banco de dados e executa migrações se necessário
pub async fn try_connect_db() -> Result<PgPool, sqlx::Error> {
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL não encontrada no ambiente");

    info!("Conectando ao banco...");
    let pool = PgPool::connect(&database_url).await?;
    info!("Conexão com banco estabelecida!");

    let run_migrations = env::var("RUN_MIGRATIONS")
        .unwrap_or_else(|_| "true".to_string())
        .to_lowercase() == "true";

    if run_migrations {
        info!("Executando migrações embutidas...");
        match MIGRATOR.run(&pool).await {
            Ok(_) => info!("✅ Migrações aplicadas com sucesso."),
            Err(e) => warn!("⚠️ Falha ao aplicar migrações: {:?}", e),
        }
    } else {
        info!("🏁 Execução de migrações desativada (RUN_MIGRATIONS=false).");
    }

    Ok(pool)
}
```

### 3️⃣ Integração no `main.rs`
- Função `try_connect_with_migrations()` que integra o sistema de migrações com o sistema de fallback
- Mantém compatibilidade com `db_config.json` e `.env`
- Executa migrações automaticamente quando configurado

## 🔧 Configuração do .env

### 🖥️ Desenvolvimento:
```bash
APP_ENV=development
RUN_MIGRATIONS=true
DATABASE_URL=postgresql://finderbit:senha123@localhost:5432/sgp
```

### 🏭 Produção:
```bash
APP_ENV=production
RUN_MIGRATIONS=false
DATABASE_URL=postgresql://usuario:senha@192.168.15.9:5432/sgp
```

## 📋 Logs Esperados

### Quando `RUN_MIGRATIONS=true`:
```
[INFO sgp_v4] Iniciando Sistema de Gerenciamento de Pedidos...
[INFO sgp_v4] Conectando ao banco...
[INFO sgp_v4] Conexão com banco estabelecida!
[INFO sgp_v4] Executando migrações embutidas...
[INFO sgp_v4] ✅ Migrações aplicadas com sucesso.
```

### Quando `RUN_MIGRATIONS=false`:
```
[INFO sgp_v4] Iniciando Sistema de Gerenciamento de Pedidos...
[INFO sgp_v4] Conectando ao banco...
[INFO sgp_v4] Conexão com banco estabelecida!
[INFO sgp_v4] 🏁 Execução de migrações desativada (RUN_MIGRATIONS=false).
```

## 🚀 Como Usar

### 1. Compilar o binário:
```bash
cargo build --release
```

### 2. Primeira execução (com migrações):
```bash
RUN_MIGRATIONS=true ./sgp-v4
```

### 3. Execuções normais (sem migrações):
```bash
RUN_MIGRATIONS=false ./sgp-v4
```

### 4. Ou configurar no .env:
```bash
# .env
RUN_MIGRATIONS=false
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
```

## 🎯 Critérios de Aceite Atendidos

- ✅ **Binário independente**: Funciona sem dependência do sqlx-cli
- ✅ **Migrações automáticas**: Aplicadas automaticamente quando `RUN_MIGRATIONS=true`
- ✅ **Mesmo executável**: Funciona em vários computadores
- ✅ **Modo produção**: Apenas conecta, sem tocar nas migrações
- ✅ **Logs profissionais**: Todos com prefixo `[INFO sgp_v4]` ou `[WARN sgp_v4]`

## 🔄 Integração com Sistema de Fallback

O sistema de migrações foi integrado com o sistema de fallback existente:

1. **Prioridade**: `db_config.json` > `.env` > variáveis de ambiente
2. **Compatibilidade**: Mantém toda funcionalidade de configuração de banco
3. **Migrações**: Executadas automaticamente após conexão bem-sucedida
4. **Fallback**: Se falhar, mostra tela de configuração

## 📁 Arquivos Modificados

- `src-tauri/src/migrator.rs` - ✅ Já existia e configurado
- `src-tauri/src/db.rs` - ✅ Adicionada função `try_connect_db()`
- `src-tauri/src/main.rs` - ✅ Integrado sistema de migrações
- `env.example` - ✅ Atualizado com configurações de migrações

## 🎉 Resultado Final

Sistema profissional de migrações automáticas implementado com sucesso! O binário agora:

- **Embute migrações** no executável
- **Executa automaticamente** quando configurado
- **Funciona sem dependências** externas
- **Mantém compatibilidade** com sistema de fallback
- **Logs profissionais** em todas as operações
- **Controle total** via variáveis de ambiente

---

**💡 Dica final:**  
Com isso, você pode compilar o binário (`cargo build --release`), copiar pro servidor,  
e só rodar uma vez com `RUN_MIGRATIONS=true ./sgp-v4`, depois volta pro modo normal com `RUN_MIGRATIONS=false ./sgp-v4`.
