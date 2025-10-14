use crate::db::DbPool;
use crate::models::{LoginRequest, LoginResponse, User};
use bcrypt::verify;
use tauri::State;
use tracing::{error, info};

#[tauri::command]
pub async fn login(
    pool: State<'_, DbPool>,
    request: LoginRequest,
) -> Result<LoginResponse, String> {
    info!("Tentativa de login para usuário: {}", request.username);

    // Buscar usuário no banco de dados
    let user_result = sqlx::query_as::<_, User>(
        "SELECT id, username, password_hash, created_at FROM users WHERE username = $1"
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
                        Ok(LoginResponse {
                            success: true,
                            user_id: Some(user.id),
                            username: Some(user.username),
                            message: "Login realizado com sucesso".to_string(),
                        })
                    } else {
                        info!("Senha inválida para usuário: {}", request.username);
                        Ok(LoginResponse {
                            success: false,
                            user_id: None,
                            username: None,
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
                message: "Usuário ou senha inválidos".to_string(),
            })
        }
        Err(e) => {
            error!("Erro ao buscar usuário: {}", e);
            Err("Erro ao processar login".to_string())
        }
    }
}

