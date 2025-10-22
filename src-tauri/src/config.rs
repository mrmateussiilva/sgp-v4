use std::env;

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database: DatabaseConfig,
    pub session_timeout_hours: u32,
    pub cache_ttl_seconds: u64,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, String> {
        // Configurações do banco de dados
        let database_url = match env::var("DATABASE_URL") {
            Ok(url) => url,
            Err(_) => {
                // Construir URL a partir de variáveis individuais
                let host = env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
                let port = env::var("DB_PORT").unwrap_or_else(|_| "5432".to_string());
                let name = env::var("DB_NAME").unwrap_or_else(|_| "sgp_v4".to_string());
                let user = env::var("DB_USER").map_err(|_| "DB_USER deve estar definida no arquivo .env")?;
                let password = env::var("DB_PASSWORD").map_err(|_| "DB_PASSWORD deve estar definida no arquivo .env")?;
                
                format!("postgresql://{}:{}@{}:{}/{}", user, password, host, port, name)
            }
        };

        let max_connections = env::var("DB_MAX_CONNECTIONS")
            .unwrap_or_else(|_| "5".to_string())
            .parse::<u32>()
            .unwrap_or(5);

        let database = DatabaseConfig {
            url: database_url,
            max_connections,
        };

        // Configurações da aplicação
        let session_timeout_hours = env::var("SESSION_TIMEOUT_HOURS")
            .unwrap_or_else(|_| "12".to_string())
            .parse::<u32>()
            .unwrap_or(12);

        let cache_ttl_seconds = env::var("CACHE_TTL_SECONDS")
            .unwrap_or_else(|_| "300".to_string())
            .parse::<u64>()
            .unwrap_or(300);

        Ok(AppConfig {
            database,
            session_timeout_hours,
            cache_ttl_seconds,
        })
    }

    pub fn get_masked_database_url(&self) -> String {
        if let Some(at_pos) = self.database.url.find('@') {
            let before_at = &self.database.url[..at_pos];
            let after_at = &self.database.url[at_pos..];
            
            if let Some(colon_pos) = before_at.find(':') {
                let user = &before_at[..colon_pos];
                format!("postgresql://{}:***{}", user, after_at)
            } else {
                format!("postgresql://***{}", after_at)
            }
        } else {
            "postgresql://***".to_string()
        }
    }
}
