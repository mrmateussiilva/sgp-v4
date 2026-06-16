#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod state;
mod pdf_generator;

#[cfg(debug_assertions)]
use commands::devtools::{
    close_devtools, is_devtools_open, open_devtools, test_devtools_system, toggle_devtools,
};
use commands::images::{
    cache_image_from_url, get_local_image_path, load_local_image_as_base64, process_and_save_image,
    read_image_file, save_image_locally,
};
use commands::pdf::generate_production_pdf;
use commands::update::{fetch_changelog, get_app_version};
use commands::api::{set_api_config, rust_api_get, rust_api_mutate};
use tauri::Manager;
use tracing::{info, warn};

fn main() {
    setup_tracing();

    // ─── Limpa cache WebView2 ANTES de iniciar o builder ─────────────────────
    // CRÍTICO: esta limpeza DEVE ocorrer antes de tauri::Builder::default(),
    // pois o WebView2 trava (file lock) os arquivos de EBWebView assim que
    // a janela é criada. Dentro de .setup() já é tarde demais — o remove_dir_all
    // falha silenciosamente com "Access Denied" no Windows.
    #[cfg(target_os = "windows")]
    clear_webview2_cache_if_version_changed();
    // ─────────────────────────────────────────────────────────────────────────

    tauri::Builder::default()
        .manage(state::AppState::new())
        .plugin(tauri_plugin_notification::init())
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
            set_api_config,
            rust_api_get,
            rust_api_mutate,
        ])
        .setup(|app| {
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

/// Limpa o cache do WebView2 quando a versão do app muda.
///
/// Esta função DEVE ser chamada antes de `tauri::Builder::default()`.
/// O WebView2 trava todos os arquivos de `EBWebView` no momento em que a
/// janela é criada. Tentar remover depois (ex: dentro de `.setup()`) resulta
/// em "Access Denied" silencioso no Windows.
///
/// O path do cache é procurado em múltiplos locais porque o WebView2
/// pode gravar em subdiretórios variados dependendo do identificador do app
/// e do modo de instalação (per-user vs machine-wide).
#[cfg(target_os = "windows")]
fn clear_webview2_cache_if_version_changed() {
    let version = env!("CARGO_PKG_VERSION");

    // Resolve o %LOCALAPPDATA% do usuário atual via variável de ambiente,
    // sem depender do handle do app Tauri (que ainda não existe nesse ponto).
    let local_app_data = match std::env::var("LOCALAPPDATA") {
        Ok(p) => std::path::PathBuf::from(p),
        Err(_) => {
            warn!("[WebView2Cache] LOCALAPPDATA não encontrado, pulando limpeza.");
            return;
        }
    };

    // Identificador do bundle definido em tauri.conf.json → "identifier"
    // O Tauri v2 grava os dados do app em: %LOCALAPPDATA%\<identifier>\
    let app_identifier = "com.sgp.desktop";
    let data_dir = local_app_data.join(app_identifier);
    let version_file = data_dir.join("last_version.txt");

    // Lê a versão anterior gravada em disco
    let last_version = std::fs::read_to_string(&version_file)
        .unwrap_or_default();
    let last_version = last_version.trim().to_string();

    if last_version == version {
        info!("[WebView2Cache] Versão {} sem alteração, cache mantido.", version);
        return;
    }

    info!(
        "[WebView2Cache] Versão mudou ({} → {}). Limpando cache WebView2...",
        if last_version.is_empty() { "nova instalação".to_string() } else { last_version.clone() },
        version
    );

    // O WebView2 pode colocar EBWebView em diferentes sub-pastas.
    // Tentamos todos os caminhos conhecidos para garantir a limpeza.
    let candidate_paths = [
        // Padrão Tauri v2: %LOCALAPPDATA%\<identifier>\EBWebView
        data_dir.join("EBWebView"),
        // Alguns builds usam o nome do produto como pasta pai
        local_app_data
            .join("SGP - Sistema de Gerenciamento de Pedidos")
            .join("EBWebView"),
    ];

    let mut cleaned_any = false;
    for cache_path in &candidate_paths {
        // Confirma que é realmente uma pasta WebView2 checando subpasta "Default"
        if cache_path.exists() && cache_path.join("Default").exists() {
            match std::fs::remove_dir_all(cache_path) {
                Ok(_) => {
                    info!("[WebView2Cache] Cache removido: {:?}", cache_path);
                    cleaned_any = true;
                }
                Err(e) => {
                    // Isso não deveria acontecer aqui (antes do builder),
                    // mas registramos caso haja problema de permissão.
                    warn!("[WebView2Cache] Falha ao remover {:?}: {}", cache_path, e);
                }
            }
        }
    }

    if !cleaned_any {
        info!("[WebView2Cache] Nenhuma pasta de cache encontrada — pode ser primeira instalação.");
    }

    // Persiste a versão atual para comparação na próxima inicialização
    let _ = std::fs::create_dir_all(&data_dir);
    if let Err(e) = std::fs::write(&version_file, version) {
        warn!("[WebView2Cache] Falha ao gravar version file: {}", e);
    } else {
        info!("[WebView2Cache] Versão {} registrada em {:?}", version, version_file);
    }
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
