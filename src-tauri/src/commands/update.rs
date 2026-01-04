use tracing::info;

/// Obtém a versão atual da aplicação
#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    let version = env!("CARGO_PKG_VERSION");
    info!("Versão atual da aplicação: {}", version);
    Ok(version.to_string())
}

