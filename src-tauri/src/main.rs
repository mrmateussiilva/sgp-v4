#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tracing::info;

fn main() {
    setup_tracing();

    tauri::Builder::default()
        .setup(|app| {
            info!("Janela principal pronta: {:?}", app.get_window("main").is_some());
            info!("Backend Rust apenas inicializa a interface. Toda comunicação de rede acontece no frontend.");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar aplicação Tauri");
}

fn setup_tracing() {
    let level = if cfg!(debug_assertions) {
        tracing::Level::DEBUG
    } else {
        tracing::Level::INFO
    };

    let _ = tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(false)
        .with_thread_ids(false)
        .with_thread_names(false)
        .compact()
        .try_init();
}
