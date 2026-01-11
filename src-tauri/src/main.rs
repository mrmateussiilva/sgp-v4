#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri::Manager;
use tracing::{info, warn};
#[cfg(debug_assertions)]
use commands::devtools::{
    close_devtools,
    is_devtools_open,
    open_devtools,
    test_devtools_system,
    toggle_devtools,
};
use commands::update::get_app_version;
use commands::manual_updater::{
    check_update_manual,
    download_update_manual,
    install_update_manual,
};
use commands::images::{
    save_image_locally,
    get_local_image_path,
    load_local_image_as_base64,
    read_image_file,
    cache_image_from_url,
    process_and_save_image,
};

fn main() {
    setup_tracing();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            #[cfg(debug_assertions)]
            open_devtools,
            #[cfg(debug_assertions)]
            close_devtools,
            #[cfg(debug_assertions)]
            toggle_devtools,
            #[cfg(debug_assertions)]
            is_devtools_open,
            #[cfg(debug_assertions)]
            test_devtools_system,
            get_app_version,
            check_update_manual,
            download_update_manual,
            install_update_manual,
            // Comandos de gerenciamento de imagens
            save_image_locally,
            get_local_image_path,
            load_local_image_as_base64,
            read_image_file,
            cache_image_from_url,
            process_and_save_image,
        ])
        .setup(|app| {
            // Atualizar título da janela com a versão
            let version = env!("CARGO_PKG_VERSION");
            let title = format!("SGP - Sistema de Gerenciamento de Pedidos v{}", version);
            
            if let Some(window) = app.get_webview_window("main") {
                window.set_title(&title).unwrap_or_else(|e| {
                    warn!("Erro ao definir título da janela: {}", e);
                });
                
                // Maximizar a janela ao abrir
                window.maximize().unwrap_or_else(|e| {
                    warn!("Erro ao maximizar janela: {}", e);
                });
                
                info!("Título da janela definido: {}", title);
            }
            
            info!("Janela principal pronta: {:?}", app.get_webview_window("main").is_some());
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
