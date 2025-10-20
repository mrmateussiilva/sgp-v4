use crate::models::{Cliente, CreateClienteRequest, UpdateClienteRequest};
use crate::session::SessionManager;
use sqlx::PgPool;
use tauri::State;

#[tauri::command]
pub async fn get_clientes(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<Vec<Cliente>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let clientes = sqlx::query_as::<_, Cliente>(
        "SELECT id, nome, cep, cidade, estado, telefone, created_at, updated_at 
         FROM clientes 
         ORDER BY nome ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar clientes: {}", e))?;

    Ok(clientes)
}

#[tauri::command]
pub async fn get_cliente_by_id(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    cliente_id: i32,
) -> Result<Cliente, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let cliente = sqlx::query_as::<_, Cliente>(
        "SELECT id, nome, cep, cidade, estado, telefone, created_at, updated_at 
         FROM clientes 
         WHERE id = $1",
    )
    .bind(cliente_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Cliente não encontrado: {}", e))?;

    Ok(cliente)
}

#[tauri::command]
pub async fn create_cliente(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: CreateClienteRequest,
) -> Result<Cliente, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let cliente = sqlx::query_as::<_, Cliente>(
        "INSERT INTO clientes (nome, cep, cidade, estado, telefone) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, nome, cep, cidade, estado, telefone, created_at, updated_at",
    )
    .bind(&request.nome)
    .bind(&request.cep)
    .bind(&request.cidade)
    .bind(&request.estado)
    .bind(&request.telefone)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao criar cliente: {}", e))?;

    Ok(cliente)
}

#[tauri::command]
pub async fn update_cliente(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: UpdateClienteRequest,
) -> Result<Cliente, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let cliente = sqlx::query_as::<_, Cliente>(
        "UPDATE clientes 
         SET nome = $1, cep = $2, cidade = $3, estado = $4, telefone = $5, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $6 
         RETURNING id, nome, cep, cidade, estado, telefone, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(&request.cep)
    .bind(&request.cidade)
    .bind(&request.estado)
    .bind(&request.telefone)
    .bind(request.id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao atualizar cliente: {}", e))?;

    Ok(cliente)
}

#[tauri::command]
pub async fn delete_cliente(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    cliente_id: i32,
) -> Result<bool, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM clientes WHERE id = $1")
        .bind(cliente_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao excluir cliente: {}", e))?;

    Ok(true)
}
