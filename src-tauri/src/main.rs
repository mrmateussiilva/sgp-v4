#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod pdf_generator;

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
use commands::update::{get_app_version, fetch_changelog};
use commands::images::{
    save_image_locally,
    get_local_image_path,
    load_local_image_as_base64,
    read_image_file,
    cache_image_from_url,
    process_and_save_image,
};
use commands::pdf::generate_production_pdf;

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
            fetch_changelog,
            // Comandos de gerenciamento de imagens
            save_image_locally,
            get_local_image_path,
            load_local_image_as_base64,
            read_image_file,
            cache_image_from_url,
            process_and_save_image,
            // Comando de geração de PDF
            generate_production_pdf,
        ])
        .setup(|app| {
            let version = env!("CARGO_PKG_VERSION");
            let title = format!("SGP - Sistema de Gerenciamento de Pedidos v{}", version);

            // ─── Limpa cache WebView2 quando a versão do app muda ─────────────────
            // O WebView2 mantém cache em AppData (pasta EBWebView). Ao reinstalar
            // via MSI sem limpar esse cache, o Windows continua exibindo a interface
            // antiga. Aqui detectamos mudança de versão e forçamos limpeza do cache.
            #[cfg(target_os = "windows")]
            {
                if let Ok(data_dir) = app.path().app_local_data_dir() {
                    let version_file = data_dir.join("last_version.txt");
                    let webview_cache = data_dir.join("EBWebView");

                    // Lê a versão anterior gravada em disco
                    let last_version = std::fs::read_to_string(&version_file)
                        .unwrap_or_default();
                    let last_version = last_version.trim();

                    if last_version != version {
                        // Versão MUDOU → limpa o cache do WebView2
                        if webview_cache.exists() {
                            match std::fs::remove_dir_all(&webview_cache) {
                                Ok(_) => info!("Cache WebView2 limpo (versão {} → {})", last_version, version),
                                Err(e) => warn!("Falha ao limpar cache WebView2: {}", e),
                            }
                        }
                        // Grava a versão atual para a próxima inicialização
                        let _ = std::fs::create_dir_all(&data_dir);
                        let _ = std::fs::write(&version_file, version);
                        info!("Versão atualizada para {} em {:?}", version, version_file);
                    } else {
                        info!("Versão {} sem alteração, cache mantido.", version);
                    }
                }
            }
            // ─────────────────────────────────────────────────────────────────────

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
