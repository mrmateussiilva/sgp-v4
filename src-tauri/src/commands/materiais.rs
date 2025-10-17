use crate::models::{CreateMaterialRequest, Material, UpdateMaterialRequest};
use rust_decimal::Decimal;
use sqlx::PgPool;
use tauri::State;

#[tauri::command]
pub async fn get_materiais(pool: State<'_, PgPool>) -> Result<Vec<Material>, String> {
    let materiais = sqlx::query_as::<_, Material>(
        "SELECT id, nome, tipo, valor_metro, estoque_metros, ativo, observacao, created_at, updated_at 
         FROM materiais 
         ORDER BY nome ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar materiais: {}", e))?;

    Ok(materiais)
}

#[tauri::command]
pub async fn get_materiais_ativos(pool: State<'_, PgPool>) -> Result<Vec<Material>, String> {
    let materiais = sqlx::query_as::<_, Material>(
        "SELECT id, nome, tipo, valor_metro, estoque_metros, ativo, observacao, created_at, updated_at 
         FROM materiais 
         WHERE ativo = true
         ORDER BY nome ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar materiais ativos: {}", e))?;

    Ok(materiais)
}

#[tauri::command]
pub async fn get_material_by_id(
    pool: State<'_, PgPool>,
    material_id: i32,
) -> Result<Material, String> {
    let material = sqlx::query_as::<_, Material>(
        "SELECT id, nome, tipo, valor_metro, estoque_metros, ativo, observacao, created_at, updated_at 
         FROM materiais 
         WHERE id = $1"
    )
    .bind(material_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar material: {}", e))?;

    Ok(material)
}

#[tauri::command]
pub async fn create_material(
    pool: State<'_, PgPool>,
    request: CreateMaterialRequest,
) -> Result<Material, String> {
    let valor_metro =
        Decimal::from_f64_retain(request.valor_metro).ok_or("Erro ao converter valor_metro")?;
    let estoque_metros = Decimal::from_f64_retain(request.estoque_metros)
        .ok_or("Erro ao converter estoque_metros")?;

    let material = sqlx::query_as::<_, Material>(
        "INSERT INTO materiais (nome, tipo, valor_metro, estoque_metros, ativo, observacao) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, nome, tipo, valor_metro, estoque_metros, ativo, observacao, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(&request.tipo)
    .bind(valor_metro)
    .bind(estoque_metros)
    .bind(request.ativo)
    .bind(&request.observacao)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao criar material: {}", e))?;

    Ok(material)
}

#[tauri::command]
pub async fn update_material(
    pool: State<'_, PgPool>,
    request: UpdateMaterialRequest,
) -> Result<Material, String> {
    let valor_metro =
        Decimal::from_f64_retain(request.valor_metro).ok_or("Erro ao converter valor_metro")?;
    let estoque_metros = Decimal::from_f64_retain(request.estoque_metros)
        .ok_or("Erro ao converter estoque_metros")?;

    let material = sqlx::query_as::<_, Material>(
        "UPDATE materiais 
         SET nome = $1, tipo = $2, valor_metro = $3, estoque_metros = $4, ativo = $5, observacao = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 
         RETURNING id, nome, tipo, valor_metro, estoque_metros, ativo, observacao, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(&request.tipo)
    .bind(valor_metro)
    .bind(estoque_metros)
    .bind(request.ativo)
    .bind(&request.observacao)
    .bind(request.id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao atualizar material: {}", e))?;

    Ok(material)
}

#[tauri::command]
pub async fn delete_material(pool: State<'_, PgPool>, material_id: i32) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM materiais WHERE id = $1")
        .bind(material_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao deletar material: {}", e))?;

    Ok(result.rows_affected() > 0)
}
