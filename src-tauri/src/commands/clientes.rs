use crate::models::{
    BulkClienteImportError, BulkClienteImportRequest, BulkClienteImportResult, Cliente,
    CreateClienteRequest, UpdateClienteRequest, PaginatedClientes,
};
use crate::session::SessionManager;
use crate::cache::CacheManager;
use sqlx::PgPool;
use tauri::State;
use tracing::{error, info};
use std::time::Duration;

fn normalize_optional_field(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_owned())
        }
    })
}

fn normalize_required_nome(nome: String) -> Result<String, String> {
    let trimmed = nome.trim();
    if trimmed.is_empty() {
        Err("Nome é obrigatório.".to_string())
    } else {
        Ok(trimmed.to_owned())
    }
}

#[tauri::command]
pub async fn get_clientes_paginated(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    page: Option<i32>,
    page_size: Option<i32>,
) -> Result<PaginatedClientes, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(50).min(200).max(1); // Limitar entre 1-200
    let offset = (page - 1) * page_size;
    
    // Chave do cache baseada nos parâmetros
    let cache_key = format!("clientes_paginated_{}_{}", page, page_size);
    
    // Tentar buscar do cache primeiro
    if let Some(cached_result) = cache.get::<PaginatedClientes>(&cache_key).await {
        info!("Retornando clientes do cache - página: {}, tamanho: {}", page, page_size);
        return Ok(cached_result);
    }
    
    info!("Buscando clientes paginados no banco - página: {}, tamanho: {}", page, page_size);

    // Primeiro, contar total de clientes
    let total_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM clientes"
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao contar clientes: {}", e);
        "Erro ao contar clientes".to_string()
    })?;

    // Buscar clientes paginados com índice otimizado
    let clientes = sqlx::query_as::<_, Cliente>(
        "SELECT id, nome, cep, cidade, estado, telefone, created_at, updated_at 
         FROM clientes 
         ORDER BY nome ASC
         LIMIT $1 OFFSET $2",
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao buscar clientes paginados: {}", e);
        "Erro ao buscar clientes".to_string()
    })?;

    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;
    
    let result = PaginatedClientes {
        clientes,
        total: total_count,
        page: page as i64,
        page_size: page_size as i64,
        total_pages,
    };
    
    // Armazenar no cache por 5 minutos (clientes mudam menos frequentemente)
    cache.set(cache_key, result.clone(), Duration::from_secs(300)).await;
    
    info!("Retornando {} clientes (página {}/{})", result.clientes.len(), page, total_pages);
    
    Ok(result)
}

#[tauri::command]
pub async fn get_clientes(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
) -> Result<Vec<Cliente>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    // Chave do cache para todos os clientes
    let cache_key = "all_clientes";
    
    // Tentar buscar do cache primeiro
    if let Some(cached_result) = cache.get::<Vec<Cliente>>(&cache_key).await {
        info!("Retornando todos os clientes do cache");
        return Ok(cached_result);
    }
    
    info!("Buscando todos os clientes no banco");
    
    let clientes = sqlx::query_as::<_, Cliente>(
        "SELECT id, nome, cep, cidade, estado, telefone, created_at, updated_at 
         FROM clientes 
         ORDER BY nome ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao buscar clientes: {}", e);
        "Erro ao buscar clientes".to_string()
    })?;

    // Armazenar no cache por 5 minutos
    cache.set(cache_key.to_string(), clientes.clone(), Duration::from_secs(300)).await;
    
    info!("Retornando {} clientes do banco", clientes.len());
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
    cache: State<'_, CacheManager>,
    session_token: String,
    request: CreateClienteRequest,
) -> Result<Cliente, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let CreateClienteRequest {
        nome,
        cep,
        cidade,
        estado,
        telefone,
    } = request;

    let nome = normalize_required_nome(nome)?;
    let cep = normalize_optional_field(cep);
    let cidade = normalize_optional_field(cidade);
    let estado = normalize_optional_field(estado);
    let telefone = normalize_optional_field(telefone);

    let cliente = sqlx::query_as::<_, Cliente>(
        "INSERT INTO clientes (nome, cep, cidade, estado, telefone) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, nome, cep, cidade, estado, telefone, created_at, updated_at",
    )
    .bind(&nome)
    .bind(cep.as_deref())
    .bind(cidade.as_deref())
    .bind(estado.as_deref())
    .bind(telefone.as_deref())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao criar cliente: {}", e))?;

    // Invalidar cache de clientes
    cache.invalidate_pattern("clientes").await;
    info!("Cache de clientes invalidado após criação");

    Ok(cliente)
}

#[tauri::command]
pub async fn update_cliente(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    request: UpdateClienteRequest,
) -> Result<Cliente, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    let UpdateClienteRequest {
        id,
        nome,
        cep,
        cidade,
        estado,
        telefone,
    } = request;

    let nome = normalize_required_nome(nome)?;
    let cep = normalize_optional_field(cep);
    let cidade = normalize_optional_field(cidade);
    let estado = normalize_optional_field(estado);
    let telefone = normalize_optional_field(telefone);

    let cliente = sqlx::query_as::<_, Cliente>(
        "UPDATE clientes 
         SET nome = $1, cep = $2, cidade = $3, estado = $4, telefone = $5, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $6 
         RETURNING id, nome, cep, cidade, estado, telefone, created_at, updated_at"
    )
    .bind(&nome)
    .bind(cep.as_deref())
    .bind(cidade.as_deref())
    .bind(estado.as_deref())
    .bind(telefone.as_deref())
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| format!("Erro ao atualizar cliente: {}", e))?;

    // Invalidar cache de clientes
    cache.invalidate_pattern("clientes").await;
    info!("Cache de clientes invalidado após atualização");

    Ok(cliente)
}

#[tauri::command]
pub async fn import_clientes_bulk(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: BulkClienteImportRequest,
) -> Result<BulkClienteImportResult, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;

    let mut imported = Vec::new();
    let mut errors = Vec::new();

    for (index, item) in request.clientes.into_iter().enumerate() {
        let nome = match normalize_required_nome(item.nome) {
            Ok(value) => value,
            Err(message) => {
                errors.push(BulkClienteImportError {
                    index,
                    nome: None,
                    message,
                });
                continue;
            }
        };

        let cep = normalize_optional_field(item.cep);
        let cidade = normalize_optional_field(item.cidade);
        let estado = normalize_optional_field(item.estado);
        let telefone = normalize_optional_field(item.telefone);

        match sqlx::query_as::<_, Cliente>(
            "INSERT INTO clientes (nome, cep, cidade, estado, telefone) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, nome, cep, cidade, estado, telefone, created_at, updated_at",
        )
        .bind(&nome)
        .bind(cep.as_deref())
        .bind(cidade.as_deref())
        .bind(estado.as_deref())
        .bind(telefone.as_deref())
        .fetch_one(pool.inner())
        .await
        {
            Ok(cliente) => imported.push(cliente),
            Err(err) => errors.push(BulkClienteImportError {
                index,
                nome: Some(nome.clone()),
                message: format!("Erro ao importar cliente: {}", err),
            }),
        }
    }

    Ok(BulkClienteImportResult { imported, errors })
}

#[tauri::command]
pub async fn delete_cliente(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
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

    // Invalidar cache de clientes
    cache.invalidate_pattern("clientes").await;
    info!("Cache de clientes invalidado após exclusão");

    Ok(true)
}
