use std::env;
use std::path::PathBuf;
use tracing::info;

/// Procura o arquivo .env em múltiplos locais possíveis
fn find_env_file() -> Option<PathBuf> {
    let mut paths: Vec<PathBuf> = Vec::new();

    // 1. Diretório atual (onde o executável está sendo executado)
    paths.push(PathBuf::from(".env"));

    // 2. Diretório do executável
    if let Ok(exe_path) = env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            paths.push(parent.join(".env"));
        }
    }

    // 3-5. Diretórios do usuário (Linux/Mac)
    if let Ok(home) = env::var("HOME") {
        let home_path = PathBuf::from(home);
        paths.push(home_path.join(".sgp").join(".env"));
        paths.push(home_path.join(".config").join("sgp").join(".env"));
        paths.push(home_path.join(".local").join("share").join("sgp").join(".env"));
    }

    // 6-7. Diretórios de sistema Linux
    paths.push(PathBuf::from("/opt/sgp-sistema-de-gerenciamento-de-pedidos/.env"));
    paths.push(PathBuf::from("/usr/local/bin/.env"));

    // 8-10. Diretórios do usuário (Windows)
    if let Ok(appdata) = env::var("APPDATA") {
        paths.push(PathBuf::from(appdata).join("sgp").join(".env"));
    }
    if let Ok(localappdata) = env::var("LOCALAPPDATA") {
        paths.push(PathBuf::from(localappdata).join("sgp").join(".env"));
    }
    if let Ok(userprofile) = env::var("USERPROFILE") {
        paths.push(PathBuf::from(userprofile).join("Documents").join("sgp").join(".env"));
    }

    // 11-12. Diretórios de sistema (Windows)
    paths.push(PathBuf::from("C:\\Program Files\\SGP Sistema de Gerenciamento de Pedidos\\.env"));
    paths.push(PathBuf::from("C:\\Program Files (x86)\\SGP Sistema de Gerenciamento de Pedidos\\.env"));

    for path in paths {
        if path.exists() {
            return Some(path);
        }
    }

    None
}

/// Carrega o arquivo .env do local mais apropriado
pub fn load_env_file() -> Result<(), String> {
    if let Some(env_path) = find_env_file() {
        info!("Arquivo .env encontrado em: {}", env_path.display());
        
        // Carregar o arquivo .env específico
        dotenv::from_path(&env_path)
            .map_err(|e| format!("Erro ao carregar arquivo .env de {}: {}", env_path.display(), e))?;
        
        info!("Arquivo .env carregado com sucesso de: {}", env_path.display());
        Ok(())
    } else {
        // Tentar carregar do diretório atual (comportamento padrão)
        match dotenv::dotenv() {
            Ok(_) => {
                info!("Arquivo .env carregado do diretório atual");
                Ok(())
            }
            Err(e) => {
                let error_msg = format!(
                    "Arquivo .env não encontrado em nenhum dos locais padrão. \
                    Procurou em: diretório atual, diretório do executável, ~/.sgp/, \
                    ~/.config/sgp/, ~/.local/share/sgp/, /opt/, /usr/local/bin/. \
                    Erro: {}", e
                );
                Err(error_msg)
            }
        }
    }
}
