// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod models;
mod commands;

use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;
use tracing::info;
use tracing_subscriber;

#[tokio::main]
async fn main() {
    // Inicializar logging
    tracing_subscriber::fmt::init();
    
    // Carregar variáveis de ambiente
    dotenv().ok();
    
    info!("Iniciando Sistema de Gerenciamento de Pedidos...");

    // Configurar pool de conexões do banco de dados
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL deve estar definida no arquivo .env");
    
    info!("Conectando ao banco de dados...");
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Falha ao conectar com o banco de dados");

    info!("Conexão com banco de dados estabelecida!");

    // Executar aplicação Tauri
    tauri::Builder::default()
        .manage(pool)
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::login,
            // Orders
            commands::orders::get_orders,
            commands::orders::get_order_by_id,
            commands::orders::create_order,
            commands::orders::update_order,
            commands::orders::delete_order,
            commands::orders::get_orders_with_filters,
            // Clientes
            commands::clientes::get_clientes,
            commands::clientes::get_cliente_by_id,
            commands::clientes::create_cliente,
            commands::clientes::update_cliente,
            commands::clientes::delete_cliente,
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
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}

