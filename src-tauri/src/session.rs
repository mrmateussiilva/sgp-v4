use chrono::{DateTime, Duration, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct SessionData {
    pub user_id: i32,
    pub username: String,
    pub is_admin: bool,
    pub expires_at: DateTime<Utc>,
}

impl SessionData {
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

#[derive(Debug, Clone)]
pub struct SessionInfo {
    pub user_id: i32,
    pub username: String,
    pub is_admin: bool,
}

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("Sessão inválida. Faça login novamente.")]
    Invalid,
    #[error("Sessão expirada. Faça login novamente.")]
    Expired,
    #[error("Acesso não autorizado.")]
    Unauthorized,
}

#[derive(Clone)]
pub struct SessionManager {
    sessions: Arc<RwLock<HashMap<String, SessionData>>>,
    ttl: Duration,
}

impl SessionManager {
    pub fn new(ttl_hours: i64) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            ttl: Duration::hours(ttl_hours),
        }
    }

    pub async fn create_session(&self, user_id: i32, username: String, is_admin: bool) -> String {
        let token = Uuid::new_v4().to_string();
        let data = SessionData {
            user_id,
            username,
            is_admin,
            expires_at: Utc::now() + self.ttl,
        };

        self.sessions.write().await.insert(token.clone(), data);
        token
    }

    pub async fn validate(&self, token: &str) -> Result<SessionInfo, SessionError> {
        let mut sessions = self.sessions.write().await;

        match sessions.get(token) {
            Some(session) if !session.is_expired() => {
                let info = SessionInfo {
                    user_id: session.user_id,
                    username: session.username.clone(),
                    is_admin: session.is_admin,
                };

                // Renova a expiração para usuários ativos.
                let mut updated_session = session.clone();
                updated_session.expires_at = Utc::now() + self.ttl;
                sessions.insert(token.to_string(), updated_session);

                Ok(info)
            }
            Some(_) => {
                sessions.remove(token);
                Err(SessionError::Expired)
            }
            None => Err(SessionError::Invalid),
        }
    }

    pub async fn require_authenticated(&self, token: &str) -> Result<SessionInfo, SessionError> {
        self.validate(token).await
    }

    pub async fn require_admin(&self, token: &str) -> Result<SessionInfo, SessionError> {
        let info = self.validate(token).await?;
        if !info.is_admin {
            return Err(SessionError::Unauthorized);
        }
        Ok(info)
    }

    pub async fn invalidate(&self, token: &str) {
        self.sessions.write().await.remove(token);
    }
}
