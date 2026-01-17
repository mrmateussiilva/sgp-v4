use serde::Deserialize;
use tracing::info;

/// Obtém a versão atual da aplicação
#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    let version = env!("CARGO_PKG_VERSION");
    info!("Versão atual da aplicação: {}", version);
    Ok(version.to_string())
}

/// Estrutura para deserializar a resposta da API do GitHub Releases
#[derive(Deserialize, Debug)]
struct GitHubRelease {
    #[serde(rename = "tag_name")]
    tag_name: String,
    body: Option<String>,
}

/// Busca o changelog da release no GitHub
#[tauri::command]
pub async fn fetch_changelog(version: String) -> Result<String, String> {
    info!("Buscando changelog da release no GitHub para versão: {}", version);
    
    // Normalizar versão para formato de tag (adicionar 'v' se não tiver)
    let tag = if version.starts_with('v') {
        version.clone()
    } else {
        format!("v{}", version)
    };
    
    // URL da API do GitHub para buscar release específica por tag
    let api_url = format!(
        "https://api.github.com/repos/mrmateussiilva/sgp-v4/releases/tags/{}",
        tag
    );
    
    info!("Buscando release no GitHub: {}", api_url);
    
    match reqwest::get(&api_url).await {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<GitHubRelease>().await {
                    Ok(release) => {
                        info!("Release obtida com sucesso: {}", release.tag_name);
                        
                        // Retornar o body da release (changelog) ou mensagem padrão se vazio
                        match release.body {
                            Some(body) if !body.trim().is_empty() => {
                                Ok(body)
                            }
                            _ => {
                                info!("Release sem body, retornando mensagem padrão");
                                Ok(format!(
                                    "## Versão {}\n\nNenhum changelog disponível para esta versão.",
                                    version
                                ))
                            }
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("Erro ao parsear resposta do GitHub: {}", e);
                        info!("{}", error_msg);
                        Err(error_msg)
                    }
                }
            } else if response.status() == 404 {
                let error_msg = format!(
                    "Release não encontrada no GitHub para a versão {} (tag: {})",
                    version, tag
                );
                info!("{}", error_msg);
                Err(error_msg)
            } else {
                let error_msg = format!(
                    "Erro HTTP ao buscar release no GitHub: {}",
                    response.status()
                );
                info!("{}", error_msg);
                Err(error_msg)
            }
        }
        Err(e) => {
            let error_msg = format!("Erro ao buscar release no GitHub: {}", e);
            info!("{}", error_msg);
            Err(error_msg)
        }
    }
}
