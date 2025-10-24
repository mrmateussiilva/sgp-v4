use std::fs;
use std::path::Path;
use std::sync::Arc;
use tracing::{info, warn, error, debug};
use tracing_subscriber::{fmt, prelude::*, EnvFilter, Registry};
use tracing_appender::{non_blocking, rolling};
use chrono::{Local, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogConfig {
    pub level: String,
    pub file_path: String,
    pub max_files: usize,
    pub max_size_mb: usize,
    pub enable_console: bool,
    pub enable_file: bool,
    pub enable_json: bool,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            file_path: "logs/sgp.log".to_string(),
            max_files: 10,
            max_size_mb: 10,
            enable_console: true,
            enable_file: true,
            enable_json: false,
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
        
        if let Ok(max_files) = std::env::var("LOG_MAX_FILES") {
            if let Ok(val) = max_files.parse() {
                config.max_files = val;
            }
        }
        
        if let Ok(max_size) = std::env::var("LOG_MAX_SIZE_MB") {
            if let Ok(val) = max_size.parse() {
                config.max_size_mb = val;
            }
        }
        
        if let Ok(enable_console) = std::env::var("LOG_ENABLE_CONSOLE") {
            config.enable_console = enable_console.parse().unwrap_or(true);
        }
        
        if let Ok(enable_file) = std::env::var("LOG_ENABLE_FILE") {
            config.enable_file = enable_file.parse().unwrap_or(true);
        }
        
        if let Ok(enable_json) = std::env::var("LOG_ENABLE_JSON") {
            config.enable_json = enable_json.parse().unwrap_or(false);
        }
        
        config
    }
}

pub struct LogManager {
    config: LogConfig,
    _guard: Option<tracing_appender::non_blocking::WorkerGuard>,
}

impl LogManager {
    pub fn new(config: LogConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let mut manager = Self {
            config,
            _guard: None,
        };
        
        manager.initialize()?;
        Ok(manager)
    }
    
    pub fn initialize(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Criar diretório de logs se não existir
        if let Some(parent) = Path::new(&self.config.file_path).parent() {
            fs::create_dir_all(parent)?;
        }
        
        // Configurar filtro de ambiente
        let env_filter = EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| EnvFilter::new(&self.config.level));
        
        let mut layers = Vec::new();
        
        // Layer para console
        if self.config.enable_console {
            let console_layer = fmt::layer()
                .with_target(false)
                .with_thread_ids(false)
                .with_thread_names(false)
                .with_ansi(true)
                .with_timer(fmt::time::LocalTime::default())
                .boxed();
            layers.push(console_layer);
        }
        
        // Layer para arquivo
        if self.config.enable_file {
            let file_appender = rolling::Builder::new()
                .rotation(rolling::Rotation::daily())
                .filename_prefix("sgp")
                .filename_suffix("log")
                .max_log_files(self.config.max_files)
                .build(&self.config.file_path)?;
            
            let (non_blocking_appender, guard) = non_blocking(file_appender);
            
            let file_layer = if self.config.enable_json {
                fmt::layer()
                    .json()
                    .with_writer(non_blocking_appender)
                    .boxed()
            } else {
                fmt::layer()
                    .with_target(false)
                    .with_thread_ids(false)
                    .with_thread_names(false)
                    .with_ansi(false)
                    .with_timer(fmt::time::LocalTime::default())
                    .with_writer(non_blocking_appender)
                    .boxed()
            };
            
            layers.push(file_layer);
            self._guard = Some(guard);
        }
        
        // Registrar layers
        Registry::default()
            .with(env_filter)
            .with(layers)
            .init();
        
        info!("Sistema de logs inicializado com sucesso");
        info!("Configuração: {:?}", self.config);
        
        Ok(())
    }
    
    pub fn get_log_files(&self) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let log_dir = Path::new(&self.config.file_path).parent()
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
        let log_dir = Path::new(&self.config.file_path).parent()
            .ok_or("Diretório de logs não encontrado")?;
        
        let file_path = log_dir.join(file_name);
        
        if !file_path.exists() {
            return Err("Arquivo de log não encontrado".into());
        }
        
        let content = fs::read_to_string(file_path)?;
        Ok(content)
    }
    
    pub fn clear_logs(&self) -> Result<(), Box<dyn std::error::Error>> {
        let log_dir = Path::new(&self.config.file_path).parent()
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
        
        info!("Logs limpos com sucesso");
        Ok(())
    }
    
    pub fn get_log_stats(&self) -> Result<LogStats, Box<dyn std::error::Error>> {
        let log_dir = Path::new(&self.config.file_path).parent()
            .ok_or("Diretório de logs não encontrado")?;
        
        let mut total_size = 0;
        let mut file_count = 0;
        let mut oldest_file = None;
        let mut newest_file = None;
        
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
    info!("🚀 Sistema SGP iniciado");
    info!("📅 Data/Hora: {}", Local::now().format("%Y-%m-%d %H:%M:%S"));
    info!("🖥️  Sistema: {}", std::env::consts::OS);
    info!("🏗️  Arquitetura: {}", std::env::consts::ARCH);
}

pub fn log_database_connection(success: bool, details: &str) {
    if success {
        info!("✅ Conexão com banco de dados estabelecida: {}", details);
    } else {
        error!("❌ Falha na conexão com banco de dados: {}", details);
    }
}

pub fn log_user_action(user: &str, action: &str, details: Option<&str>) {
    let message = if let Some(details) = details {
        format!("👤 Usuário '{}' executou '{}': {}", user, action, details)
    } else {
        format!("👤 Usuário '{}' executou '{}'", user, action)
    };
    info!("{}", message);
}

pub fn log_error(error: &str, context: Option<&str>) {
    let message = if let Some(context) = context {
        format!("❌ Erro: {} | Contexto: {}", error, context)
    } else {
        format!("❌ Erro: {}", error)
    };
    error!("{}", message);
}

pub fn log_performance(operation: &str, duration_ms: u64) {
    if duration_ms > 1000 {
        warn!("⚠️  Operação '{}' demorou {}ms (lenta)", operation, duration_ms);
    } else {
        debug!("⚡ Operação '{}' executada em {}ms", operation, duration_ms);
    }
}
