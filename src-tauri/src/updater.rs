use tauri::{AppHandle, Emitter, Manager};
use tauri::async_runtime;
use tauri_plugin_updater::{UpdaterExt, Updater};
use tracing::{error, info, warn};

/// Função auxiliar para obter o updater
fn get_updater(app_handle: &AppHandle) -> Result<Updater, String> {
    app_handle
        .updater_builder()
        .build()
        .map_err(|e| format!("Erro ao criar updater: {}", e))
}

/// Verifica se há atualizações disponíveis
#[tauri::command]
pub async fn check_for_updates(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    info!("🔍 Verificando atualizações...");
    
    let updater = get_updater(&app_handle)?;
    match updater.check().await {
        Ok(Some(update)) => {
            let latest_version = update.version.clone();
            let body = update
                .body
                .clone()
                .unwrap_or_else(|| "Nova versão disponível".to_string());
            let date = update
                .date
                .as_ref()
                .map_or("".to_string(), |d| d.to_string());

            info!("✅ Atualização disponível: {}", latest_version);
            Ok(serde_json::json!({
                "available": true,
                "current_version": env!("CARGO_PKG_VERSION"),
                "latest_version": latest_version,
                "body": body,
                "date": date
            }))
        }
        Ok(None) => {
            info!("ℹ️ Nenhuma atualização disponível");
            Err("Nenhuma atualização disponível".to_string())
        }
        Err(e) => {
            error!("Erro ao buscar atualizações: {}", e);
            Err(format!("Erro ao verificar atualizações: {}", e))
        }
    }
}

/// Baixa e instala a atualização disponível
#[tauri::command]
pub async fn install_update(app_handle: AppHandle) -> Result<String, String> {
    info!("📥 Iniciando instalação de atualização...");
    
    let updater = get_updater(&app_handle)?;
    match updater.check().await {
        Ok(Some(update)) => {
            let latest_version = update.version.clone();
            info!("🚀 Baixando atualização: {}", latest_version);
            
            match update.download_and_install(|_chunk_length, _total| {}, || {}).await {
                Ok(_) => {
                    info!("✅ Atualização instalada com sucesso!");
                    info!("🔄 Reiniciando aplicação...");

                    let handle_clone = app_handle.clone();
                    async_runtime::spawn(async move {
                        handle_clone.restart();
                    });

                    Ok("Atualização instalada com sucesso! A aplicação será reiniciada.".to_string())
                }
                Err(e) => {
                    error!("❌ Erro ao instalar atualização: {}", e);
                    Err(format!("Erro ao instalar atualização: {}", e))
                }
            }
        }
        Ok(None) => {
            warn!("⚠️ Nenhuma atualização disponível para instalar");
            Err("Nenhuma atualização disponível".to_string())
        }
        Err(e) => {
            error!("Erro ao verificar atualizações antes de instalar: {}", e);
            Err(format!("Erro ao verificar atualizações: {}", e))
        }
    }
}

/// Obtém informações sobre a versão mais recente disponível
#[tauri::command]
pub async fn get_latest_version(app_handle: AppHandle) -> Result<String, String> {
    let updater = get_updater(&app_handle)?;
    match updater.check().await {
        Ok(Some(update)) => Ok(update.version),
        Ok(None) => Ok(env!("CARGO_PKG_VERSION").to_string()),
        Err(e) => Err(format!("Erro ao verificar última versão: {}", e)),
    }
}

/// Verifica atualizações automaticamente na inicialização
pub async fn check_updates_on_startup(app_handle: &AppHandle) {
    info!("🚀 Verificando atualizações na inicialização...");
    
    let updater = match get_updater(app_handle) {
        Ok(u) => u,
        Err(e) => {
            warn!("⚠️ Erro ao criar updater na inicialização: {}", e);
            return;
        }
    };
    match updater.check().await {
        Ok(Some(update)) => {
            let latest_version = update.version.clone();
            let body = update
                .body
                .clone()
                .unwrap_or_else(|| "Nova versão disponível".to_string());
            let date = update
                .date
                .as_ref()
                .map_or("".to_string(), |d| d.to_string());

            info!("📢 Nova versão disponível: {} (atual: {})", 
                  latest_version, 
                  env!("CARGO_PKG_VERSION"));
            
            // Emitir evento para o frontend
            if let Some(window) = app_handle.get_webview_window("main") {
                if let Err(e) = window.emit("update_available", serde_json::json!({
                    "current_version": env!("CARGO_PKG_VERSION"),
                    "latest_version": latest_version,
                    "body": body,
                    "date": date
                })) {
                    error!("Erro ao emitir evento de atualização: {}", e);
                }
            }
        }
        Ok(None) => {
            info!("✅ Aplicação está atualizada");
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
    let updater = get_updater(&app_handle)?;
    info!("✅ Updater obtido com sucesso");
    
    // Tentar verificar atualizações (pode falhar se não houver servidor)
    match updater.check().await {
        Ok(Some(update)) => Ok(format!("Atualização disponível: {}", update.version)),
        Ok(None) => Ok("Nenhuma atualização disponível".to_string()),
        Err(e) => Err(format!("Erro ao testar updater: {}", e)),
    }
}
