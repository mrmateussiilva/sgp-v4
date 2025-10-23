use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;
use sqlx::PgPool;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DbConfig {
    pub host: String,
    pub port: String,
    pub user: String,
    pub password: String,
    pub database: String,
}

impl DbConfig {
    pub fn to_database_url(&self) -> String {
        format!(
            "postgresql://{}:{}@{}:{}/{}",
            self.user, self.password, self.host, self.port, self.database
        )
    }

    pub fn get_config_path() -> Result<PathBuf, String> {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join("db_config.json")
            .canonicalize()
            .or_else(|_| {
                // Se não conseguir fazer canonicalize, retorna o path normal
                Ok(std::env::current_dir()
                    .map_err(|e| e.to_string())?
                    .join("db_config.json"))
            })
    }

    pub fn load_from_file() -> Result<Option<DbConfig>, String> {
        let path = Self::get_config_path()?;
        
        if !path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Erro ao ler arquivo de configuração: {}", e))?;

        let config: DbConfig = serde_json::from_str(&content)
            .map_err(|e| format!("Erro ao parsear configuração: {}", e))?;

        Ok(Some(config))
    }
}

#[command]
pub async fn test_db_connection(db_url: String) -> Result<(), String> {
    match sqlx::PgPool::connect(&db_url).await {
        Ok(pool) => {
            sqlx::query("SELECT 1")
                .execute(&pool)
                .await
                .map_err(|e| format!("Falha na conexão: {}", e))?;
            Ok(())
        }
        Err(e) => Err(format!("Falha na conexão: {}", e)),
    }
}

#[command]
pub async fn test_db_connection_with_pool(pool: State<'_, PgPool>) -> Result<(), String> {
    sqlx::query("SELECT 1")
        .execute(&*pool)
        .await
        .map_err(|e| format!("Falha na conexão: {}", e))?;
    Ok(())
}

#[command]
pub fn save_db_config(config: DbConfig) -> Result<(), String> {
    let path = DbConfig::get_config_path()?;
    
    let data = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Erro ao serializar configuração: {}", e))?;
    
    fs::write(&path, data)
        .map_err(|e| format!("Erro ao salvar configuração: {}", e))?;
    
    Ok(())
}

#[command]
pub fn load_db_config() -> Result<Option<DbConfig>, String> {
    DbConfig::load_from_file()
}

#[command]
pub fn delete_db_config() -> Result<(), String> {
    let path = DbConfig::get_config_path()?;
    
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Erro ao remover arquivo de configuração: {}", e))?;
    }
    
    Ok(())
}
