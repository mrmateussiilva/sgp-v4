use crate::db::DbPool;
use crate::models::{LoginRequest, LoginResponse, User};
use crate::session::SessionManager;
use bcrypt::verify;
use tauri::State;
use tracing::{error, info};

#[tauri::command]
pub async fn login(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    request: LoginRequest,
) -> Result<LoginResponse, String> {
    info!("Tentativa de login para usuário: {}", request.username);

    // Buscar usuário no banco de dados
    let user_result = sqlx::query_as::<_, User>(
        "SELECT id, username, password_hash, is_admin, created_at FROM users WHERE username = $1",
    )
    .bind(&request.username)
    .fetch_optional(pool.inner())
    .await;

    match user_result {
        Ok(Some(user)) => {
            // Verificar senha
            match verify(&request.password, &user.password_hash) {
                Ok(is_valid) => {
                    if is_valid {
                        info!("Login bem-sucedido para usuário: {}", request.username);
                        let token = sessions
                            .create_session(user.id, user.username.clone(), user.is_admin)
                            .await;

                        Ok(LoginResponse {
                            success: true,
                            user_id: Some(user.id),
                            username: Some(user.username.clone()),
                            is_admin: Some(user.is_admin),
                            session_token: Some(token),
                            message: "Login realizado com sucesso".to_string(),
                        })
                    } else {
                        info!("Senha inválida para usuário: {}", request.username);
                        Ok(LoginResponse {
                            success: false,
                            user_id: None,
                            username: None,
                            is_admin: None,
                            session_token: None,
                            message: "Usuário ou senha inválidos".to_string(),
                        })
                    }
                }
                Err(e) => {
                    error!("Erro ao verificar senha: {}", e);
                    Err("Erro ao verificar credenciais".to_string())
                }
            }
        }
        Ok(None) => {
            info!("Usuário não encontrado: {}", request.username);
            Ok(LoginResponse {
                success: false,
                user_id: None,
                username: None,
                is_admin: None,
                session_token: None,
                message: "Usuário ou senha inválidos".to_string(),
            })
        }
        Err(e) => {
            error!("Erro ao buscar usuário: {}", e);
            Err("Erro ao processar login".to_string())
        }
    }
}

#[tauri::command]
pub async fn logout(
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<bool, String> {
    sessions.invalidate(&session_token).await;
    Ok(true)
}
