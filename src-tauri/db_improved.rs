use sqlx::{Pool, Postgres, PgPool};
use tracing::{info, warn, error};
use std::env;

use crate::migrator_improved::{run_migrations_safely, get_migration_info, MigrationInfo};

pub type DbPool = Pool<Postgres>;

/// Conecta ao banco de dados e executa migrações com controle de concorrência
pub async fn try_connect_db() -> Result<PgPool, sqlx::Error> {
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL não encontrada no ambiente");

    info!("Conectando ao banco...");
    let pool = PgPool::connect(&database_url).await?;
    info!("Conexão com banco estabelecida!");

    // Verificar informações sobre migrações antes de executar
    match get_migration_info(&pool).await {
        Ok(migration_info) => {
            info!("📊 Estado das migrações:");
            info!("  - Tabela existe: {}", migration_info.table_exists);
            info!("  - Migrações aplicadas: {}", migration_info.applied_count);
            info!("  - Migrações pendentes: {}", migration_info.pending_count);
            if let Some(last_migration) = migration_info.last_migration {
                info!("  - Última migração: {}", last_migration);
            }
        }
        Err(e) => {
            warn!("⚠️ Erro ao verificar estado das migrações: {:?}", e);
        }
    }

    // Executar migrações com controle de concorrência
    info!("Executando migrações com controle de concorrência...");
    match run_migrations_safely(&pool).await {
        Ok(_) => {
            info!("✅ Migrações aplicadas com sucesso!");
            
            // Verificar estado final das migrações
            match get_migration_info(&pool).await {
                Ok(final_info) => {
                    info!("📊 Estado final das migrações:");
                    info!("  - Migrações aplicadas: {}", final_info.applied_count);
                    info!("  - Migrações pendentes: {}", final_info.pending_count);
                    if let Some(last_migration) = final_info.last_migration {
                        info!("  - Última migração: {}", last_migration);
                    }
                }
                Err(e) => {
                    warn!("⚠️ Erro ao verificar estado final das migrações: {:?}", e);
                }
            }
        }
        Err(e) => {
            error!("❌ Falha crítica ao aplicar migrações: {:?}", e);
            return Err(e);
        }
    }

    Ok(pool)
}

/// Conecta ao banco de dados sem executar migrações
pub async fn try_connect_db_without_migrations() -> Result<PgPool, sqlx::Error> {
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL não encontrada no ambiente");

    info!("Conectando ao banco (sem migrações)...");
    let pool = PgPool::connect(&database_url).await?;
    info!("Conexão com banco estabelecida!");

    Ok(pool)
}

/// Executa migrações em uma conexão existente
pub async fn run_migrations_on_pool(pool: &PgPool) -> Result<(), sqlx::Error> {
    info!("Executando migrações em pool existente...");
    run_migrations_safely(pool).await
}

/// Verifica se há migrações pendentes
pub async fn has_pending_migrations(pool: &PgPool) -> Result<bool, sqlx::Error> {
    use crate::migrator_improved::check_pending_migrations;
    check_pending_migrations(pool).await
}

/// Obtém informações detalhadas sobre migrações
pub async fn get_migration_status(pool: &PgPool) -> Result<MigrationInfo, sqlx::Error> {
    get_migration_info(pool).await
}

/// Testa a conexão com o banco de dados
pub async fn test_connection(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT 1")
        .fetch_one(pool)
        .await?;
    
    info!("✅ Teste de conexão bem-sucedido");
    Ok(())
}

/// Verifica a saúde da conexão com o banco
pub async fn check_database_health(pool: &PgPool) -> Result<DatabaseHealth, sqlx::Error> {
    let start_time = std::time::Instant::now();
    
    // Testar conexão
    sqlx::query("SELECT 1")
        .fetch_one(pool)
        .await?;
    
    let connection_time = start_time.elapsed();
    
    // Verificar informações sobre migrações
    let migration_info = get_migration_info(pool).await?;
    
    // Verificar número de conexões ativas
    let active_connections = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'"
    )
    .fetch_one(pool)
    .await?;
    
    Ok(DatabaseHealth {
        connection_time,
        migration_info,
        active_connections,
        is_healthy: true,
    })
}

/// Informações sobre a saúde do banco de dados
#[derive(Debug, Clone)]
pub struct DatabaseHealth {
    pub connection_time: std::time::Duration,
    pub migration_info: MigrationInfo,
    pub active_connections: i64,
    pub is_healthy: bool,
}
