use tauri::{AppHandle, Manager};
use tracing::{info, warn, error};
use crate::logging::{LogManager, LogStats};
use std::sync::Mutex;

// Estado global do LogManager
type LogManagerState = Mutex<Option<LogManager>>;

/// Obtém estatísticas dos logs
#[tauri::command]
pub async fn get_log_stats(app_handle: AppHandle) -> Result<LogStats, String> {
    info!("Obtendo estatísticas dos logs...");
    
    if let Some(log_manager) = app_handle.state::<LogManagerState>().inner().lock().unwrap().as_ref() {
        match log_manager.get_log_stats() {
            Ok(stats) => {
                info!("Estatísticas dos logs obtidas com sucesso");
                Ok(stats)
            }
            Err(e) => {
                error!("Erro ao obter estatísticas dos logs: {}", e);
                Err(format!("Erro ao obter estatísticas: {}", e))
            }
        }
    } else {
        Err("LogManager não inicializado".to_string())
    }
}

/// Lista todos os arquivos de log
#[tauri::command]
pub async fn get_log_files(app_handle: AppHandle) -> Result<Vec<String>, String> {
    info!("Listando arquivos de log...");
    
    if let Some(log_manager) = app_handle.state::<LogManagerState>().inner().lock().unwrap().as_ref() {
        match log_manager.get_log_files() {
            Ok(files) => {
                info!("Arquivos de log listados: {} arquivos encontrados", files.len());
                Ok(files)
            }
            Err(e) => {
                error!("Erro ao listar arquivos de log: {}", e);
                Err(format!("Erro ao listar arquivos: {}", e))
            }
        }
    } else {
        Err("LogManager não inicializado".to_string())
    }
}

/// Obtém o conteúdo de um arquivo de log específico
#[tauri::command]
pub async fn get_log_content(app_handle: AppHandle, file_name: String) -> Result<String, String> {
    info!("Obtendo conteúdo do arquivo de log: {}", file_name);
    
    if let Some(log_manager) = app_handle.state::<LogManagerState>().inner().lock().unwrap().as_ref() {
        match log_manager.get_log_content(&file_name) {
            Ok(content) => {
                info!("Conteúdo do arquivo {} obtido com sucesso", file_name);
                Ok(content)
            }
            Err(e) => {
                error!("Erro ao obter conteúdo do arquivo {}: {}", file_name, e);
                Err(format!("Erro ao obter conteúdo: {}", e))
            }
        }
    } else {
        Err("LogManager não inicializado".to_string())
    }
}

/// Limpa todos os logs
#[tauri::command]
pub async fn clear_logs(app_handle: AppHandle) -> Result<(), String> {
    warn!("Solicitação para limpar logs recebida");
    
    if let Some(log_manager) = app_handle.state::<LogManagerState>().inner().lock().unwrap().as_ref() {
        match log_manager.clear_logs() {
            Ok(_) => {
                info!("Logs limpos com sucesso");
                Ok(())
            }
            Err(e) => {
                error!("Erro ao limpar logs: {}", e);
                Err(format!("Erro ao limpar logs: {}", e))
            }
        }
    } else {
        Err("LogManager não inicializado".to_string())
    }
}

/// Obtém os logs mais recentes (últimas N linhas)
#[tauri::command]
pub async fn get_recent_logs(app_handle: AppHandle, lines: Option<usize>) -> Result<String, String> {
    let lines = lines.unwrap_or(100);
    info!("Obtendo últimas {} linhas dos logs", lines);
    
    if let Some(log_manager) = app_handle.state::<LogManagerState>().inner().lock().unwrap().as_ref() {
        // Primeiro, tenta obter o arquivo de log mais recente
        match log_manager.get_log_files() {
            Ok(files) => {
                if let Some(latest_file) = files.last() {
                    match log_manager.get_log_content(latest_file) {
                        Ok(content) => {
                            let lines_vec: Vec<&str> = content.lines().collect();
                            let start = if lines_vec.len() > lines {
                                lines_vec.len() - lines
                            } else {
                                0
                            };
                            
                            let recent_lines = lines_vec[start..].join("\n");
                            info!("Últimas {} linhas obtidas do arquivo {}", lines, latest_file);
                            Ok(recent_lines)
                        }
                        Err(e) => {
                            error!("Erro ao obter conteúdo do arquivo mais recente: {}", e);
                            Err(format!("Erro ao obter conteúdo: {}", e))
                        }
                    }
                } else {
                    Ok("Nenhum arquivo de log encontrado".to_string())
                }
            }
            Err(e) => {
                error!("Erro ao listar arquivos de log: {}", e);
                Err(format!("Erro ao listar arquivos: {}", e))
            }
        }
    } else {
        Err("LogManager não inicializado".to_string())
    }
}

/// Pesquisa por texto nos logs
#[tauri::command]
pub async fn search_logs(app_handle: AppHandle, query: String) -> Result<Vec<String>, String> {
    info!("Pesquisando por '{}' nos logs", query);
    
    if let Some(log_manager) = app_handle.state::<LogManagerState>().inner().lock().unwrap().as_ref() {
        match log_manager.get_log_files() {
            Ok(files) => {
                let mut results = Vec::new();
                
                for file in files {
                    match log_manager.get_log_content(&file) {
                        Ok(content) => {
                            for line in content.lines() {
                                if line.to_lowercase().contains(&query.to_lowercase()) {
                                    results.push(format!("[{}] {}", file, line));
                                }
                            }
                        }
                        Err(e) => {
                            warn!("Erro ao ler arquivo {}: {}", file, e);
                        }
                    }
                }
                
                info!("Pesquisa concluída: {} resultados encontrados", results.len());
                Ok(results)
            }
            Err(e) => {
                error!("Erro ao listar arquivos de log: {}", e);
                Err(format!("Erro ao listar arquivos: {}", e))
            }
        }
    } else {
        Err("LogManager não inicializado".to_string())
    }
}

/// Testa o sistema de logs
#[tauri::command]
pub async fn test_logging_system(_app_handle: AppHandle) -> Result<String, String> {
    info!("Testando sistema de logs...");
    
    // Testa diferentes níveis de log
    tracing::debug!("🔍 Teste de log DEBUG");
    tracing::info!("ℹ️  Teste de log INFO");
    tracing::warn!("⚠️  Teste de log WARN");
    tracing::error!("❌ Teste de log ERROR");
    
    // Testa logs específicos do sistema
    crate::logging::log_system_start();
    crate::logging::log_database_connection(true, "Teste de conexão");
    crate::logging::log_user_action("teste", "login", Some("Teste de login"));
    crate::logging::log_performance("teste_operacao", 150);
    
    info!("Sistema de logs testado com sucesso");
    Ok("Sistema de logs testado com sucesso! Verifique os arquivos de log.".to_string())
}
