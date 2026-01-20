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
    info!("Buscando changelog para versão: {}", version);
    
    let client = reqwest::Client::builder()
        .user_agent("SGP-Desktop-App")
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    // Normalizar versão para formato de tag (adicionar 'v' se não tiver)
    let tag = if version.starts_with('v') {
        version.clone()
    } else {
        format!("v{}", version)
    };
    
    // TENTATIVA 1: Buscar do GitHub Releases (Body da Tag)
    let release_url = format!(
        "https://api.github.com/repos/mrmateussiilva/sgp-v4/releases/tags/{}",
        tag
    );
    
    info!("Tentativa 1: Buscando release no GitHub: {}", release_url);
    
    let release_response = client.get(&release_url).send().await;
    
    match release_response {
        Ok(response) if response.status().is_success() => {
            if let Ok(release) = response.json::<GitHubRelease>().await {
                if let Some(body) = release.body {
                    if !body.trim().is_empty() {
                        info!("Changelog obtido via GitHub Releases");
                        return Ok(body);
                    }
                }
            }
        }
        _ => {
            warn!("Falha ao buscar release, tentando fallback para CHANGELOG.md");
        }
    }

    // TENTATIVA 2: Fallback para o arquivo CHANGELOG.md bruto no repositório
    let raw_changelog_url = "https://raw.githubusercontent.com/mrmateussiilva/sgp-v4/main/documentation/CHANGELOG.md";
    info!("Tentativa 2: Buscando CHANGELOG.md bruto: {}", raw_changelog_url);

    match client.get(raw_changelog_url).send().await {
        Ok(response) if response.status().is_success() => {
            match response.text().await {
                Ok(content) => {
                    info!("Changelog obtido via CHANGELOG.md (bruto)");
                    Ok(content)
                }
                Err(e) => Err(format!("Erro ao ler conteúdo do CHANGELOG.md: {}", e)),
            }
        }
        Ok(response) => {
            Err(format!("Erro ao buscar CHANGELOG.md (Status: {})", response.status()))
        }
        Err(e) => {
            Err(format!("Erro de rede ao buscar CHANGELOG.md: {}", e))
        }
    }
}
