# 🐛 Bug Fix: Sistema de Migrações Ignorando .env

## 🔍 **Problema Identificado**

### **Bug no Código:**
O sistema está carregando configurações do `db_config.json` e **ignorando completamente** o arquivo `.env`, mesmo quando o usuário define `RUN_MIGRATIONS=false`.

### **Fluxo Problemático:**
```rust
// src/main.rs - Linhas 32-53
if let Ok(Some(db_config)) = load_db_config() {
    info!("Configuração de banco encontrada em db_config.json");
    let db_url = db_config.to_database_url();
    
    // ❌ BUG: Define apenas DATABASE_URL, mas não RUN_MIGRATIONS
    std::env::set_var("DATABASE_URL", &db_url);
    
    // ❌ BUG: Retorna aqui, nunca carrega o .env
    return Ok((pool, config));
}
```

### **Resultado do Bug:**
- **`RUN_MIGRATIONS`** fica como `None` (não definida)
- **`APP_ENV`** fica como `None` (não definida)
- **Sistema usa valores padrão** em vez das configurações do `.env`

---

## 🔧 **Correção do Bug**

### **Solução 1: Carregar .env ANTES de verificar db_config.json**

```rust
// src/main.rs - CORREÇÃO
async fn try_connect_with_migrations() -> Result<(sqlx::PgPool, AppConfig), String> {
    // ✅ CORREÇÃO: Carregar .env PRIMEIRO
    match crate::env_loader::load_env_file() {
        Ok(_) => info!("Arquivo .env carregado com sucesso"),
        Err(e) => {
            error!("Erro ao carregar arquivo .env: {}. Usando variáveis de ambiente do sistema.", e);
        }
    }
    
    // ✅ CORREÇÃO: Verificar se RUN_MIGRATIONS está definida no .env
    let run_migrations_from_env = env::var("RUN_MIGRATIONS").ok();
    let app_env_from_env = env::var("APP_ENV").ok();
    
    // Primeiro, tenta carregar configuração do arquivo db_config.json
    if let Ok(Some(db_config)) = load_db_config() {
        info!("Configuração de banco encontrada em db_config.json");
        let db_url = db_config.to_database_url();
        
        // ✅ CORREÇÃO: Definir DATABASE_URL E preservar variáveis do .env
        std::env::set_var("DATABASE_URL", &db_url);
        
        // ✅ CORREÇÃO: Preservar RUN_MIGRATIONS do .env se definida
        if let Some(run_migrations) = run_migrations_from_env {
            std::env::set_var("RUN_MIGRATIONS", run_migrations);
        }
        
        // ✅ CORREÇÃO: Preservar APP_ENV do .env se definida
        if let Some(app_env) = app_env_from_env {
            std::env::set_var("APP_ENV", app_env);
        }
        
        match try_connect_db().await {
            Ok(pool) => {
                info!("Conexão estabelecida usando configuração de db_config.json");
                
                // Criar uma configuração mínima para a aplicação
                let config = AppConfig {
                    database: crate::config::DatabaseConfig {
                        url: db_url,
                        max_connections: 10,
                    },
                    session_timeout_hours: 24,
                    cache_ttl_seconds: 3600,
                };
                
                return Ok((pool, config));
            }
            Err(e) => {
                error!("Falha ao conectar usando db_config.json: {}", e);
            }
        }
    }

    // Se não conseguiu com db_config.json, tenta com .env
    // (Este código já está correto)
    let config = match AppConfig::from_env() {
        Ok(config) => {
            info!("Configurações carregadas com sucesso");
            info!("URL do banco: {}", config.get_masked_database_url());
            config
        }
        Err(e) => {
            return Err(format!("Erro ao carregar configurações: {}", e));
        }
    };

    // Usar o sistema profissional de migrações
    match try_connect_db().await {
        Ok(pool) => {
            info!("Conexão com banco de dados estabelecida usando .env!");
            Ok((pool, config))
        }
        Err(e) => {
            Err(format!("Falha ao conectar com o banco de dados: {}", e))
        }
    }
}
```

### **Solução 2: Modificar db.rs para carregar .env**

```rust
// src/db.rs - CORREÇÃO
pub async fn try_connect_db() -> Result<PgPool, sqlx::Error> {
    // ✅ CORREÇÃO: Carregar .env antes de verificar variáveis
    let _ = crate::env_loader::load_env_file();
    
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

---

## 🚀 **Implementação da Correção**

### **Opção 1: Correção Rápida (Recomendada)**
Modificar o `db.rs` para carregar o `.env` antes de verificar as variáveis.

### **Opção 2: Correção Completa**
Modificar o `main.rs` para preservar as variáveis do `.env` quando usar `db_config.json`.

---

## 🎯 **Teste da Correção**

### **Configuração Atual:**
```bash
# .env
RUN_MIGRATIONS=false
APP_ENV=production
```

### **Resultado Esperado:**
```
[INFO] sgp_v4::db: 🏁 Execução de migrações desativada (RUN_MIGRATIONS=false).
[INFO] sgp_v4: Conexão estabelecida usando configuração de db_config.json
[INFO] sgp_v4: Conexão com banco de dados estabelecida!
[INFO] sgp_v4: Verificando migrações pendentes (APP_ENV=production, RUN_MIGRATIONS=Some(false))...
```

### **Resultado Atual (Bugado):**
```
[WARN] sgp_v4::db: ⚠️ Falha ao aplicar migrações: VersionMismatch(20241019000100)
[INFO] sgp_v4: Conexão estabelecida usando configuração de db_config.json
[INFO] sgp_v4: Conexão com banco de dados estabelecida!
[INFO] sgp_v4: Verificando migrações pendentes (APP_ENV=development, RUN_MIGRATIONS=None)...
```

---

## 🔧 **Implementação da Correção**

Vou implementar a **Opção 1** (correção rápida) modificando o `db.rs`:
