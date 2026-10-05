use tauri::{AppHandle, Manager};
use tracing::{info, warn};

/// Abre o DevTools na janela principal
#[tauri::command]
pub async fn open_devtools(app_handle: AppHandle) -> Result<(), String> {
    info!("Tentando abrir DevTools...");

    // Obter a janela principal
    if let Some(window) = app_handle.get_webview_window("main") {
        window.open_devtools();
        info!("DevTools aberto com sucesso!");
        Ok(())
    } else {
        warn!("Janela principal não encontrada");
        Err("Janela principal não encontrada".to_string())
    }
}

/// Fecha o DevTools na janela principal
#[tauri::command]
pub async fn close_devtools(app_handle: AppHandle) -> Result<(), String> {
    info!("Tentando fechar DevTools...");

    // Obter a janela principal
    if let Some(window) = app_handle.get_webview_window("main") {
        window.close_devtools();
        info!("DevTools fechado com sucesso!");
        Ok(())
    } else {
        warn!("Janela principal não encontrada");
        Err("Janela principal não encontrada".to_string())
    }
}

/// Alterna o estado do DevTools (abre se fechado, fecha se aberto)
#[tauri::command]
pub async fn toggle_devtools(app_handle: AppHandle) -> Result<(), String> {
    info!("Alternando estado do DevTools...");

    // Obter a janela principal
    if let Some(window) = app_handle.get_webview_window("main") {
        if window.is_devtools_open() {
            window.close_devtools();
            info!("DevTools fechado com sucesso!");
        } else {
            window.open_devtools();
            info!("DevTools aberto com sucesso!");
        }
        Ok(())
    } else {
        warn!("Janela principal não encontrada");
        Err("Janela principal não encontrada".to_string())
    }
}

/// Verifica se o DevTools está aberto
#[tauri::command]
pub async fn is_devtools_open(app_handle: AppHandle) -> Result<bool, String> {
    // Obter a janela principal
    if let Some(window) = app_handle.get_webview_window("main") {
        Ok(window.is_devtools_open())
    } else {
        Err("Janela principal não encontrada".to_string())
    }
}

/// Testa o sistema DevTools
#[tauri::command]
pub async fn test_devtools_system(app_handle: AppHandle) -> Result<String, String> {
    info!("Testando sistema DevTools...");

    // Obter a janela principal
    if let Some(window) = app_handle.get_webview_window("main") {
        // Testa abrir DevTools
        window.open_devtools();
        info!("✅ DevTools aberto com sucesso no teste");

        window.close_devtools();
        info!("✅ DevTools fechado com sucesso no teste");
        Ok("Sistema DevTools testado com sucesso!".to_string())
    } else {
        Err("Janela principal não encontrada".to_string())
    }
}
