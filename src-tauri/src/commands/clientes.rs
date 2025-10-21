use crate::models::{
    BulkClienteImportError, BulkClienteImportRequest, BulkClienteImportResult, Cliente,
    CreateClienteRequest, UpdateClienteRequest,
};
use crate::session::SessionManager;
use sqlx::PgPool;
use tauri::State;

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
