use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use chrono::Local;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogConfig {
    pub level: String,
    pub file_path: String,
    pub enable_console: bool,
    pub enable_file: bool,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            file_path: "logs/sgp.log".to_string(),
            enable_console: true,
            enable_file: true,
        }
    }
}

impl LogConfig {
    pub fn from_env() -> Self {
        let mut config = Self::default();
        
        if let Ok(level) = std::env::var("LOG_LEVEL") {
            config.level = level;
        }
        
        if let Ok(path) = std::env::var("LOG_FILE_PATH") {
            config.file_path = path;
        }
        
        if let Ok(enable_console) = std::env::var("LOG_ENABLE_CONSOLE") {
            config.enable_console = enable_console.parse().unwrap_or(true);
        }
        
        if let Ok(enable_file) = std::env::var("LOG_ENABLE_FILE") {
            config.enable_file = enable_file.parse().unwrap_or(true);
        }
        
        config
    }
}

pub struct LogManager {
    config: LogConfig,
    log_path: PathBuf,
}

impl LogManager {
    pub fn new(config: LogConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let log_path = PathBuf::from(&config.file_path);
        
        // Criar diretório de logs se não existir
        if let Some(parent) = log_path.parent() {
            fs::create_dir_all(parent)?;
        }
        
        Ok(Self {
            config,
            log_path,
        })
    }
    
    pub fn get_log_files(&self) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let log_dir = self.log_path.parent()
            .ok_or("Diretório de logs não encontrado")?;
        
        let mut files = Vec::new();
        
        if log_dir.exists() {
            for entry in fs::read_dir(log_dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("log") {
                    if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                        files.push(file_name.to_string());
                    }
                }
            }
        }
        
        files.sort();
        Ok(files)
    }
    
    pub fn get_log_content(&self, file_name: &str) -> Result<String, Box<dyn std::error::Error>> {
        let log_dir = self.log_path.parent()
            .ok_or("Diretório de logs não encontrado")?;
        
        let file_path = log_dir.join(file_name);
        
        if !file_path.exists() {
            return Err("Arquivo de log não encontrado".into());
        }
        
        let content = fs::read_to_string(file_path)?;
        Ok(content)
    }
    
    pub fn clear_logs(&self) -> Result<(), Box<dyn std::error::Error>> {
        let log_dir = self.log_path.parent()
            .ok_or("Diretório de logs não encontrado")?;
        
        if log_dir.exists() {
            for entry in fs::read_dir(log_dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("log") {
                    fs::remove_file(path)?;
                }
            }
        }
        
        tracing::info!("Logs limpos com sucesso");
        Ok(())
    }
    
    pub fn get_log_stats(&self) -> Result<LogStats, Box<dyn std::error::Error>> {
        let log_dir = self.log_path.parent()
            .ok_or("Diretório de logs não encontrado")?;
        
        let mut total_size = 0;
        let mut file_count = 0;
        let mut oldest_file: Option<String> = None;
        let mut newest_file: Option<String> = None;
        
        if log_dir.exists() {
            for entry in fs::read_dir(log_dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("log") {
                    let metadata = fs::metadata(&path)?;
                    total_size += metadata.len();
                    file_count += 1;
                    
                    let file_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();
                    
                    if oldest_file.is_none() || file_name < oldest_file.as_ref().unwrap().clone() {
                        oldest_file = Some(file_name.clone());
                    }
                    
                    if newest_file.is_none() || file_name > newest_file.as_ref().unwrap().clone() {
                        newest_file = Some(file_name);
                    }
                }
            }
        }
        
        Ok(LogStats {
            total_size_bytes: total_size,
            file_count,
            oldest_file,
            newest_file,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogStats {
    pub total_size_bytes: u64,
    pub file_count: usize,
    pub oldest_file: Option<String>,
    pub newest_file: Option<String>,
}

impl LogStats {
    pub fn total_size_mb(&self) -> f64 {
        self.total_size_bytes as f64 / (1024.0 * 1024.0)
    }
    
    pub fn total_size_kb(&self) -> f64 {
        self.total_size_bytes as f64 / 1024.0
    }
}

// Função para inicializar logs de forma simples
pub fn init_logging() -> Result<LogManager, Box<dyn std::error::Error>> {
    let config = LogConfig::from_env();
    LogManager::new(config)
}

// Função para logs específicos do sistema
pub fn log_system_start() {
    tracing::info!("🚀 Sistema SGP iniciado");
    tracing::info!("📅 Data/Hora: {}", Local::now().format("%Y-%m-%d %H:%M:%S"));
    tracing::info!("🖥️  Sistema: {}", std::env::consts::OS);
    tracing::info!("🏗️  Arquitetura: {}", std::env::consts::ARCH);
}

pub fn log_database_connection(success: bool, details: &str) {
    if success {
        tracing::info!("✅ Conexão com banco de dados estabelecida: {}", details);
    } else {
        tracing::error!("❌ Falha na conexão com banco de dados: {}", details);
    }
}

pub fn log_user_action(user: &str, action: &str, details: Option<&str>) {
    let message = if let Some(details) = details {
        format!("👤 Usuário '{}' executou '{}': {}", user, action, details)
    } else {
        format!("👤 Usuário '{}' executou '{}'", user, action)
    };
    tracing::info!("{}", message);
}

pub fn log_error(error: &str, context: Option<&str>) {
    let message = if let Some(context) = context {
        format!("❌ Erro: {} | Contexto: {}", error, context)
    } else {
        format!("❌ Erro: {}", error)
    };
    tracing::error!("{}", message);
}

pub fn log_performance(operation: &str, duration_ms: u64) {
    if duration_ms > 1000 {
        tracing::warn!("⚠️  Operação '{}' demorou {}ms (lenta)", operation, duration_ms);
    } else {
        tracing::debug!("⚡ Operação '{}' executada em {}ms", operation, duration_ms);
    }
}