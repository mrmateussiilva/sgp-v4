use tauri::{AppHandle, Manager};
use tracing::{error, info, warn};

/// Verifica se há atualizações disponíveis
#[tauri::command]
pub async fn check_for_updates(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    info!("🔍 Verificando atualizações...");
    
    let updater = app_handle.updater();
    match updater.check().await {
        Ok(update) => {
            if update.is_update_available() {
                info!("✅ Atualização disponível: {}", update.latest_version());
                Ok(serde_json::json!({
                    "available": true,
                    "current_version": env!("CARGO_PKG_VERSION"),
                    "latest_version": update.latest_version(),
                    "body": update.body().map_or("Nova versão disponível".to_string(), |v| v.clone()),
                    "date": update.date().map_or("".to_string(), |d| d.to_string())
                }))
            } else {
                info!("ℹ️ Nenhuma atualização disponível");
                Err("Nenhuma atualização disponível".to_string())
            }
        }
        Err(e) => {
            error!("❌ Erro ao verificar atualizações: {}", e);
            Err(format!("Erro ao verificar atualizações: {}", e))
        }
    }
}

/// Baixa e instala a atualização disponível
#[tauri::command]
pub async fn install_update(app_handle: AppHandle) -> Result<String, String> {
    info!("📥 Iniciando instalação de atualização...");
    
    let updater = app_handle.updater();
    match updater.check().await {
        Ok(update) => {
            if update.is_update_available() {
                info!("🚀 Baixando atualização: {}", update.latest_version());
                
                match update.download_and_install().await {
                    Ok(_) => {
                        info!("✅ Atualização instalada com sucesso!");
                        info!("🔄 Reiniciando aplicação...");
                        
                        // Reiniciar a aplicação
                        app_handle.restart();
                        
                        Ok("Atualização instalada com sucesso! A aplicação será reiniciada.".to_string())
                    }
                    Err(e) => {
                        error!("❌ Erro ao instalar atualização: {}", e);
                        Err(format!("Erro ao instalar atualização: {}", e))
                    }
                }
            } else {
                warn!("⚠️ Nenhuma atualização disponível para instalar");
                Err("Nenhuma atualização disponível".to_string())
            }
        }
        Err(e) => {
            error!("❌ Erro ao verificar atualizações: {}", e);
            Err(format!("Erro ao verificar atualizações: {}", e))
        }
    }
}

/// Obtém informações sobre a versão atual
#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

/// Obtém informações sobre a versão mais recente disponível
#[tauri::command]
pub async fn get_latest_version(app_handle: AppHandle) -> Result<String, String> {
    let updater = app_handle.updater();
    match updater.check().await {
        Ok(update) => {
            if update.is_update_available() {
                Ok(update.latest_version().to_string())
            } else {
                Ok(env!("CARGO_PKG_VERSION").to_string())
            }
        }
        Err(e) => {
            error!("❌ Erro ao verificar versão mais recente: {}", e);
            Err(format!("Erro ao verificar versão: {}", e))
        }
    }
}

/// Verifica atualizações automaticamente na inicialização
pub async fn check_updates_on_startup(app_handle: &AppHandle) {
    info!("🚀 Verificando atualizações na inicialização...");
    
    let updater = app_handle.updater();
    match updater.check().await {
        Ok(update) => {
            if update.is_update_available() {
                info!("📢 Nova versão disponível: {} (atual: {})", 
                      update.latest_version(), 
                      env!("CARGO_PKG_VERSION"));
                
                // Emitir evento para o frontend
                app_handle.emit_all("update_available", serde_json::json!({
                    "current_version": env!("CARGO_PKG_VERSION"),
                    "latest_version": update.latest_version(),
                    "body": update.body().map_or("Nova versão disponível".to_string(), |v| v.clone()),
                    "date": update.date().map_or("".to_string(), |d| d.to_string())
                })).unwrap_or_else(|e| {
                    error!("Erro ao emitir evento de atualização: {}", e);
                });
            } else {
                info!("✅ Aplicação está atualizada");
            }
        }
        Err(e) => {
            warn!("⚠️ Erro ao verificar atualizações na inicialização: {}", e);
        }
    }
}

/// Teste simples do sistema de updater
#[tauri::command]
pub async fn test_updater_simple(app_handle: AppHandle) -> Result<String, String> {
    info!("🧪 Testando sistema de updater...");
    
    // Testar se o updater está disponível
    let updater = app_handle.updater();
    info!("✅ Updater obtido com sucesso");
    
    // Tentar verificar atualizações (pode falhar se não houver servidor)
    match updater.check().await {
        Ok(update) => {
            if update.is_update_available() {
                Ok(format!("Atualização disponível: {}", update.latest_version()))
            } else {
                Ok("Nenhuma atualização disponível".to_string())
            }
        }
        Err(e) => {
            info!("⚠️ Erro ao verificar atualizações (esperado se não houver servidor): {}", e);
            Ok(format!("Sistema de updater funcionando, mas sem servidor: {}", e))
        }
    }
}
