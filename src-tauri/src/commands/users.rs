use crate::models::User;
use bcrypt::{hash, DEFAULT_COST};
use sqlx::PgPool;
use tauri::State;

#[derive(Debug, serde::Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub is_admin: bool,
}

#[derive(Debug, serde::Deserialize)]
pub struct UpdateUserRequest {
    pub id: i32,
    pub username: String,
    pub password: Option<String>, // Se None, não altera a senha
    pub is_admin: bool,
}

#[tauri::command]
pub async fn get_users(pool: State<'_, PgPool>) -> Result<Vec<User>, String> {
    let users = sqlx::query_as::<_, User>(
        "SELECT id, username, password_hash, is_admin, created_at 
         FROM users 
         ORDER BY username ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar usuários: {}", e))?;

    Ok(users)
}

#[tauri::command]
pub async fn get_user_by_id(pool: State<'_, PgPool>, user_id: i32) -> Result<User, String> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, password_hash, is_admin, created_at 
         FROM users 
         WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar usuário: {}", e))?;

    Ok(user)
}

#[tauri::command]
pub async fn create_user(
    pool: State<'_, PgPool>,
    request: CreateUserRequest,
) -> Result<User, String> {
    // Hash da senha
    let password_hash = hash(&request.password, DEFAULT_COST)
        .map_err(|e| format!("Erro ao gerar hash da senha: {}", e))?;

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (username, password_hash, is_admin) 
         VALUES ($1, $2, $3) 
         RETURNING id, username, password_hash, is_admin, created_at",
    )
    .bind(&request.username)
    .bind(&password_hash)
    .bind(request.is_admin)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao criar usuário: {}", e))?;

    Ok(user)
}

#[tauri::command]
pub async fn update_user(
    pool: State<'_, PgPool>,
    request: UpdateUserRequest,
) -> Result<User, String> {
    // Se tem nova senha, gera hash
    if let Some(password) = request.password {
        let password_hash = hash(&password, DEFAULT_COST)
            .map_err(|e| format!("Erro ao gerar hash da senha: {}", e))?;

        let user = sqlx::query_as::<_, User>(
            "UPDATE users 
             SET username = $1, password_hash = $2, is_admin = $3
             WHERE id = $4 
             RETURNING id, username, password_hash, is_admin, created_at",
        )
        .bind(&request.username)
        .bind(&password_hash)
        .bind(request.is_admin)
        .bind(request.id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Erro ao atualizar usuário: {}", e))?;

        Ok(user)
    } else {
        // Não altera a senha
        let user = sqlx::query_as::<_, User>(
            "UPDATE users 
             SET username = $1, is_admin = $2
             WHERE id = $3 
             RETURNING id, username, password_hash, is_admin, created_at",
        )
        .bind(&request.username)
        .bind(request.is_admin)
        .bind(request.id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Erro ao atualizar usuário: {}", e))?;

        Ok(user)
    }
}

#[tauri::command]
pub async fn delete_user(pool: State<'_, PgPool>, user_id: i32) -> Result<bool, String> {
    // Não permite deletar o último admin
    let admin_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE is_admin = true")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| format!("Erro ao contar admins: {}", e))?;

    let user: User = sqlx::query_as(
        "SELECT id, username, password_hash, is_admin, created_at FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar usuário: {}", e))?;

    if user.is_admin && admin_count <= 1 {
        return Err("Não é possível excluir o último administrador do sistema.".to_string());
    }

    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao deletar usuário: {}", e))?;

    Ok(result.rows_affected() > 0)
}
