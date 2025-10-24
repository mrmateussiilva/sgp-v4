// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sqlx::{migrate::MigrateError, query};
use std::collections::HashSet;
use std::env;
use tracing::{error, info};
use tracing_subscriber;
use tauri::Manager;

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
use crate::commands::database::{test_db_connection, test_db_connection_with_pool, save_db_config, load_db_config, delete_db_config};
use crate::db::try_connect_db;

/// Conecta ao banco usando o sistema profissional de migrações
async fn try_connect_with_migrations() -> Result<(sqlx::PgPool, AppConfig), String> {
    // Primeiro, tenta carregar configuração do arquivo db_config.json
    if let Ok(Some(db_config)) = load_db_config() {
        info!("Configuração de banco encontrada em db_config.json");
        let db_url = db_config.to_database_url();
        
        // Definir DATABASE_URL para o sistema de migrações
        std::env::set_var("DATABASE_URL", &db_url);
        
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
    match crate::env_loader::load_env_file() {
        Ok(_) => info!("Arquivo .env carregado com sucesso"),
        Err(e) => {
            error!("Erro ao carregar arquivo .env: {}. Usando variáveis de ambiente do sistema.", e);
        }
    }

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

#[tokio::main]
async fn main() {
    // Inicializar logging
    tracing_subscriber::fmt::init();

    info!("Iniciando Sistema de Gerenciamento de Pedidos...");

    // Tentar conectar ao banco de dados usando sistema profissional de migrações
    let (pool, config) = match try_connect_with_migrations().await {
        Ok((pool, config)) => (pool, config),
        Err(e) => {
            error!("Falha ao conectar ao banco de dados: {}", e);
            
            // Executar aplicação Tauri em modo de configuração de banco
            tauri::Builder::default()
                .setup(|_app| {
                    Ok(())
                })
                .invoke_handler(tauri::generate_handler![
                    test_db_connection,
                    save_db_config,
                    load_db_config,
                    delete_db_config,
                ])
                .run(tauri::generate_context!())
                .expect("Erro ao executar aplicação Tauri");
            return;
        }
    };

    info!("Conexão com banco de dados estabelecida!");

    // Carregar configurações da aplicação para migrações (já temos a config)

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
        .setup(|app| {
            // Iniciar sistema de heartbeat para notificações
            let notification_manager = app.state::<NotificationManager>();
            let manager_clone = notification_manager.inner().clone();
            
            tokio::spawn(async move {
                manager_clone.start_heartbeat_monitor().await;
            });
            
            info!("🚀 Sistema de heartbeat iniciado para notificações globais");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Database
            test_db_connection,
            test_db_connection_with_pool,
            save_db_config,
            load_db_config,
            delete_db_config,
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
            notifications::test_notification_broadcast,
            // Broadcast Global
            notifications::send_heartbeat,
            notifications::get_active_clients,
            notifications::broadcast_status_update,
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
