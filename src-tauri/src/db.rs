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
