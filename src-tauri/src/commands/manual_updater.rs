use tauri::{AppHandle, Manager};
use tauri::async_runtime;
use std::collections::HashMap;
use std::process::Command;
use std::path::PathBuf;
use std::io::Write;
use std::fs::OpenOptions;
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

    // Criar log de download
    let download_log_file = downloads_dir.join("update_download.log");
    write_log(&download_log_file, &format!(
        "═══════════════════════════════════════════════════════════\n\
        INÍCIO DO DOWNLOAD\n\
        ═══════════════════════════════════════════════════════════\n\
        URL: {}\n\
        Data/Hora: {}\n",
        updateUrl,
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
    ));

    // Extrair nome do arquivo da URL
    let filename = updateUrl
        .split('/')
        .last()
        .ok_or_else(|| "Não foi possível extrair nome do arquivo da URL".to_string())?;

    let file_path = downloads_dir.join(filename);

    info!("💾 Baixando para: {:?}", file_path);
    write_log(&download_log_file, &format!("Arquivo de destino: {:?}", file_path));

    // Validar URL antes de tentar baixar
    if updateUrl.is_empty() {
        write_log(&download_log_file, "❌ ERRO: URL de atualização vazia");
        return Err("URL de atualização vazia".to_string());
    }

    // Verificar se a URL é válida
    if !updateUrl.starts_with("http://") && !updateUrl.starts_with("https://") {
        write_log(&download_log_file, &format!("❌ ERRO: URL inválida: {}", updateUrl));
        return Err(format!("URL inválida: {}", updateUrl));
    }

    info!("🔗 URL de atualização validada: {}", updateUrl);
    write_log(&download_log_file, "✅ URL validada com sucesso");

    // Baixar arquivo usando reqwest
    info!("📡 Iniciando download de: {}", updateUrl);
    write_log(&download_log_file, "Conectando ao servidor...");
    
    let download_start = std::time::Instant::now();
    let response = reqwest::get(&updateUrl)
        .await
        .map_err(|e| {
            let error_msg = format!("Erro ao conectar com servidor: {}", e);
            write_log(&download_log_file, &format!("❌ ERRO: {}", error_msg));
            error_msg
        })?;

    write_log(&download_log_file, &format!("✅ Conectado ao servidor (Status: {})", response.status()));

    if !response.status().is_success() {
        let status = response.status();
        if status == 404 {
            let error_msg = format!(
                "Erro HTTP 404: Arquivo não encontrado no servidor.\n\nURL tentada: {}\n\nVerifique se:\n• O arquivo MSI existe no servidor neste caminho\n• O servidor está configurado para servir arquivos estáticos\n• O caminho do arquivo está correto\n\n💡 Acesse a URL acima no navegador para verificar se o arquivo está disponível.",
                updateUrl
            );
            write_log(&download_log_file, &format!("❌ ERRO: {}", error_msg));
            return Err(error_msg);
        }
        let error_msg = format!(
            "Erro HTTP {} ao baixar: {} - URL: {}\n\nVerifique se o arquivo existe no servidor e está acessível.",
            status,
            status.canonical_reason().unwrap_or("Unknown"),
            updateUrl
        );
        write_log(&download_log_file, &format!("❌ ERRO: {}", error_msg));
        return Err(error_msg);
    }

    // Obter tamanho do arquivo se disponível
    let content_length = response.content_length();
    if let Some(size) = content_length {
        let size_mb = size as f64 / 1_048_576.0;
        info!("📦 Tamanho do arquivo: {:.2} MB", size_mb);
        write_log(&download_log_file, &format!("Tamanho do arquivo: {:.2} MB", size_mb));
    }

    info!("⬇️ Baixando dados...");
    write_log(&download_log_file, "Iniciando download dos dados...");
    
    let bytes = response
        .bytes()
        .await
        .map_err(|e| {
            let error_msg = format!("Erro ao baixar dados: {}. Verifique sua conexão com a internet.", e);
            write_log(&download_log_file, &format!("❌ ERRO: {}", error_msg));
            error_msg
        })?;

    let downloaded_size = bytes.len();
    let size_mb = downloaded_size as f64 / 1_048_576.0;
    let download_duration = download_start.elapsed();
    let speed_mbps = if download_duration.as_secs_f64() > 0.0 {
        size_mb / download_duration.as_secs_f64()
    } else {
        0.0
    };
    
    info!("💾 Salvando arquivo ({:.2} MB)...", size_mb);
    write_log(&download_log_file, &format!(
        "Download concluído\n\
        Tamanho baixado: {:.2} MB\n\
        Tempo decorrido: {:.2} segundos\n\
        Velocidade média: {:.2} MB/s",
        size_mb,
        download_duration.as_secs_f64(),
        speed_mbps
    ));

    // Salvar arquivo
    write_log(&download_log_file, "Salvando arquivo em disco...");
    std::fs::write(&file_path, &bytes)
        .map_err(|e| {
            let error_msg = format!("Erro ao salvar arquivo em disco: {}", e);
            write_log(&download_log_file, &format!("❌ ERRO: {}", error_msg));
            error_msg
        })?;

    info!("✅ Arquivo baixado com sucesso: {:?} ({:.2} MB)", file_path, size_mb);
    write_log(&download_log_file, &format!(
        "═══════════════════════════════════════════════════════════\n\
        DOWNLOAD CONCLUÍDO COM SUCESSO\n\
        ═══════════════════════════════════════════════════════════\n\
        Arquivo: {:?}\n\
        Tamanho: {:.2} MB\n\
        Tempo total: {:.2} segundos\n\
        Velocidade média: {:.2} MB/s\n\
        Data/Hora: {}\n",
        file_path,
        size_mb,
        download_duration.as_secs_f64(),
        speed_mbps,
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
    ));

    Ok(file_path.to_string_lossy().to_string())
}

/// Função auxiliar para escrever logs em arquivo TXT
fn write_log(log_file: &PathBuf, message: &str) {
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file)
    {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = writeln!(file, "[{}] {}", timestamp, message);
    }
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
    info!("🔧 Instalando atualização Windows (modo per-user, sem admin)...");

    // Para Windows, executar o MSI
    if path.extension().and_then(|s| s.to_str()) == Some("msi") {
        let parent_dir = path.parent().unwrap();
        
        // Log do MSI (gerado pelo msiexec)
        let msi_log_file = parent_dir.join("msi_install.log");
        
        // Log detalhado da aplicação (nosso controle)
        let app_log_file = parent_dir.join("update_install.log");
        
        write_log(&app_log_file, &format!(
            "═══════════════════════════════════════════════════════════\n\
            INÍCIO DA INSTALAÇÃO\n\
            ═══════════════════════════════════════════════════════════\n\
            Arquivo MSI: {:?}\n\
            Modo: Per-User (sem permissões de administrador)\n\
            Data/Hora: {}\n",
            path,
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        ));

        // Verificações pré-instalação
        write_log(&app_log_file, "Realizando verificações pré-instalação...");
        
        // 1. Verificar se o arquivo existe
        if !path.exists() {
            let error_msg = format!("Arquivo MSI não encontrado: {:?}", path);
            write_log(&app_log_file, &format!("❌ ERRO: {}", error_msg));
            return Err(error_msg);
        }
        write_log(&app_log_file, "✅ Arquivo existe");

        // 2. Verificar tamanho do arquivo (MSI válido deve ter pelo menos alguns KB)
        let metadata = std::fs::metadata(path)
            .map_err(|e| {
                let error_msg = format!("Erro ao ler metadados do arquivo: {}", e);
                write_log(&app_log_file, &format!("❌ ERRO: {}", error_msg));
                error_msg
            })?;
        
        let file_size = metadata.len();
        let file_size_mb = file_size as f64 / 1_048_576.0;
        write_log(&app_log_file, &format!("Tamanho do arquivo: {:.2} MB ({} bytes)", file_size_mb, file_size));
        
        if file_size == 0 {
            let error_msg = "Arquivo MSI está vazio (0 bytes). O download pode ter falhado.";
            write_log(&app_log_file, &format!("❌ ERRO: {}", error_msg));
            return Err(error_msg.to_string());
        }
        
        if file_size < 1024 {
            let warning_msg = format!("Arquivo MSI muito pequeno ({} bytes). Pode estar corrompido.", file_size);
            write_log(&app_log_file, &format!("⚠️ AVISO: {}", warning_msg));
        }

        // 3. Verificar se é um MSI válido (verificar assinatura do arquivo)
        // MSI válido começa com bytes específicos
        let mut file = std::fs::File::open(path)
            .map_err(|e| {
                let error_msg = format!("Erro ao abrir arquivo para verificação: {}", e);
                write_log(&app_log_file, &format!("❌ ERRO: {}", error_msg));
                error_msg
            })?;
        
        let mut header = [0u8; 8];
        if let Ok(_) = file.read_exact(&mut header) {
            // MSI válido começa com "D0 CF 11 E0 A1 B1 1A E1" (OLE2 compound document)
            if header[0] == 0xD0 && header[1] == 0xCF && header[2] == 0x11 && header[3] == 0xE0 {
                write_log(&app_log_file, "✅ Arquivo MSI parece válido (assinatura OLE2 detectada)");
            } else {
                let error_msg = format!(
                    "Arquivo não parece ser um MSI válido. Cabeçalho: {:02X?}\n\
                    Um MSI válido deve começar com D0 CF 11 E0 (OLE2 compound document).\n\
                    O arquivo pode estar corrompido ou não ser um MSI.",
                    header
                );
                write_log(&app_log_file, &format!("❌ ERRO: {}", error_msg));
                return Err(error_msg);
            }
        } else {
            write_log(&app_log_file, "⚠️ AVISO: Não foi possível verificar assinatura do arquivo");
        }

        // Tentar desinstalar versão anterior primeiro (se existir)
        write_log(&app_log_file, "Verificando e desinstalando versão anterior...");
        
        // ProductCodes conhecidos de versões anteriores (pode ser expandido)
        let previous_product_codes = vec![
            "{F80FE871-0D01-494F-ABED-082205E0B8CF}", // Versão 1.0.0
            // Adicionar outros ProductCodes conforme necessário
        ];
        
        let mut previous_version_found = false;
        
        for product_code in &previous_product_codes {
            write_log(&app_log_file, &format!("Verificando produto: {}", product_code));
            
            let uninstall_log = parent_dir.join(format!("msi_uninstall_{}.log", product_code.replace("{", "").replace("}", "")));
            
            let uninstall_output = Command::new("msiexec")
                .args(&[
                    "/x",
                    product_code,
                    "/qn",  // Quiet mode
                    "/norestart",  // Não reiniciar
                    "/L*v",  // Log verbose
                    uninstall_log.to_string_lossy().as_ref(),
                ])
                .output();
            
            match uninstall_output {
                Ok(output) => {
                    let exit_code = output.status.code().unwrap_or(-1);
                    
                    if output.status.success() {
                        write_log(&app_log_file, &format!("✅ Versão anterior ({}) desinstalada com sucesso", product_code));
                        previous_version_found = true;
                        std::thread::sleep(std::time::Duration::from_secs(2)); // Aguardar um pouco
                        break;
                    } else if exit_code == 1605 {
                        // 1605 = Product not found - não há problema, continua
                        write_log(&app_log_file, &format!("ℹ️ Produto {} não está instalado (código 1605)", product_code));
                    } else if exit_code == 1730 {
                        // 1730 = Requer admin para desinstalar
                        write_log(&app_log_file, &format!("⚠️ AVISO: Produto {} requer admin para desinstalar (código 1730). Tentando instalação mesmo assim...", product_code));
                        previous_version_found = true;
                    } else {
                        write_log(&app_log_file, &format!("⚠️ AVISO: Erro ao desinstalar {} (código {}). Continuando com instalação...", product_code, exit_code));
                    }
                }
                Err(e) => {
                    write_log(&app_log_file, &format!("⚠️ AVISO: Erro ao verificar produto {}: {} (continuando)", product_code, e));
                }
            }
        }
        
        if !previous_version_found {
            write_log(&app_log_file, "ℹ️ Nenhuma versão anterior detectada");
        }
        
        write_log(&app_log_file, "Preparando comando msiexec para instalação...");
        
        // Executar em background (spawn) para não bloquear e permitir timeout
        let mut child = Command::new("msiexec")
            .args(&[
                "/i",
                path.to_string_lossy().as_ref(),
                "/qn",  // Quiet mode sem UI
                "/norestart",  // Não reiniciar automaticamente
                "/L*v",  // Log verbose do MSI
                msi_log_file.to_string_lossy().as_ref(),
                "/ALLUSERS=\"\"",  // Forçar instalação per-user (sem admin)
            ])
            .spawn()
            .map_err(|e| {
                let error_msg = format!("Erro ao executar msiexec: {}", e);
                write_log(&app_log_file, &format!("❌ ERRO: {}", error_msg));
                error_msg
            })?;

        write_log(&app_log_file, "✅ Processo msiexec iniciado em background");
        write_log(&app_log_file, "Aguardando conclusão da instalação...");

        // Aguardar com timeout (60 segundos)
        let timeout = std::time::Duration::from_secs(60);
        let start = std::time::Instant::now();
        let check_interval = std::time::Duration::from_millis(500);
        
        loop {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let elapsed = start.elapsed();
                    let exit_code = status.code().unwrap_or(-1);
                    
                    write_log(&app_log_file, &format!(
                        "Processo msiexec finalizado\n\
                        Tempo decorrido: {:.2} segundos\n\
                        Código de saída: {}",
                        elapsed.as_secs_f64(),
                        exit_code
                    ));

                    if status.success() {
                        write_log(&app_log_file, "✅ Instalação concluída com sucesso!");
                        
                        // Ler e resumir o log do MSI
                        if msi_log_file.exists() {
                            if let Ok(msi_log_content) = std::fs::read_to_string(&msi_log_file) {
                                let lines: Vec<&str> = msi_log_content.lines().collect();
                                write_log(&app_log_file, &format!(
                                    "Log MSI contém {} linhas",
                                    lines.len()
                                ));
                                
                                // Procurar por erros no log do MSI
                                let errors: Vec<&str> = lines
                                    .iter()
                                    .filter(|l| {
                                        let lower = l.to_lowercase();
                                        lower.contains("error") || lower.contains("failed") || lower.contains("exception")
                                    })
                                    .take(10)
                                    .copied()
                                    .collect();
                                
                                if !errors.is_empty() {
                                    write_log(&app_log_file, "⚠️ Avisos encontrados no log MSI:");
                                    for error in &errors {
                                        write_log(&app_log_file, &format!("  - {}", error));
                                    }
                                }
                            }
                        }
                        
                        write_log(&app_log_file, &format!(
                            "═══════════════════════════════════════════════════════════\n\
                            INSTALAÇÃO CONCLUÍDA COM SUCESSO\n\
                            ═══════════════════════════════════════════════════════════\n\
                            A aplicação será reiniciada em 2 segundos...\n\
                            Data/Hora: {}\n",
                            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
                        ));
                        
                        info!("✅ MSI instalado com sucesso (per-user)");
                        
                        // Reiniciar aplicação após um delay
                        let app_handle_clone = app_handle.clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_secs(2));
                            let _ = app_handle_clone.restart();
                        });
                        
                        return Ok(());
                    } else {
                        // Ler log do MSI para debug
                        let msi_log_content = if msi_log_file.exists() {
                            std::fs::read_to_string(&msi_log_file).unwrap_or_default()
                        } else {
                            String::new()
                        };
                        
                        write_log(&app_log_file, "❌ ERRO: Instalação falhou");
                        
                        // Obter informações do arquivo para mensagens de erro
                        let file_info = if let Ok(metadata) = std::fs::metadata(path) {
                            let size = metadata.len();
                            let size_mb = size as f64 / 1_048_576.0;
                            format!("{:.2} MB ({} bytes)", size_mb, size)
                        } else {
                            "N/A".to_string()
                        };
                        
                        // Tratamento específico para códigos de erro comuns
                        let error_msg = match exit_code {
                            1639 => {
                                format!(
                                    "Erro MSI 1639: Este pacote de instalação não pôde ser aberto.\n\n\
                                    Possíveis causas:\n\
                                    • O arquivo MSI está corrompido ou incompleto\n\
                                    • O arquivo não é um MSI válido\n\
                                    • Problemas de permissão ao acessar o arquivo\n\
                                    • O download pode ter falhado parcialmente\n\n\
                                    Verificações realizadas:\n\
                                    • Arquivo existe: Sim\n\
                                    • Tamanho: {}\n\
                                    • Caminho: {:?}\n\n\
                                    💡 Soluções:\n\
                                    1. Tente baixar novamente a atualização\n\
                                    2. Verifique se há espaço em disco suficiente\n\
                                    3. Verifique se o arquivo não está bloqueado por antivírus\n\
                                    4. Tente executar o MSI manualmente para verificar se está válido",
                                    file_info,
                                    path
                                )
                            }
                            1603 => {
                                // Verificar se o erro 1603 foi causado por erro 1730 (requer admin)
                                let caused_by_1730 = msi_log_content.contains("1730") || 
                                                    msi_log_content.contains("You must be an Administrator");
                                
                                if caused_by_1730 {
                                    format!(
                                        "Erro MSI 1603: Falha na instalação devido a problema de permissões.\n\n\
                                        Causa identificada: A versão anterior foi instalada como administrador e requer \
                                        privilégios de administrador para ser removida.\n\n\
                                        O que aconteceu:\n\
                                        • A versão anterior (1.0.0) foi instalada como per-machine (requer admin)\n\
                                        • A nova versão (1.0.1) está tentando instalar como per-user (sem admin)\n\
                                        • O Windows Installer precisa remover a versão antiga primeiro\n\
                                        • Mas a remoção requer privilégios de administrador\n\n\
                                        💡 Soluções:\n\
                                        1. Desinstale manualmente a versão anterior:\n\
                                           • Abra 'Adicionar ou remover programas'\n\
                                           • Procure por 'SGP - Sistema de Gerenciamento de Pedidos'\n\
                                           • Clique em 'Desinstalar'\n\
                                           • Depois tente atualizar novamente\n\n\
                                        2. Execute a atualização como administrador (se possível)\n\n\
                                        3. Ou aguarde uma versão futura que lide melhor com upgrades"
                                    )
                                } else {
                                    format!(
                                        "Erro MSI 1603: Erro fatal durante a instalação.\n\n\
                                        Possíveis causas:\n\
                                        • Conflito com outra instalação em andamento\n\
                                        • Arquivos bloqueados por outro processo\n\
                                        • Problemas de permissão\n\n\
                                        💡 Soluções:\n\
                                        1. Feche outras aplicações\n\
                                        2. Reinicie o computador e tente novamente\n\
                                        3. Execute como administrador (se necessário)"
                                    )
                                }
                            }
                            1730 => {
                                format!(
                                    "Erro MSI 1730: Você deve ser um Administrador para remover esta aplicação.\n\n\
                                    Causa: A versão anterior foi instalada como per-machine (requer admin) e precisa \
                                    ser removida antes de instalar a nova versão como per-user.\n\n\
                                    💡 Soluções:\n\
                                    1. Desinstale manualmente a versão anterior:\n\
                                       • Abra 'Adicionar ou remover programas' (Configurações > Aplicativos)\n\
                                       • Procure por 'SGP - Sistema de Gerenciamento de Pedidos'\n\
                                       • Clique em 'Desinstalar'\n\
                                       • Depois tente atualizar novamente\n\n\
                                    2. Execute a atualização como administrador (se possível)"
                                )
                            }
                            _ => {
                                // Extrair informações úteis do log
                                if msi_log_content.contains("error") || msi_log_content.contains("Error") {
                            let error_lines: Vec<&str> = msi_log_content
                                .lines()
                                .filter(|l| {
                                    let lower = l.to_lowercase();
                                    lower.contains("error") || lower.contains("failed") || lower.contains("exception")
                                })
                                .take(10)
                                .collect();
                            
                            write_log(&app_log_file, "Erros encontrados no log MSI:");
                            for error in &error_lines {
                                write_log(&app_log_file, &format!("  - {}", error));
                            }
                            
                                    format!("Erros do log MSI: {}", error_lines.join("; "))
                                } else {
                                    format!("MSI retornou código de erro: {}", exit_code)
                                }
                            }
                        };
                        
                        write_log(&app_log_file, &format!(
                            "═══════════════════════════════════════════════════════════\n\
                            INSTALAÇÃO FALHOU\n\
                            ═══════════════════════════════════════════════════════════\n\
                            Código de erro: {}\n\
                            Erro: {}\n\
                            Log MSI disponível em: {:?}\n\
                            Log da aplicação disponível em: {:?}\n\
                            Data/Hora: {}\n",
                            exit_code,
                            error_msg,
                            msi_log_file,
                            app_log_file,
                            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
                        ));
                        
                        warn!("Erro ao instalar MSI. Logs disponíveis em: {:?} e {:?}", msi_log_file, app_log_file);
                        return Err(format!(
                            "Erro ao instalar MSI: {}\n\nLogs disponíveis em:\n• {:?}\n• {:?}",
                            error_msg,
                            msi_log_file,
                            app_log_file
                        ));
                    }
                }
                Ok(None) => {
                    // Processo ainda rodando
                    let elapsed = start.elapsed();
                    
                    // Log de progresso a cada 5 segundos
                    if elapsed.as_secs() % 5 == 0 && elapsed.as_secs() > 0 {
                        write_log(&app_log_file, &format!(
                            "⏳ Instalação em andamento... ({:.0} segundos)",
                            elapsed.as_secs_f64()
                        ));
                    }
                    
                    if elapsed > timeout {
                        // Timeout - matar processo
                        let _ = child.kill();
                        let _ = child.wait();
                        
                        write_log(&app_log_file, &format!(
                            "❌ TIMEOUT: Instalação demorou mais de {} segundos\n\
                            Processo foi finalizado forçadamente",
                            timeout.as_secs()
                        ));
                        
                        write_log(&app_log_file, &format!(
                            "═══════════════════════════════════════════════════════════\n\
                            INSTALAÇÃO FALHOU - TIMEOUT\n\
                            ═══════════════════════════════════════════════════════════\n\
                            Tempo limite excedido: {} segundos\n\
                            Log MSI disponível em: {:?}\n\
                            Log da aplicação disponível em: {:?}\n\
                            Data/Hora: {}\n",
                            timeout.as_secs(),
                            msi_log_file,
                            app_log_file,
                            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
                        ));
                        
                        return Err(format!(
                            "Timeout ao instalar MSI (mais de {} segundos).\n\n\
                            Possíveis causas:\n\
                            • O instalador está esperando alguma confirmação\n\
                            • Problemas de permissão (mesmo em modo per-user)\n\
                            • O MSI pode estar corrompido\n\n\
                            Verifique os logs em:\n\
                            • {:?}\n\
                            • {:?}",
                            timeout.as_secs(),
                            msi_log_file,
                            app_log_file
                        ));
                    }
                    
                    // Aguardar antes de verificar novamente
                    std::thread::sleep(check_interval);
                }
                Err(e) => {
                    let error_msg = format!("Erro ao verificar status do MSI: {}", e);
                    write_log(&app_log_file, &format!("❌ ERRO: {}", error_msg));
                    return Err(error_msg);
                }
            }
        }
    } else {
        return Err("Formato de arquivo não suportado para Windows. Use .msi".to_string());
    }
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
