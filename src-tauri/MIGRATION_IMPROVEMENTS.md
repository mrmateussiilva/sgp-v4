# 🔧 Melhorias para o Sistema de Migrações

## 🔍 **Análise do Problema**

### **Erro Identificado**
```
WARN sgp_v4::db: ⚠️ Falha ao aplicar migrações: VersionMismatch(20241019000100)
```

### **Causa Raiz**
O erro `VersionMismatch` acontece quando:
1. **Múltiplos clientes** tentam executar migrações simultaneamente
2. **Concorrência de migrações** entre diferentes instâncias da aplicação
3. **Estado inconsistente** da tabela `_sqlx_migrations`
4. **Falta de controle de concorrência** nas migrações

---

## 🎯 **Sugestões de Melhorias**

### **1. Sistema de Lock para Migrações**

#### **Problema**: Múltiplos clientes executando migrações simultaneamente
#### **Solução**: Implementar lock distribuído para migrações

```rust
// migrator.rs
use sqlx::{Pool, Postgres, Row};
use std::time::{Duration, Instant};
use tokio::time::sleep;

pub async fn run_migrations_with_lock(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    let lock_name = "sgp_migration_lock";
    let lock_timeout = Duration::from_secs(30);
    let max_wait_time = Duration::from_secs(60);
    
    let start_time = Instant::now();
    
    // Tentar adquirir lock
    while start_time.elapsed() < max_wait_time {
        match acquire_migration_lock(pool, lock_name, lock_timeout).await {
            Ok(acquired) => {
                if acquired {
                    // Executar migrações
                    match MIGRATOR.run(pool).await {
                        Ok(_) => {
                            info!("✅ Migrações aplicadas com sucesso");
                            release_migration_lock(pool, lock_name).await;
                            return Ok(());
                        }
                        Err(e) => {
                            warn!("⚠️ Falha ao aplicar migrações: {:?}", e);
                            release_migration_lock(pool, lock_name).await;
                            return Err(e);
                        }
                    }
                } else {
                    // Lock não adquirido, aguardar e tentar novamente
                    sleep(Duration::from_millis(500)).await;
                }
            }
            Err(e) => {
                warn!("Erro ao tentar adquirir lock de migração: {:?}", e);
                sleep(Duration::from_millis(1000)).await;
            }
        }
    }
    
    Err(sqlx::Error::Configuration("Timeout ao aguardar lock de migração".into()))
}

async fn acquire_migration_lock(
    pool: &Pool<Postgres>,
    lock_name: &str,
    timeout: Duration,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        "SELECT pg_try_advisory_lock(hashtext($1)) as acquired"
    )
    .bind(lock_name)
    .fetch_one(pool)
    .await?;
    
    Ok(result.get::<bool, _>("acquired"))
}

async fn release_migration_lock(pool: &Pool<Postgres>, lock_name: &str) {
    let _ = sqlx::query("SELECT pg_advisory_unlock(hashtext($1))")
        .bind(lock_name)
        .execute(pool)
        .await;
}
```

### **2. Verificação de Estado das Migrações**

#### **Problema**: Estado inconsistente da tabela de migrações
#### **Solução**: Verificar e corrigir estado antes de executar migrações

```rust
// migrator.rs
pub async fn check_migration_state(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    // Verificar se a tabela de migrações existe
    let table_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '_sqlx_migrations'
        )"
    )
    .fetch_one(pool)
    .await?;
    
    if !table_exists {
        info!("Tabela de migrações não existe, criando...");
        return Ok(());
    }
    
    // Verificar migrações aplicadas
    let applied_migrations = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _sqlx_migrations"
    )
    .fetch_one(pool)
    .await?;
    
    info!("Migrações aplicadas: {}", applied_migrations);
    
    // Verificar se há migrações em estado inconsistente
    let inconsistent_migrations = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _sqlx_migrations 
         WHERE success = false"
    )
    .fetch_one(pool)
    .await?;
    
    if inconsistent_migrations > 0 {
        warn!("⚠️ Encontradas {} migrações em estado inconsistente", inconsistent_migrations);
        // Opcional: tentar corrigir migrações inconsistentes
        fix_inconsistent_migrations(pool).await?;
    }
    
    Ok(())
}

async fn fix_inconsistent_migrations(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    // Remover migrações inconsistentes
    sqlx::query("DELETE FROM _sqlx_migrations WHERE success = false")
        .execute(pool)
        .await?;
    
    info!("✅ Migrações inconsistentes removidas");
    Ok(())
}
```

### **3. Sistema de Retry com Backoff**

#### **Problema**: Falhas temporárias nas migrações
#### **Solução**: Implementar retry com backoff exponencial

```rust
// migrator.rs
use tokio::time::{sleep, Duration};

pub async fn run_migrations_with_retry(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    let max_retries = 3;
    let mut retry_count = 0;
    
    while retry_count < max_retries {
        match run_migrations_with_lock(pool).await {
            Ok(_) => return Ok(()),
            Err(e) => {
                retry_count += 1;
                if retry_count >= max_retries {
                    error!("❌ Falha ao aplicar migrações após {} tentativas: {:?}", max_retries, e);
                    return Err(e);
                }
                
                let backoff_duration = Duration::from_millis(1000 * 2_u64.pow(retry_count));
                warn!("⚠️ Tentativa {} falhou, aguardando {:?} antes de tentar novamente...", retry_count, backoff_duration);
                sleep(backoff_duration).await;
            }
        }
    }
    
    Ok(())
}
```

### **4. Controle de Versão de Migrações**

#### **Problema**: Conflitos de versão entre diferentes instâncias
#### **Solução**: Implementar controle de versão mais robusto

```rust
// migrator.rs
pub async fn validate_migration_versions(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    // Obter versão atual das migrações
    let current_version = sqlx::query_scalar::<_, Option<String>>(
        "SELECT version FROM _sqlx_migrations 
         WHERE success = true 
         ORDER BY version DESC 
         LIMIT 1"
    )
    .fetch_one(pool)
    .await?;
    
    info!("Versão atual das migrações: {:?}", current_version);
    
    // Verificar se há migrações pendentes
    let pending_migrations = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _sqlx_migrations 
         WHERE success = false"
    )
    .fetch_one(pool)
    .await?;
    
    if pending_migrations > 0 {
        warn!("⚠️ Encontradas {} migrações pendentes", pending_migrations);
    }
    
    Ok(())
}
```

### **5. Sistema de Logs Melhorado**

#### **Problema**: Logs insuficientes para debug
#### **Solução**: Implementar logs detalhados para migrações

```rust
// migrator.rs
pub async fn run_migrations_with_detailed_logging(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("🔍 Iniciando verificação de migrações...");
    
    // Verificar estado atual
    check_migration_state(pool).await?;
    
    // Validar versões
    validate_migration_versions(pool).await?;
    
    info!("🚀 Executando migrações com lock...");
    
    // Executar migrações com retry
    match run_migrations_with_retry(pool).await {
        Ok(_) => {
            info!("✅ Migrações aplicadas com sucesso!");
            
            // Verificar estado final
            let final_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM _sqlx_migrations WHERE success = true"
            )
            .fetch_one(pool)
            .await?;
            
            info!("📊 Total de migrações aplicadas: {}", final_count);
            Ok(())
        }
        Err(e) => {
            error!("❌ Falha crítica ao aplicar migrações: {:?}", e);
            Err(e)
        }
    }
}
```

### **6. Configuração de Ambiente Melhorada**

#### **Problema**: Configuração inadequada para diferentes ambientes
#### **Solução**: Implementar configuração mais robusta

```rust
// config.rs
pub struct MigrationConfig {
    pub enabled: bool,
    pub max_retries: u32,
    pub lock_timeout: Duration,
    pub max_wait_time: Duration,
    pub retry_backoff: Duration,
}

impl Default for MigrationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_retries: 3,
            lock_timeout: Duration::from_secs(30),
            max_wait_time: Duration::from_secs(60),
            retry_backoff: Duration::from_millis(1000),
        }
    }
}

impl MigrationConfig {
    pub fn from_env() -> Self {
        Self {
            enabled: env::var("RUN_MIGRATIONS")
                .unwrap_or_else(|_| "true".to_string())
                .to_lowercase() == "true",
            max_retries: env::var("MIGRATION_MAX_RETRIES")
                .unwrap_or_else(|_| "3".to_string())
                .parse()
                .unwrap_or(3),
            lock_timeout: Duration::from_secs(
                env::var("MIGRATION_LOCK_TIMEOUT")
                    .unwrap_or_else(|_| "30".to_string())
                    .parse()
                    .unwrap_or(30)
            ),
            max_wait_time: Duration::from_secs(
                env::var("MIGRATION_MAX_WAIT_TIME")
                    .unwrap_or_else(|_| "60".to_string())
                    .parse()
                    .unwrap_or(60)
            ),
            retry_backoff: Duration::from_millis(
                env::var("MIGRATION_RETRY_BACKOFF")
                    .unwrap_or_else(|_| "1000".to_string())
                    .parse()
                    .unwrap_or(1000)
            ),
        }
    }
}
```

---

## 🚀 **Implementação Recomendada**

### **1. Atualizar db.rs**
```rust
// db.rs
pub async fn try_connect_db() -> Result<PgPool, sqlx::Error> {
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL não encontrada no ambiente");

    info!("Conectando ao banco...");
    let pool = PgPool::connect(&database_url).await?;
    info!("Conexão com banco estabelecida!");

    let config = MigrationConfig::from_env();
    
    if config.enabled {
        info!("Executando migrações com controle de concorrência...");
        match run_migrations_with_detailed_logging(&pool).await {
            Ok(_) => info!("✅ Migrações aplicadas com sucesso."),
            Err(e) => {
                error!("❌ Falha crítica ao aplicar migrações: {:?}", e);
                return Err(e);
            }
        }
    } else {
        info!("🏁 Execução de migrações desativada (RUN_MIGRATIONS=false).");
    }

    Ok(pool)
}
```

### **2. Variáveis de Ambiente**
```bash
# .env
RUN_MIGRATIONS=true
MIGRATION_MAX_RETRIES=3
MIGRATION_LOCK_TIMEOUT=30
MIGRATION_MAX_WAIT_TIME=60
MIGRATION_RETRY_BACKOFF=1000
```

---

## 🎯 **Benefícios das Melhorias**

### ✅ **Eliminação de Conflitos de Migração**
- **Lock distribuído**: Evita execução simultânea de migrações
- **Controle de concorrência**: Apenas uma instância executa migrações por vez
- **Timeout configurável**: Evita travamentos indefinidos

### ✅ **Sistema de Retry Robusto**
- **Backoff exponencial**: Aumenta intervalo entre tentativas
- **Máximo de tentativas**: Evita loops infinitos
- **Logs detalhados**: Facilita debugging

### ✅ **Verificação de Estado**
- **Validação de migrações**: Verifica estado antes de executar
- **Correção automática**: Remove migrações inconsistentes
- **Controle de versão**: Gerencia versões de migrações

### ✅ **Logs Melhorados**
- **Informações detalhadas**: Logs mais informativos
- **Debugging facilitado**: Mais fácil identificar problemas
- **Monitoramento**: Melhor visibilidade do processo

---

## 🎉 **Conclusão**

### **Soluções Recomendadas**

1. **✅ Sistema de Lock Distribuído** para evitar conflitos
2. **✅ Verificação de Estado** das migrações
3. **✅ Sistema de Retry** com backoff exponencial
4. **✅ Controle de Versão** mais robusto
5. **✅ Logs Melhorados** para debugging
6. **✅ Configuração Flexível** por ambiente

### **Implementação Prioritária**

1. **Implementar sistema de lock** (mais crítico)
2. **Adicionar verificação de estado** das migrações
3. **Implementar sistema de retry** com backoff
4. **Melhorar logs** para debugging

**Essas melhorias devem resolver o problema de `VersionMismatch` e tornar o sistema de migrações mais robusto e confiável!** 🚀
