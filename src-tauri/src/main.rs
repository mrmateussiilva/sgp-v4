// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sqlx::{migrate::MigrateError, postgres::PgPoolOptions, query};
use std::collections::HashSet;
use std::env;
use tracing::{error, info};
use tracing_subscriber;

mod commands;
mod config;
mod db;
mod env_loader;
mod migrator;
mod models;
mod session;
mod cache;
mod notifications;

use crate::migrator::MIGRATOR;
use crate::session::SessionManager;
use crate::cache::CacheManager;
use crate::config::AppConfig;
use crate::notifications::NotificationManager;

#[tokio::main]
async fn main() {
    // Inicializar logging
    tracing_subscriber::fmt::init();

    // Carregar variáveis de ambiente
    match crate::env_loader::load_env_file() {
        Ok(_) => info!("Arquivo .env carregado com sucesso"),
        Err(e) => {
            error!("Erro ao carregar arquivo .env: {}. Usando variáveis de ambiente do sistema.", e);
        }
    }

    info!("Iniciando Sistema de Gerenciamento de Pedidos...");

    // Carregar configurações da aplicação
    let config = match AppConfig::from_env() {
        Ok(config) => {
            info!("Configurações carregadas com sucesso");
            info!("URL do banco: {}", config.get_masked_database_url());
            config
        }
        Err(e) => {
            error!("Erro ao carregar configurações: {}", e);
            panic!("Falha ao carregar configurações da aplicação");
        }
    };

    info!("Conectando ao banco de dados...");

    let pool = PgPoolOptions::new()
        .max_connections(config.database.max_connections)
        .connect(&config.database.url)
        .await
        .expect("Falha ao conectar com o banco de dados. Verifique as configurações no arquivo .env");

    info!("Conexão com banco de dados estabelecida!");

    // Controlar execução de migrações via variáveis de ambiente
    // Padrão: em produção, não roda migrações; em desenvolvimento, roda.
    let app_env = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());
    let run_migrations_env = env::var("RUN_MIGRATIONS").ok();
    let run_migrations = match run_migrations_env.as_deref() {
        Some("true") | Some("1") => true,
        Some("false") | Some("0") => false,
        _ => app_env != "production",
    };

    if run_migrations {
        info!("Verificando migrações pendentes (APP_ENV={}, RUN_MIGRATIONS={:?})...", app_env, run_migrations_env);
        let mut cleaned_versions = HashSet::new();
        loop {
            match MIGRATOR.run(&pool).await {
                Ok(()) => break,
                Err(MigrateError::VersionMissing(version)) => {
                    if !cleaned_versions.insert(version) {
                        panic!("Versão de migração ausente ({version}) persiste após limpeza");
                    }
                    tracing::warn!(
                        "Versão de migração ausente ({version}); removendo marcador e tentando novamente."
                    );
                    if let Err(clean_err) = query("DELETE FROM _sqlx_migrations WHERE version = $1")
                        .bind(version)
                        .execute(&pool)
                        .await
                    {
                        tracing::error!(
                            "Falha ao remover marcador da migração ausente ({version}): {clean_err}"
                        );
                        panic!("Falha ao preparar migrações do banco de dados");
                    }
                    continue;
                }
                Err(MigrateError::VersionMismatch(version)) => {
                    if !cleaned_versions.insert(version) {
                        panic!("Versão de migração inconsistente ({version}) persiste após limpeza");
                    }
                    tracing::warn!(
                        "Versão de migração inconsistente ({version}); removendo marcador e tentando novamente."
                    );
                    if let Err(clean_err) = query("DELETE FROM _sqlx_migrations WHERE version = $1")
                        .bind(version)
                        .execute(&pool)
                        .await
                    {
                        tracing::error!(
                            "Falha ao remover marcador da migração inconsistente ({version}): {clean_err}"
                        );
                        panic!("Falha ao preparar migrações do banco de dados");
                    }
                    continue;
                }
                Err(other) => {
                    panic!("Falha ao aplicar migrações do banco de dados: {other}");
                }
            }
        }
        info!("Migrações aplicadas com sucesso!");
    } else {
        info!("Pulado: execução de migrações (APP_ENV={}, RUN_MIGRATIONS={:?})", app_env, run_migrations_env);
    }

    // Executar aplicação Tauri
    tauri::Builder::default()
        .manage(pool)
        .manage(SessionManager::new(config.session_timeout_hours as i64))
        .manage(CacheManager::with_default_ttl(config.cache_ttl_seconds))
        .manage(NotificationManager::new())
        .setup(|_app| {
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::login,
            commands::auth::logout,
            // Orders
            commands::orders::get_orders,
            commands::orders::get_pending_orders_light,
            commands::orders::get_pending_orders_paginated,
            commands::orders::get_ready_orders_paginated,
            commands::orders::get_order_by_id,
            commands::orders::create_order,
            commands::orders::update_order_metadata,
            commands::orders::update_order,
            commands::orders::update_order_status_flags,
            commands::orders::delete_order,
            commands::orders::get_orders_with_filters,
            commands::orders::get_orders_by_delivery_date,
            commands::orders::get_order_audit_log,
            commands::orders::get_order_ficha,
            // Notifications
            notifications::subscribe_to_notifications,
            notifications::unsubscribe_from_notifications,
            notifications::get_notification_subscriber_count,
            // Reports
            commands::reports::generate_report,
            // Clientes
            commands::clientes::get_clientes,
            commands::clientes::get_clientes_paginated,
            commands::clientes::get_cliente_by_id,
            commands::clientes::create_cliente,
            commands::clientes::update_cliente,
            commands::clientes::delete_cliente,
            commands::clientes::import_clientes_bulk,
            // Materiais
            commands::materiais::get_materiais,
            commands::materiais::get_materiais_ativos,
            commands::materiais::get_material_by_id,
            commands::materiais::create_material,
            commands::materiais::update_material,
            commands::materiais::delete_material,
            // Designers
            commands::designers::get_designers,
            commands::designers::get_designers_ativos,
            commands::designers::get_designer_by_id,
            commands::designers::create_designer,
            commands::designers::update_designer,
            commands::designers::delete_designer,
            // Vendedores
            commands::vendedores::get_vendedores,
            commands::vendedores::get_vendedores_ativos,
            commands::vendedores::get_vendedor_by_id,
            commands::vendedores::create_vendedor,
            commands::vendedores::update_vendedor,
            commands::vendedores::delete_vendedor,
            // Formas de Envio
            commands::formas_envio::get_formas_envio,
            commands::formas_envio::get_formas_envio_ativas,
            commands::formas_envio::get_forma_envio_by_id,
            commands::formas_envio::create_forma_envio,
            commands::formas_envio::update_forma_envio,
            commands::formas_envio::delete_forma_envio,
            // Formas de Pagamento
            commands::formas_pagamento::get_formas_pagamento,
            commands::formas_pagamento::get_formas_pagamento_ativas,
            commands::formas_pagamento::get_forma_pagamento_by_id,
            commands::formas_pagamento::create_forma_pagamento,
            commands::formas_pagamento::update_forma_pagamento,
            commands::formas_pagamento::delete_forma_pagamento,
            // Users
            commands::users::get_users,
            commands::users::get_user_by_id,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}
