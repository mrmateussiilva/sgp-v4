use tracing::info;

/// Obtém a versão atual da aplicação
#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    let version = env!("CARGO_PKG_VERSION");
    info!("Versão atual da aplicação: {}", version);
    Ok(version.to_string())
}

/// Busca o CHANGELOG.md da release no repositório
#[tauri::command]
pub async fn fetch_changelog(version: String) -> Result<String, String> {
    info!("Buscando CHANGELOG para versão: {}", version);
    
    // URL do CHANGELOG.md no repositório
    let changelog_url = format!(
        "https://raw.githubusercontent.com/mrmateussiilva/sgp-v4/main/documentation/CHANGELOG.md"
    );
    
    match reqwest::get(&changelog_url).await {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(content) => {
                        info!("CHANGELOG obtido com sucesso");
                        Ok(content)
                    }
                    Err(e) => {
                        let error_msg = format!("Erro ao ler conteúdo do CHANGELOG: {}", e);
                        info!("{}", error_msg);
                        Err(error_msg)
                    }
                }
            } else {
                let error_msg = format!("Erro HTTP ao buscar CHANGELOG: {}", response.status());
                info!("{}", error_msg);
                Err(error_msg)
            }
        }
        Err(e) => {
            let error_msg = format!("Erro ao buscar CHANGELOG: {}", e);
            info!("{}", error_msg);
            Err(error_msg)
        }
    }
}
