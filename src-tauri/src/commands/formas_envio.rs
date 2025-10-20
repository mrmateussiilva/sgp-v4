use crate::models::{CreateFormaEnvioRequest, FormaEnvio, UpdateFormaEnvioRequest};
use crate::session::SessionManager;
use rust_decimal::Decimal;
use sqlx::PgPool;
use tauri::State;

#[tauri::command]
pub async fn get_formas_envio(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<Vec<FormaEnvio>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let formas = sqlx::query_as::<_, FormaEnvio>(
        "SELECT id, nome, valor, prazo_dias, ativo, observacao, created_at, updated_at 
         FROM formas_envio 
         ORDER BY nome ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar formas de envio: {}", e))?;

    Ok(formas)
}

#[tauri::command]
pub async fn get_formas_envio_ativas(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<Vec<FormaEnvio>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let formas = sqlx::query_as::<_, FormaEnvio>(
        "SELECT id, nome, valor, prazo_dias, ativo, observacao, created_at, updated_at 
         FROM formas_envio 
         WHERE ativo = true
         ORDER BY nome ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar formas de envio ativas: {}", e))?;

    Ok(formas)
}

#[tauri::command]
pub async fn get_forma_envio_by_id(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    forma_id: i32,
) -> Result<FormaEnvio, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let forma = sqlx::query_as::<_, FormaEnvio>(
        "SELECT id, nome, valor, prazo_dias, ativo, observacao, created_at, updated_at 
         FROM formas_envio 
         WHERE id = $1",
    )
    .bind(forma_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar forma de envio: {}", e))?;

    Ok(forma)
}

#[tauri::command]
pub async fn create_forma_envio(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: CreateFormaEnvioRequest,
) -> Result<FormaEnvio, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let valor = Decimal::from_f64_retain(request.valor).ok_or("Erro ao converter valor")?;

    let forma = sqlx::query_as::<_, FormaEnvio>(
        "INSERT INTO formas_envio (nome, valor, prazo_dias, ativo, observacao) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, nome, valor, prazo_dias, ativo, observacao, created_at, updated_at",
    )
    .bind(&request.nome)
    .bind(valor)
    .bind(request.prazo_dias)
    .bind(request.ativo)
    .bind(&request.observacao)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao criar forma de envio: {}", e))?;

    Ok(forma)
}

#[tauri::command]
pub async fn update_forma_envio(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: UpdateFormaEnvioRequest,
) -> Result<FormaEnvio, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let valor = Decimal::from_f64_retain(request.valor).ok_or("Erro ao converter valor")?;

    let forma = sqlx::query_as::<_, FormaEnvio>(
        "UPDATE formas_envio 
         SET nome = $1, valor = $2, prazo_dias = $3, ativo = $4, observacao = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 
         RETURNING id, nome, valor, prazo_dias, ativo, observacao, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(valor)
    .bind(request.prazo_dias)
    .bind(request.ativo)
    .bind(&request.observacao)
    .bind(request.id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao atualizar forma de envio: {}", e))?;

    Ok(forma)
}

#[tauri::command]
pub async fn delete_forma_envio(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    forma_id: i32,
) -> Result<bool, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let result = sqlx::query("DELETE FROM formas_envio WHERE id = $1")
        .bind(forma_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao deletar forma de envio: {}", e))?;

    Ok(result.rows_affected() > 0)
}
