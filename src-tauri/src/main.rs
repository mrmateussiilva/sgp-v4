// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dotenv::dotenv;
use sqlx::{migrate::MigrateError, postgres::PgPoolOptions, query};
use std::collections::HashSet;
use std::env;
use tauri::Manager;
use tracing::{error, info};
use tracing_subscriber;

mod commands;
mod db;
mod migrator;
mod models;
mod session;

use crate::migrator::MIGRATOR;
use crate::session::SessionManager;

#[tokio::main]
async fn main() {
    // Inicializar logging
    tracing_subscriber::fmt::init();

    // Carregar variáveis de ambiente
    dotenv().ok();

    info!("Iniciando Sistema de Gerenciamento de Pedidos...");

    // Configurar pool de conexões do banco de dados
    let database_url =
        env::var("DATABASE_URL").expect("DATABASE_URL deve estar definida no arquivo .env");

    info!("Conectando ao banco de dados...");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Falha ao conectar com o banco de dados");

    info!("Conexão com banco de dados estabelecida!");

    info!("Verificando migrações pendentes...");
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

    // Executar aplicação Tauri
    tauri::Builder::default()
        .manage(pool)
        .manage(SessionManager::new(12))
        .setup(|app| {
            let handle = app.handle();

            handle.listen_global("tauri://update-status", |event| {
                if let Some(payload) = event.payload() {
                    info!("Status do atualizador: {}", payload);
                }
            });

            let updater_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = updater_handle.updater().check().await {
                    error!("Erro ao verificar atualizações: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::login,
            commands::auth::logout,
            // Orders
            commands::orders::get_orders,
            commands::orders::get_order_by_id,
            commands::orders::create_order,
            commands::orders::update_order_metadata,
            commands::orders::update_order,
            commands::orders::update_order_status_flags,
            commands::orders::delete_order,
            commands::orders::get_orders_with_filters,
            commands::orders::get_orders_by_delivery_date,
            commands::orders::get_order_audit_log,
            // Reports
            commands::reports::generate_report,
            // Clientes
            commands::clientes::get_clientes,
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
