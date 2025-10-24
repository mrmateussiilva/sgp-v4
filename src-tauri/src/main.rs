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
mod logging;
mod migrator;
mod models;
mod session;
mod cache;
mod notifications;
mod order_polling;
mod updater;

use crate::migrator::MIGRATOR;
use crate::session::SessionManager;
use crate::cache::CacheManager;
use crate::config::AppConfig;
use crate::order_polling::start_order_polling;
use crate::updater::check_updates_on_startup;
use crate::logging::{LogManager, LogConfig, log_system_start};
use std::sync::Mutex;
// Sistema de notificações simples - sem complexidade desnecessária
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
    // Inicializar sistema de logs avançado
    let log_config = LogConfig::from_env();
    let log_manager = match LogManager::new(log_config) {
        Ok(manager) => {
            info!("Sistema de logs inicializado com sucesso");
            manager
        }
        Err(e) => {
            eprintln!("Erro ao inicializar sistema de logs: {}", e);
            // Fallback para logging básico
            tracing_subscriber::fmt()
                .with_max_level(tracing::Level::INFO)
                .init();
            return;
        }
    };

    // Log de inicialização do sistema
    log_system_start();
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
        .manage(Mutex::new(Some(log_manager)))
        .setup(|app| {
            info!("🚀 Sistema de notificações simples iniciado");
            
                // Iniciar sistema de polling de pedidos
                let app_handle = app.handle().clone();
                let pool = app.state::<sqlx::PgPool>().inner().clone();
                start_order_polling(app_handle.clone(), pool);
                
                // Verificar atualizações na inicialização
                tokio::spawn(async move {
                    check_updates_on_startup(&app_handle).await;
                });
                
                // Configurar atalhos de teclado para DevTools
                if let Some(window) = app.get_window("main") {
                    // F12 para alternar DevTools
                    window.listen("toggle_devtools", |event| {
                        if let Some(window) = event.window() {
                            let _ = window.toggle_devtools();
                        }
                    });
                    
                    // Ctrl+Shift+I para alternar DevTools
                    window.listen("open_devtools", |event| {
                        if let Some(window) = event.window() {
                            let _ = window.open_devtools();
                        }
                    });
                }
                
                info!("🔄 Sistema de polling de pedidos iniciado (verificação a cada 60s)");
                info!("🔄 Sistema de atualizações automáticas ativado");
                info!("🛠️ DevTools configurado - Use F12 ou Ctrl+Shift+I para abrir");
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
            // DevTools
            commands::devtools::open_devtools,
            commands::devtools::close_devtools,
            commands::devtools::toggle_devtools,
            commands::devtools::is_devtools_open,
            // Logs
            commands::logs::get_log_stats,
            commands::logs::get_log_files,
            commands::logs::get_log_content,
            commands::logs::get_recent_logs,
            commands::logs::search_logs,
            commands::logs::clear_logs,
            commands::logs::test_logging_system,
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
            // Notifications simples
            notifications::test_simple_notification,
            // Order Polling
            order_polling::test_order_polling,
            order_polling::force_order_check,
            // Updater
            updater::check_for_updates,
            updater::install_update,
            updater::get_app_version,
            updater::get_latest_version,
            updater::test_updater_simple,
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
