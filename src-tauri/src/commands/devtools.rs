use tauri::{AppHandle, Manager, Window};
use tracing::{info, warn};

/// Abre o DevTools na janela principal
#[tauri::command]
pub async fn open_devtools(app_handle: AppHandle) -> Result<(), String> {
    info!("Tentando abrir DevTools...");
    
    // Obter a janela principal
    if let Some(window) = app_handle.get_window("main") {
        match window.open_devtools() {
            Ok(_) => {
                info!("DevTools aberto com sucesso!");
                Ok(())
            }
            Err(e) => {
                warn!("Erro ao abrir DevTools: {}", e);
                Err(format!("Erro ao abrir DevTools: {}", e))
            }
        }
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
    if let Some(window) = app_handle.get_window("main") {
        match window.close_devtools() {
            Ok(_) => {
                info!("DevTools fechado com sucesso!");
                Ok(())
            }
            Err(e) => {
                warn!("Erro ao fechar DevTools: {}", e);
                Err(format!("Erro ao fechar DevTools: {}", e))
            }
        }
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
    if let Some(window) = app_handle.get_window("main") {
        match window.toggle_devtools() {
            Ok(_) => {
                info!("DevTools alternado com sucesso!");
                Ok(())
            }
            Err(e) => {
                warn!("Erro ao alternar DevTools: {}", e);
                Err(format!("Erro ao alternar DevTools: {}", e))
            }
        }
    } else {
        warn!("Janela principal não encontrada");
        Err("Janela principal não encontrada".to_string())
    }
}

/// Verifica se o DevTools está aberto
#[tauri::command]
pub async fn is_devtools_open(app_handle: AppHandle) -> Result<bool, String> {
    // Obter a janela principal
    if let Some(window) = app_handle.get_window("main") {
        // Nota: O Tauri não tem um método direto para verificar se DevTools está aberto
        // Esta é uma implementação básica que sempre retorna false
        // Em uma implementação real, você poderia usar eventos ou outras técnicas
        Ok(false)
    } else {
        Err("Janela principal não encontrada".to_string())
    }
}
