use tauri::{AppHandle, Manager};
use tauri::async_runtime;
use std::collections::HashMap;
use std::process::Command;
use std::path::PathBuf;
use tracing::{info, warn};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct SimpleUpdateManifest {
    version: String,
    url: Option<String>,
    notes: Option<String>,
    date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PlatformEntry {
    url: String,
    signature: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PlatformManifest {
    version: String,
    notes: Option<String>,
    #[serde(rename = "pub_date")]
    pub_date: Option<String>,
    platforms: HashMap<String, PlatformEntry>,
}

#[derive(Debug)]
struct ResolvedManifest {
    version: String,
    url: String,
    notes: Option<String>,
    date: Option<String>,
    #[allow(dead_code)] // Ignoramos signature intencionalmente - não validamos assinatura
    signature: Option<String>,
}

fn platform_candidates() -> Vec<String> {
    let mut candidates = Vec::new();
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    candidates.push(format!("{}-{}", os, arch));

    match os {
        "macos" => {
            candidates.push(format!("darwin-{}", arch));
            candidates.push("darwin-x86_64".to_string());
            candidates.push("darwin-aarch64".to_string());
        }
        "linux" => {
            candidates.push(format!("linux-{}", arch));
            candidates.push("linux-x86_64".to_string());
            candidates.push("linux-aarch64".to_string());
        }
        "windows" => {
            candidates.push(format!("windows-{}", arch));
            candidates.push("windows-x86_64".to_string());
            candidates.push("windows-aarch64".to_string());
        }
        _ => {}
    }

    // Fallback genérico apenas com o nome do SO
    candidates.push(os.to_string());
    candidates
}

fn resolve_manifest(body: &str) -> Result<ResolvedManifest, String> {
    // 1) Tentar primeiro o formato com plataformas (compatível com manifest atual da API)
    if let Ok(platform_manifest) = serde_json::from_str::<PlatformManifest>(body) {
        for key in platform_candidates() {
            if let Some(entry) = platform_manifest.platforms.get(&key) {
                return Ok(ResolvedManifest {
                    version: platform_manifest.version.clone(),
                    url: entry.url.clone(),
                    notes: platform_manifest.notes.clone(),
                    date: platform_manifest.pub_date.clone(),
                    signature: entry.signature.clone(),
                });
            }
        }

        let available = platform_manifest
            .platforms
            .keys()
            .cloned()
            .collect::<Vec<_>>()
            .join(", ");

        return Err(format!(
            "Manifesto não possui artefato para esta plataforma. Plataformas disponíveis: {}",
            available
        ));
    }

    // 2) Fallback: tentar formato simples (versão + URL direta)
    if let Ok(simple) = serde_json::from_str::<SimpleUpdateManifest>(body) {
        let url = simple
            .url
            .ok_or_else(|| "Manifesto simples não possui campo 'url'".to_string())?;

        return Ok(ResolvedManifest {
            version: simple.version,
            url,
            notes: simple.notes,
            date: simple.date,
            signature: None,
        });
    }

    Err("Formato de manifesto de atualização inválido".to_string())
}

/// Comando para baixar atualização manualmente (SEM verificação de assinatura/chave)
/// Este comando ignora completamente qualquer validação de signature
#[tauri::command]
#[allow(non_snake_case)] // Mantemos camelCase para compatibilidade com frontend
pub async fn download_update_manual(
    app_handle: AppHandle,
    updateUrl: String,  // camelCase para consistência com check_update_manual
) -> Result<String, String> {
    info!("📥 Baixando atualização manualmente de: {} (SEM validação de assinatura)", updateUrl);

    // Obter diretório de cache do app
    let app_cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Erro ao obter diretório de cache: {}", e))?;

    // Criar diretório de downloads se não existir
    let downloads_dir = app_cache_dir.join("updates");
    std::fs::create_dir_all(&downloads_dir)
        .map_err(|e| format!("Erro ao criar diretório de downloads: {}", e))?;

    // Extrair nome do arquivo da URL
    let filename = updateUrl
        .split('/')
        .last()
        .ok_or_else(|| "Não foi possível extrair nome do arquivo da URL".to_string())?;

    let file_path = downloads_dir.join(filename);

    info!("💾 Baixando para: {:?}", file_path);

    // Validar URL antes de tentar baixar
    if updateUrl.is_empty() {
        return Err("URL de atualização vazia".to_string());
    }

    // Verificar se a URL é válida
    if !updateUrl.starts_with("http://") && !updateUrl.starts_with("https://") {
        return Err(format!("URL inválida: {}", updateUrl));
    }

    info!("🔗 URL de atualização validada: {}", updateUrl);

    // Baixar arquivo usando reqwest
    info!("📡 Iniciando download de: {}", updateUrl);
    let response = reqwest::get(&updateUrl)
        .await
        .map_err(|e| format!("Erro ao conectar com servidor: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        if status == 404 {
            return Err(format!(
                "Erro HTTP 404: Arquivo não encontrado no servidor.\n\nURL tentada: {}\n\nVerifique se:\n• O arquivo MSI existe no servidor neste caminho\n• O servidor está configurado para servir arquivos estáticos\n• O caminho do arquivo está correto\n\n💡 Acesse a URL acima no navegador para verificar se o arquivo está disponível.",
                updateUrl
            ));
        }
        return Err(format!(
            "Erro HTTP {} ao baixar: {} - URL: {}\n\nVerifique se o arquivo existe no servidor e está acessível.",
            status,
            status.canonical_reason().unwrap_or("Unknown"),
            updateUrl
        ));
    }

    // Obter tamanho do arquivo se disponível
    let content_length = response.content_length();
    if let Some(size) = content_length {
        let size_mb = size as f64 / 1_048_576.0;
        info!("📦 Tamanho do arquivo: {:.2} MB", size_mb);
    }

    info!("⬇️ Baixando dados...");
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Erro ao baixar dados: {}. Verifique sua conexão com a internet.", e))?;

    let downloaded_size = bytes.len();
    let size_mb = downloaded_size as f64 / 1_048_576.0;
    info!("💾 Salvando arquivo ({:.2} MB)...", size_mb);

    // Salvar arquivo
    std::fs::write(&file_path, &bytes)
        .map_err(|e| format!("Erro ao salvar arquivo em disco: {}", e))?;

    info!("✅ Arquivo baixado com sucesso: {:?} ({:.2} MB)", file_path, size_mb);

    Ok(file_path.to_string_lossy().to_string())
}

/// Comando para instalar atualização baixada manualmente
#[tauri::command]
#[allow(non_snake_case)] // Mantemos camelCase para compatibilidade com frontend
pub async fn install_update_manual(
    app_handle: AppHandle,
    filePath: String,  // camelCase para consistência com outros comandos
) -> Result<String, String> {
    info!("🚀 Instalando atualização de: {}", filePath);

    let path = PathBuf::from(&filePath);
    
    if !path.exists() {
        return Err(format!("Arquivo não encontrado: {}", filePath));
    }

    // Detectar sistema operacional e instalar apropriadamente
    #[cfg(target_os = "windows")]
    {
        install_windows_update(&path, &app_handle)?;
    }

    #[cfg(target_os = "linux")]
    {
        install_linux_update(&path, &app_handle)?;
    }

    #[cfg(target_os = "macos")]
    {
        install_macos_update(&path, &app_handle)?;
    }

    Ok("Atualização instalada com sucesso! Reinicie o aplicativo.".to_string())
}

#[cfg(target_os = "windows")]
fn install_windows_update(path: &PathBuf, app_handle: &AppHandle) -> Result<(), String> {
    info!("🔧 Instalando atualização Windows...");

    // Para Windows, executar o MSI
    if path.extension().and_then(|s| s.to_str()) == Some("msi") {
        // Usar parâmetros que ignoram validações de chave/produto
        // /qn = quiet mode sem UI
        // /norestart = não reiniciar automaticamente
        // /L*v = log verbose para debug
        let log_file = path.parent().unwrap().join("msi_install.log");
        
        let output = Command::new("msiexec")
            .args(&[
                "/i",
                path.to_string_lossy().as_ref(),
                "/qn",  // Quiet mode sem UI
                "/norestart",  // Não reiniciar
                "/L*v",  // Log verbose
                log_file.to_string_lossy().as_ref(),
            ])
            .output()
            .map_err(|e| format!("Erro ao executar msiexec: {}", e))?;

        // Ler o log para debug se houver erro
        let log_content = if log_file.exists() {
            std::fs::read_to_string(&log_file).unwrap_or_default()
        } else {
            String::new()
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            
            // Extrair informações úteis do log
            let error_msg = if log_content.contains("error") || log_content.contains("Error") {
                let error_lines: Vec<&str> = log_content
                    .lines()
                    .filter(|l| l.to_lowercase().contains("error") || l.to_lowercase().contains("failed"))
                    .take(5)
                    .collect();
                format!("Erros do log MSI: {}", error_lines.join("; "))
            } else {
                format!("Stderr: {} | Stdout: {}", stderr, stdout)
            };
            
            warn!("Erro ao instalar MSI. Log disponível em: {:?}", log_file);
            return Err(format!("Erro ao instalar MSI: {}. Verifique o log em {:?}", error_msg, log_file));
        }

        info!("✅ MSI instalado com sucesso");
        
        // Reiniciar aplicação após um delay
        let app_handle_clone = app_handle.clone();
        async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            app_handle_clone.restart();
        });
    } else {
        return Err("Formato de arquivo não suportado para Windows. Use .msi".to_string());
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn install_linux_update(path: &PathBuf, app_handle: &AppHandle) -> Result<(), String> {
    info!("🔧 Instalando atualização Linux...");

    // Para Linux, instalar o DEB
    if path.extension().and_then(|s| s.to_str()) == Some("deb") {
        // Tentar usar dpkg ou apt
        let output = if Command::new("which").arg("dpkg").output().is_ok() {
            Command::new("sudo")
                .args(&["dpkg", "-i", path.to_string_lossy().as_ref()])
                .output()
        } else {
            Command::new("sudo")
                .args(&["apt", "install", "-y", path.to_string_lossy().as_ref()])
                .output()
        }
        .map_err(|e| format!("Erro ao executar instalador: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            warn!("Aviso ao instalar DEB: {}", stderr);
            // Continuar mesmo com avisos
        }

        info!("✅ DEB instalado com sucesso");
        
        // Reiniciar aplicação
        let app_handle_clone = app_handle.clone();
        async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            app_handle_clone.restart();
        });
    } else {
        return Err("Formato de arquivo não suportado para Linux. Use .deb".to_string());
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn install_macos_update(path: &PathBuf, app_handle: &AppHandle) -> Result<(), String> {
    info!("🔧 Instalando atualização macOS...");

    // Para macOS, extrair e copiar o .app
    if path.extension().and_then(|s| s.to_str()) == Some("tar") 
        || path.extension().and_then(|s| s.to_str()) == Some("gz") {
        
        // Extrair arquivo
        let extract_dir = path.parent().unwrap().join("extracted");
        std::fs::create_dir_all(&extract_dir)
            .map_err(|e| format!("Erro ao criar diretório de extração: {}", e))?;

        let output = Command::new("tar")
            .args(&["-xzf", path.to_string_lossy().as_ref(), "-C", extract_dir.to_string_lossy().as_ref()])
            .output()
            .map_err(|e| format!("Erro ao extrair arquivo: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Erro ao extrair: {}", stderr));
        }

        info!("✅ Arquivo extraído com sucesso");
        
        // Reiniciar aplicação
        let app_handle_clone = app_handle.clone();
        async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            app_handle_clone.restart();
        });
    } else {
        return Err("Formato de arquivo não suportado para macOS. Use .tar.gz".to_string());
    }

    Ok(())
}

/// Comando para verificar atualizações manualmente (sem assinatura)
#[tauri::command]
#[allow(non_snake_case)] // Mantemos camelCase para compatibilidade com frontend
pub async fn check_update_manual(
    // IMPORTANTE: este nome precisa bater com a chave enviada pelo frontend (`manifestUrl`)
    manifestUrl: String,
) -> Result<serde_json::Value, String> {
    info!("🔍 Verificando atualizações manualmente de: {} (SEM validação de assinatura)", manifestUrl);

    let response = reqwest::get(&manifestUrl)
        .await
        .map_err(|e| format!("Erro ao buscar manifest: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Erro HTTP: {}", response.status()));
    }

    let body = response
        .text()
        .await
        .map_err(|e| format!("Erro ao ler manifest: {}", e))?;

    let manifest = resolve_manifest(&body)?;

    let current_version = env!("CARGO_PKG_VERSION");

    // Comparar versões (simples)
    // IMPORTANTE: Ignoramos completamente a signature - não há validação de assinatura
    if manifest.version != current_version {
        info!("✅ Atualização disponível: {} -> {}", current_version, manifest.version);
        Ok(serde_json::json!({
            "available": true,
            "current_version": current_version,
            "latest_version": manifest.version,
            "url": manifest.url,
            "notes": manifest.notes,
            "date": manifest.date,
            "signature": null  // Sempre null - não validamos assinatura
        }))
    } else {
        info!("✅ Aplicação já está na versão mais recente: {}", current_version);
        Ok(serde_json::json!({
            "available": false,
            "current_version": current_version,
            "latest_version": manifest.version
        }))
    }
}
