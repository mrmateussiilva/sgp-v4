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
            commands::auth::login,
            commands::orders::get_orders,
            commands::orders::get_order_by_id,
            commands::orders::create_order,
            commands::orders::update_order,
            commands::orders::delete_order,
            commands::orders::get_orders_with_filters,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}

