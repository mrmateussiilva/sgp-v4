use crate::models::{CreateVendedorRequest, UpdateVendedorRequest, Vendedor};
use crate::session::SessionManager;
use rust_decimal::Decimal;
use sqlx::PgPool;
use tauri::State;

#[tauri::command]
pub async fn get_vendedores(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<Vec<Vendedor>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let vendedores = sqlx::query_as::<_, Vendedor>(
        "SELECT id, nome, email, telefone, comissao_percentual, ativo, observacao, created_at, updated_at 
         FROM vendedores 
         ORDER BY nome ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar vendedores: {}", e))?;

    Ok(vendedores)
}

#[tauri::command]
pub async fn get_vendedores_ativos(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<Vec<Vendedor>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let vendedores = sqlx::query_as::<_, Vendedor>(
        "SELECT id, nome, email, telefone, comissao_percentual, ativo, observacao, created_at, updated_at 
         FROM vendedores 
         WHERE ativo = true
         ORDER BY nome ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar vendedores ativos: {}", e))?;

    Ok(vendedores)
}

#[tauri::command]
pub async fn get_vendedor_by_id(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    vendedor_id: i32,
) -> Result<Vendedor, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let vendedor = sqlx::query_as::<_, Vendedor>(
        "SELECT id, nome, email, telefone, comissao_percentual, ativo, observacao, created_at, updated_at 
         FROM vendedores 
         WHERE id = $1"
    )
    .bind(vendedor_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar vendedor: {}", e))?;

    Ok(vendedor)
}

#[tauri::command]
pub async fn create_vendedor(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: CreateVendedorRequest,
) -> Result<Vendedor, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let comissao = Decimal::from_f64_retain(request.comissao_percentual)
        .ok_or("Erro ao converter comissao_percentual")?;

    let vendedor = sqlx::query_as::<_, Vendedor>(
        "INSERT INTO vendedores (nome, email, telefone, comissao_percentual, ativo, observacao) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, nome, email, telefone, comissao_percentual, ativo, observacao, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(&request.email)
    .bind(&request.telefone)
    .bind(comissao)
    .bind(request.ativo)
    .bind(&request.observacao)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao criar vendedor: {}", e))?;

    Ok(vendedor)
}

#[tauri::command]
pub async fn update_vendedor(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: UpdateVendedorRequest,
) -> Result<Vendedor, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let comissao = Decimal::from_f64_retain(request.comissao_percentual)
        .ok_or("Erro ao converter comissao_percentual")?;

    let vendedor = sqlx::query_as::<_, Vendedor>(
        "UPDATE vendedores 
         SET nome = $1, email = $2, telefone = $3, comissao_percentual = $4, ativo = $5, observacao = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 
         RETURNING id, nome, email, telefone, comissao_percentual, ativo, observacao, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(&request.email)
    .bind(&request.telefone)
    .bind(comissao)
    .bind(request.ativo)
    .bind(&request.observacao)
    .bind(request.id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao atualizar vendedor: {}", e))?;

    Ok(vendedor)
}

#[tauri::command]
pub async fn delete_vendedor(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    vendedor_id: i32,
) -> Result<bool, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let result = sqlx::query("DELETE FROM vendedores WHERE id = $1")
        .bind(vendedor_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao deletar vendedor: {}", e))?;

    Ok(result.rows_affected() > 0)
}
