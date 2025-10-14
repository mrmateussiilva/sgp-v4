use crate::models::{Vendedor, CreateVendedorRequest, UpdateVendedorRequest};
use tauri::State;
use sqlx::PgPool;
use rust_decimal::Decimal;

#[tauri::command]
pub async fn get_vendedores(pool: State<'_, PgPool>) -> Result<Vec<Vendedor>, String> {
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
pub async fn get_vendedores_ativos(pool: State<'_, PgPool>) -> Result<Vec<Vendedor>, String> {
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
pub async fn get_vendedor_by_id(pool: State<'_, PgPool>, vendedor_id: i32) -> Result<Vendedor, String> {
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
    request: CreateVendedorRequest,
) -> Result<Vendedor, String> {
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
    request: UpdateVendedorRequest,
) -> Result<Vendedor, String> {
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
pub async fn delete_vendedor(pool: State<'_, PgPool>, vendedor_id: i32) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM vendedores WHERE id = $1")
        .bind(vendedor_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao deletar vendedor: {}", e))?;

    Ok(result.rows_affected() > 0)
}

