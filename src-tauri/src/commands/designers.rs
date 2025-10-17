use crate::models::{CreateDesignerRequest, Designer, UpdateDesignerRequest};
use sqlx::PgPool;
use tauri::State;

#[tauri::command]
pub async fn get_designers(pool: State<'_, PgPool>) -> Result<Vec<Designer>, String> {
    let designers = sqlx::query_as::<_, Designer>(
        "SELECT id, nome, email, telefone, ativo, observacao, created_at, updated_at 
         FROM designers 
         ORDER BY nome ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar designers: {}", e))?;

    Ok(designers)
}

#[tauri::command]
pub async fn get_designers_ativos(pool: State<'_, PgPool>) -> Result<Vec<Designer>, String> {
    let designers = sqlx::query_as::<_, Designer>(
        "SELECT id, nome, email, telefone, ativo, observacao, created_at, updated_at 
         FROM designers 
         WHERE ativo = true
         ORDER BY nome ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar designers ativos: {}", e))?;

    Ok(designers)
}

#[tauri::command]
pub async fn get_designer_by_id(
    pool: State<'_, PgPool>,
    designer_id: i32,
) -> Result<Designer, String> {
    let designer = sqlx::query_as::<_, Designer>(
        "SELECT id, nome, email, telefone, ativo, observacao, created_at, updated_at 
         FROM designers 
         WHERE id = $1",
    )
    .bind(designer_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar designer: {}", e))?;

    Ok(designer)
}

#[tauri::command]
pub async fn create_designer(
    pool: State<'_, PgPool>,
    request: CreateDesignerRequest,
) -> Result<Designer, String> {
    let designer = sqlx::query_as::<_, Designer>(
        "INSERT INTO designers (nome, email, telefone, ativo, observacao) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, nome, email, telefone, ativo, observacao, created_at, updated_at",
    )
    .bind(&request.nome)
    .bind(&request.email)
    .bind(&request.telefone)
    .bind(request.ativo)
    .bind(&request.observacao)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao criar designer: {}", e))?;

    Ok(designer)
}

#[tauri::command]
pub async fn update_designer(
    pool: State<'_, PgPool>,
    request: UpdateDesignerRequest,
) -> Result<Designer, String> {
    let designer = sqlx::query_as::<_, Designer>(
        "UPDATE designers 
         SET nome = $1, email = $2, telefone = $3, ativo = $4, observacao = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 
         RETURNING id, nome, email, telefone, ativo, observacao, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(&request.email)
    .bind(&request.telefone)
    .bind(request.ativo)
    .bind(&request.observacao)
    .bind(request.id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao atualizar designer: {}", e))?;

    Ok(designer)
}

#[tauri::command]
pub async fn delete_designer(pool: State<'_, PgPool>, designer_id: i32) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM designers WHERE id = $1")
        .bind(designer_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao deletar designer: {}", e))?;

    Ok(result.rows_affected() > 0)
}
