#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod updater;

use tauri::Manager;
use tracing::info;
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
use updater::install_update;

fn main() {
    setup_tracing();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            open_devtools,
            close_devtools,
            toggle_devtools,
            is_devtools_open,
            test_devtools_system,
            get_app_version,
            install_update,
            check_update_manual,
            download_update_manual,
            install_update_manual
        ])
        .setup(|app| {
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
