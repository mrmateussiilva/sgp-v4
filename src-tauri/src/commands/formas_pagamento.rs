use crate::models::{CreateFormaPagamentoRequest, FormaPagamento, UpdateFormaPagamentoRequest};
use rust_decimal::Decimal;
use sqlx::PgPool;
use tauri::State;

#[tauri::command]
pub async fn get_formas_pagamento(pool: State<'_, PgPool>) -> Result<Vec<FormaPagamento>, String> {
    let formas = sqlx::query_as::<_, FormaPagamento>(
        "SELECT id, nome, parcelas_max, taxa_percentual, ativo, observacao, created_at, updated_at 
         FROM formas_pagamento 
         ORDER BY nome ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar formas de pagamento: {}", e))?;

    Ok(formas)
}

#[tauri::command]
pub async fn get_formas_pagamento_ativas(
    pool: State<'_, PgPool>,
) -> Result<Vec<FormaPagamento>, String> {
    let formas = sqlx::query_as::<_, FormaPagamento>(
        "SELECT id, nome, parcelas_max, taxa_percentual, ativo, observacao, created_at, updated_at 
         FROM formas_pagamento 
         WHERE ativo = true
         ORDER BY nome ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar formas de pagamento ativas: {}", e))?;

    Ok(formas)
}

#[tauri::command]
pub async fn get_forma_pagamento_by_id(
    pool: State<'_, PgPool>,
    forma_id: i32,
) -> Result<FormaPagamento, String> {
    let forma = sqlx::query_as::<_, FormaPagamento>(
        "SELECT id, nome, parcelas_max, taxa_percentual, ativo, observacao, created_at, updated_at 
         FROM formas_pagamento 
         WHERE id = $1",
    )
    .bind(forma_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao buscar forma de pagamento: {}", e))?;

    Ok(forma)
}

#[tauri::command]
pub async fn create_forma_pagamento(
    pool: State<'_, PgPool>,
    request: CreateFormaPagamentoRequest,
) -> Result<FormaPagamento, String> {
    let taxa = Decimal::from_f64_retain(request.taxa_percentual)
        .ok_or("Erro ao converter taxa_percentual")?;

    let forma = sqlx::query_as::<_, FormaPagamento>(
        "INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo, observacao) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, nome, parcelas_max, taxa_percentual, ativo, observacao, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(request.parcelas_max)
    .bind(taxa)
    .bind(request.ativo)
    .bind(&request.observacao)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao criar forma de pagamento: {}", e))?;

    Ok(forma)
}

#[tauri::command]
pub async fn update_forma_pagamento(
    pool: State<'_, PgPool>,
    request: UpdateFormaPagamentoRequest,
) -> Result<FormaPagamento, String> {
    let taxa = Decimal::from_f64_retain(request.taxa_percentual)
        .ok_or("Erro ao converter taxa_percentual")?;

    let forma = sqlx::query_as::<_, FormaPagamento>(
        "UPDATE formas_pagamento 
         SET nome = $1, parcelas_max = $2, taxa_percentual = $3, ativo = $4, observacao = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 
         RETURNING id, nome, parcelas_max, taxa_percentual, ativo, observacao, created_at, updated_at"
    )
    .bind(&request.nome)
    .bind(request.parcelas_max)
    .bind(taxa)
    .bind(request.ativo)
    .bind(&request.observacao)
    .bind(request.id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao atualizar forma de pagamento: {}", e))?;

    Ok(forma)
}

#[tauri::command]
pub async fn delete_forma_pagamento(
    pool: State<'_, PgPool>,
    forma_id: i32,
) -> Result<bool, String> {
    let result = sqlx::query("DELETE FROM formas_pagamento WHERE id = $1")
        .bind(forma_id)
        .execute(pool.inner())
        .await
        .map_err(|e| format!("Erro ao deletar forma de pagamento: {}", e))?;

    Ok(result.rows_affected() > 0)
}
