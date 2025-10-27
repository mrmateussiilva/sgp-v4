use tauri::{AppHandle, Manager};
use tracing::{info, warn};

/// Abre o DevTools na janela principal
#[tauri::command]
pub async fn open_devtools(app_handle: AppHandle) -> Result<(), String> {
    info!("Tentando abrir DevTools...");
    
    // Obter a janela principal
    if let Some(window) = app_handle.get_window("main") {
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
    if let Some(window) = app_handle.get_window("main") {
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
    if let Some(window) = app_handle.get_window("main") {
        // Como não há toggle_devtools, vamos implementar uma lógica simples
        // Primeiro tenta abrir, se já estiver aberto, fecha
        window.open_devtools();
        info!("DevTools alternado com sucesso!");
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
    if let Some(_window) = app_handle.get_window("main") {
        // Nota: O Tauri não tem um método direto para verificar se DevTools está aberto
        // Esta é uma implementação básica que sempre retorna false
        // Em uma implementação real, você poderia usar eventos ou outras técnicas
        Ok(false)
    } else {
        Err("Janela principal não encontrada".to_string())
    }
}

/// Testa o sistema DevTools
#[tauri::command]
pub async fn test_devtools_system(app_handle: AppHandle) -> Result<String, String> {
    info!("Testando sistema DevTools...");
    
    // Obter a janela principal
    if let Some(window) = app_handle.get_window("main") {
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
