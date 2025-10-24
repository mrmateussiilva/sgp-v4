use sqlx::{Pool, Postgres, Row};
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{info, warn, error, debug};

use crate::migrator::MIGRATOR;

/// Configuração para migrações
#[derive(Debug, Clone)]
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
        let enabled = std::env::var("RUN_MIGRATIONS")
            .unwrap_or_else(|_| "true".to_string())
            .to_lowercase() == "true";
        
        let max_retries = std::env::var("MIGRATION_MAX_RETRIES")
            .unwrap_or_else(|_| "3".to_string())
            .parse()
            .unwrap_or(3);
        
        let lock_timeout = Duration::from_secs(
            std::env::var("MIGRATION_LOCK_TIMEOUT")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30)
        );
        
        let max_wait_time = Duration::from_secs(
            std::env::var("MIGRATION_MAX_WAIT_TIME")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .unwrap_or(60)
        );
        
        let retry_backoff = Duration::from_millis(
            std::env::var("MIGRATION_RETRY_BACKOFF")
                .unwrap_or_else(|_| "1000".to_string())
                .parse()
                .unwrap_or(1000)
        );
        
        Self {
            enabled,
            max_retries,
            lock_timeout,
            max_wait_time,
            retry_backoff,
        }
    }
}

/// Executa migrações com controle de concorrência e retry
pub async fn run_migrations_safely(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    let config = MigrationConfig::from_env();
    
    if !config.enabled {
        info!("🏁 Execução de migrações desativada (RUN_MIGRATIONS=false)");
        return Ok(());
    }
    
    info!("🔍 Iniciando verificação de migrações...");
    
    // Verificar estado atual das migrações
    check_migration_state(pool).await?;
    
    // Executar migrações com lock e retry
    run_migrations_with_retry(pool, &config).await
}

/// Verifica o estado atual das migrações
async fn check_migration_state(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
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
        info!("Tabela de migrações não existe, será criada...");
        return Ok(());
    }
    
    // Verificar migrações aplicadas
    let applied_migrations = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _sqlx_migrations WHERE success = true"
    )
    .fetch_one(pool)
    .await?;
    
    info!("📊 Migrações aplicadas com sucesso: {}", applied_migrations);
    
    // Verificar migrações em estado inconsistente
    let inconsistent_migrations = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _sqlx_migrations WHERE success = false"
    )
    .fetch_one(pool)
    .await?;
    
    if inconsistent_migrations > 0 {
        warn!("⚠️ Encontradas {} migrações em estado inconsistente", inconsistent_migrations);
        fix_inconsistent_migrations(pool).await?;
    }
    
    Ok(())
}

/// Corrige migrações em estado inconsistente
async fn fix_inconsistent_migrations(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    // Remover migrações inconsistentes
    let deleted_count = sqlx::query("DELETE FROM _sqlx_migrations WHERE success = false")
        .execute(pool)
        .await?;
    
    info!("✅ Removidas {} migrações inconsistentes", deleted_count.rows_affected());
    Ok(())
}

/// Executa migrações com sistema de retry
async fn run_migrations_with_retry(
    pool: &Pool<Postgres>,
    config: &MigrationConfig,
) -> Result<(), sqlx::Error> {
    let mut retry_count = 0;
    
    while retry_count < config.max_retries {
        match run_migrations_with_lock(pool, config).await {
            Ok(_) => {
                info!("✅ Migrações aplicadas com sucesso!");
                return Ok(());
            }
            Err(e) => {
                retry_count += 1;
                if retry_count >= config.max_retries {
                    error!("❌ Falha ao aplicar migrações após {} tentativas: {:?}", config.max_retries, e);
                    return Err(e);
                }
                
                let backoff_duration = Duration::from_millis(
                    config.retry_backoff.as_millis() as u64 * 2_u64.pow(retry_count)
                );
                
                warn!(
                    "⚠️ Tentativa {} falhou, aguardando {:?} antes de tentar novamente... Erro: {:?}",
                    retry_count, backoff_duration, e
                );
                
                sleep(backoff_duration).await;
            }
        }
    }
    
    Ok(())
}

/// Executa migrações com lock distribuído
async fn run_migrations_with_lock(
    pool: &Pool<Postgres>,
    config: &MigrationConfig,
) -> Result<(), sqlx::Error> {
    let lock_name = "sgp_migration_lock";
    let start_time = Instant::now();
    
    // Tentar adquirir lock
    while start_time.elapsed() < config.max_wait_time {
        match acquire_migration_lock(pool, lock_name, config.lock_timeout).await {
            Ok(acquired) => {
                if acquired {
                    debug!("🔒 Lock de migração adquirido com sucesso");
                    
                    // Executar migrações
                    match MIGRATOR.run(pool).await {
                        Ok(_) => {
                            info!("✅ Migrações aplicadas com sucesso");
                            release_migration_lock(pool, lock_name).await;
                            return Ok(());
                        }
                        Err(e) => {
                            error!("❌ Falha ao aplicar migrações: {:?}", e);
                            release_migration_lock(pool, lock_name).await;
                            return Err(e);
                        }
                    }
                } else {
                    // Lock não adquirido, aguardar e tentar novamente
                    debug!("⏳ Lock não disponível, aguardando...");
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

/// Adquire lock de migração usando PostgreSQL advisory locks
async fn acquire_migration_lock(
    pool: &Pool<Postgres>,
    lock_name: &str,
    _timeout: Duration,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        "SELECT pg_try_advisory_lock(hashtext($1)) as acquired"
    )
    .bind(lock_name)
    .fetch_one(pool)
    .await?;
    
    Ok(result.get::<bool, _>("acquired"))
}

/// Libera lock de migração
async fn release_migration_lock(pool: &Pool<Postgres>, lock_name: &str) {
    match sqlx::query("SELECT pg_advisory_unlock(hashtext($1))")
        .bind(lock_name)
        .execute(pool)
        .await
    {
        Ok(_) => debug!("🔓 Lock de migração liberado"),
        Err(e) => warn!("Erro ao liberar lock de migração: {:?}", e),
    }
}

/// Verifica se há migrações pendentes
pub async fn check_pending_migrations(pool: &Pool<Postgres>) -> Result<bool, sqlx::Error> {
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
        return Ok(true); // Tabela não existe, há migrações pendentes
    }
    
    // Verificar se há migrações pendentes
    let pending_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _sqlx_migrations WHERE success = false"
    )
    .fetch_one(pool)
    .await?;
    
    Ok(pending_count > 0)
}

/// Obtém informações sobre migrações aplicadas
pub async fn get_migration_info(pool: &Pool<Postgres>) -> Result<MigrationInfo, sqlx::Error> {
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
        return Ok(MigrationInfo {
            table_exists: false,
            applied_count: 0,
            pending_count: 0,
            last_migration: None,
        });
    }
    
    let applied_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _sqlx_migrations WHERE success = true"
    )
    .fetch_one(pool)
    .await?;
    
    let pending_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _sqlx_migrations WHERE success = false"
    )
    .fetch_one(pool)
    .await?;
    
    let last_migration = sqlx::query_scalar::<_, Option<String>>(
        "SELECT version FROM _sqlx_migrations 
         WHERE success = true 
         ORDER BY version DESC 
         LIMIT 1"
    )
    .fetch_one(pool)
    .await?;
    
    Ok(MigrationInfo {
        table_exists: true,
        applied_count,
        pending_count,
        last_migration,
    })
}

/// Informações sobre migrações
#[derive(Debug, Clone)]
pub struct MigrationInfo {
    pub table_exists: bool,
    pub applied_count: i64,
    pub pending_count: i64,
    pub last_migration: Option<String>,
}
