use crate::db::DbPool;
use crate::models::*;
use crate::session::SessionManager;
use crate::cache::CacheManager;
use crate::notifications::{notify_order_created, notify_order_updated, notify_order_deleted, notify_order_status_changed};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde_json::{json, Map, Value};
use sqlx::{QueryBuilder, Row};
use tauri::{State, AppHandle};
use tracing::{error, info};
use std::time::Duration;

#[tauri::command]
pub async fn get_pending_orders_paginated(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    page: Option<i32>,
    page_size: Option<i32>,
) -> Result<PaginatedOrders, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).min(100).max(1); // Limitar entre 1-100
    let offset = (page - 1) * page_size;
    
    // Chave do cache baseada nos parâmetros
    let cache_key = format!("pending_orders_paginated_{}_{}", page, page_size);
    
    // Tentar buscar do cache primeiro
    if let Some(cached_result) = cache.get::<PaginatedOrders>(&cache_key).await {
        info!("Retornando pedidos pendentes do cache - página: {}, tamanho: {}", page, page_size);
        return Ok(cached_result);
    }
    
    info!("Buscando pedidos pendentes paginados no banco - página: {}, tamanho: {}", page, page_size);

    // Primeiro, contar total de pedidos pendentes
    let total_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT id) FROM orders WHERE pronto IS NULL OR pronto = false"
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao contar pedidos pendentes: {}", e);
        "Erro ao contar pedidos".to_string()
    })?;

    // 1ª consulta - apenas pedidos (otimizada com índices compostos)
    let rows = sqlx::query(
        r#"
        SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
               data_entrada, data_entrega, total_value, valor_frete, status, prioridade,
               observacao, financeiro, conferencia, sublimacao, costura, expedicao,
               forma_envio, forma_pagamento_id, pronto, created_at, updated_at
        FROM orders
        WHERE pronto IS NULL OR pronto = false
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao buscar pedidos pendentes paginados: {}", e);
        "Erro ao buscar pedidos pendentes".to_string()
    })?;

    let mut orders = Vec::new();
    for row in rows {
        let order = Order {
            id: row.get("id"),
            numero: row.get("numero"),
            cliente: row.get("cliente"),
            cidade_cliente: row.get("cidade_cliente"),
            estado_cliente: row.get("estado_cliente"),
            telefone_cliente: row.get("telefone_cliente"),
            data_entrada: row.get("data_entrada"),
            data_entrega: row.get("data_entrega"),
            total_value: row.get("total_value"),
            valor_frete: row.get("valor_frete"),
            status: row.get("status"),
            prioridade: row.get("prioridade"),
            observacao: row.get("observacao"),
            financeiro: row.get("financeiro"),
            conferencia: row.get("conferencia"),
            sublimacao: row.get("sublimacao"),
            costura: row.get("costura"),
            expedicao: row.get("expedicao"),
            forma_envio: row.get("forma_envio"),
            forma_pagamento_id: row.get("forma_pagamento_id"),
            pronto: row.get("pronto"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };
        orders.push(order);
    }

    // 2ª consulta - itens dos pedidos retornados (otimizada com índice)
    let order_ids: Vec<i32> = orders.iter().map(|o| o.id).collect();
    let items: Vec<OrderItem> = if !order_ids.is_empty() {
        // Usar array PostgreSQL para melhor performance
        sqlx::query_as::<_, OrderItem>(
            "SELECT id, order_id, item_name, quantity, unit_price, subtotal, 
                    tipo_producao, descricao, largura, altura, metro_quadrado, 
                    vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
                    quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha, 
                    espaco_cordinha, valor_cordinha, observacao, imagem, quantidade_paineis, valor_unitario,
                    emenda, emenda_qtd, terceirizado, acabamento_lona, valor_lona,
                    quantidade_lona, outros_valores_lona, tipo_adesivo, valor_adesivo,
                    quantidade_adesivo, outros_valores_adesivo, ziper, cordinha_extra, alcinha, toalha_pronta
             FROM order_items 
             WHERE order_id = ANY($1::int[])
             ORDER BY order_id, id",
        )
        .bind(&order_ids as &[i32])
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Erro ao buscar itens dos pedidos pendentes: {}", e);
            "Erro ao buscar itens dos pedidos".to_string()
        })?
    } else {
        Vec::new()
    };

    // Combinar pedidos com seus itens
    let mut orders_with_items = Vec::new();
    for order in orders {
        let order_items: Vec<OrderItem> = items
            .iter()
            .filter(|item| item.order_id == order.id)
            .cloned()
            .collect();
        
        orders_with_items.push(build_order_with_items(order, order_items));
    }
    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;
    
    let result = PaginatedOrders {
        orders: orders_with_items,
        total: total_count,
        page: page as i64,
        page_size: page_size as i64,
        total_pages,
    };
    
    // Armazenar no cache por 30 segundos
    cache.set(cache_key, result.clone(), Duration::from_secs(30)).await;
    
    info!("Retornando {} pedidos pendentes (página {}/{})", result.orders.len(), page, total_pages);
    
    Ok(result)
}

#[tauri::command]
pub async fn get_ready_orders_paginated(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    page: Option<i32>,
    page_size: Option<i32>,
) -> Result<PaginatedOrders, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).min(100).max(1); // Limitar entre 1-100
    let offset = (page - 1) * page_size;
    
    // Chave do cache baseada nos parâmetros
    let cache_key = format!("ready_orders_paginated_{}_{}", page, page_size);
    
    // Tentar buscar do cache primeiro
    if let Some(cached_result) = cache.get::<PaginatedOrders>(&cache_key).await {
        info!("Retornando pedidos prontos do cache - página: {}, tamanho: {}", page, page_size);
        return Ok(cached_result);
    }
    
    info!("Buscando pedidos prontos paginados no banco - página: {}, tamanho: {}", page, page_size);

    // Primeiro, contar total de pedidos prontos
    let total_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT id) FROM orders WHERE pronto = true"
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao contar pedidos prontos: {}", e);
        "Erro ao contar pedidos".to_string()
    })?;

    // 1ª consulta - apenas pedidos prontos (otimizada com índices)
    let rows = sqlx::query(
        r#"
        SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
               data_entrada, data_entrega, total_value, valor_frete, status, prioridade,
               observacao, financeiro, conferencia, sublimacao, costura, expedicao,
               forma_envio, forma_pagamento_id, pronto, created_at, updated_at
        FROM orders
        WHERE pronto = true
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao buscar pedidos prontos paginados: {}", e);
        "Erro ao buscar pedidos prontos".to_string()
    })?;

    let mut orders = Vec::new();
    for row in rows {
        let order = Order {
            id: row.get("id"),
            numero: row.get("numero"),
            cliente: row.get("cliente"),
            cidade_cliente: row.get("cidade_cliente"),
            estado_cliente: row.get("estado_cliente"),
            telefone_cliente: row.get("telefone_cliente"),
            data_entrada: row.get("data_entrada"),
            data_entrega: row.get("data_entrega"),
            total_value: row.get("total_value"),
            valor_frete: row.get("valor_frete"),
            status: row.get("status"),
            prioridade: row.get("prioridade"),
            observacao: row.get("observacao"),
            financeiro: row.get("financeiro"),
            conferencia: row.get("conferencia"),
            sublimacao: row.get("sublimacao"),
            costura: row.get("costura"),
            expedicao: row.get("expedicao"),
            forma_envio: row.get("forma_envio"),
            forma_pagamento_id: row.get("forma_pagamento_id"),
            pronto: row.get("pronto"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };
        orders.push(order);
    }

    // 2ª consulta - itens dos pedidos retornados (otimizada com índice)
    let order_ids: Vec<i32> = orders.iter().map(|o| o.id).collect();
    let items: Vec<OrderItem> = if !order_ids.is_empty() {
        // Usar array PostgreSQL para melhor performance
        sqlx::query_as::<_, OrderItem>(
            "SELECT id, order_id, item_name, quantity, unit_price, subtotal, 
                    tipo_producao, descricao, largura, altura, metro_quadrado, 
                    vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
                    quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha, 
                    espaco_cordinha, valor_cordinha, observacao, imagem, quantidade_paineis, valor_unitario,
                    emenda, emenda_qtd, terceirizado, acabamento_lona, valor_lona,
                    quantidade_lona, outros_valores_lona, tipo_adesivo, valor_adesivo,
                    quantidade_adesivo, outros_valores_adesivo, ziper, cordinha_extra, alcinha, toalha_pronta
             FROM order_items 
             WHERE order_id = ANY($1::int[])
             ORDER BY order_id, id",
        )
        .bind(&order_ids as &[i32])
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Erro ao buscar itens dos pedidos prontos: {}", e);
            "Erro ao buscar itens dos pedidos".to_string()
        })?
    } else {
        Vec::new()
    };

    // Combinar pedidos com seus itens
    let mut orders_with_items = Vec::new();
    for order in orders {
        let order_items: Vec<OrderItem> = items
            .iter()
            .filter(|item| item.order_id == order.id)
            .cloned()
            .collect();
        
        orders_with_items.push(build_order_with_items(order, order_items));
    }
    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;
    
    let result = PaginatedOrders {
        orders: orders_with_items,
        total: total_count,
        page: page as i64,
        page_size: page_size as i64,
        total_pages,
    };
    
    // Armazenar no cache por 30 segundos
    cache.set(cache_key, result.clone(), Duration::from_secs(30)).await;
    
    info!("Retornando {} pedidos prontos (página {}/{})", result.orders.len(), page, total_pages);
    
    Ok(result)
}

#[tauri::command]
pub async fn get_pending_orders_light(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<Vec<OrderWithItems>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    info!("Buscando pedidos pendentes (otimizado)");

    // 1ª consulta - apenas pedidos pendentes (otimizada com índices)
    let rows = sqlx::query(
        r#"
        SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
               data_entrada, data_entrega, total_value, valor_frete, status, prioridade,
               observacao, financeiro, conferencia, sublimacao, costura, expedicao,
               forma_envio, forma_pagamento_id, pronto, created_at, updated_at
        FROM orders
        WHERE pronto IS NULL OR pronto = false
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao buscar pedidos pendentes: {}", e);
        "Erro ao buscar pedidos pendentes".to_string()
    })?;

    let mut orders = Vec::new();
    for row in rows {
        let order = Order {
            id: row.get("id"),
            numero: row.get("numero"),
            cliente: row.get("cliente"),
            cidade_cliente: row.get("cidade_cliente"),
            estado_cliente: row.get("estado_cliente"),
            telefone_cliente: row.get("telefone_cliente"),
            data_entrada: row.get("data_entrada"),
            data_entrega: row.get("data_entrega"),
            total_value: row.get("total_value"),
            valor_frete: row.get("valor_frete"),
            status: row.get("status"),
            prioridade: row.get("prioridade"),
            observacao: row.get("observacao"),
            financeiro: row.get("financeiro"),
            conferencia: row.get("conferencia"),
            sublimacao: row.get("sublimacao"),
            costura: row.get("costura"),
            expedicao: row.get("expedicao"),
            forma_envio: row.get("forma_envio"),
            forma_pagamento_id: row.get("forma_pagamento_id"),
            pronto: row.get("pronto"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };
        orders.push(order);
    }

    // 2ª consulta - itens dos pedidos retornados (otimizada com índice)
    let order_ids: Vec<i32> = orders.iter().map(|o| o.id).collect();
    let items: Vec<OrderItem> = if !order_ids.is_empty() {
        // Usar array PostgreSQL para melhor performance
        sqlx::query_as::<_, OrderItem>(
            "SELECT id, order_id, item_name, quantity, unit_price, subtotal, 
                    tipo_producao, descricao, largura, altura, metro_quadrado, 
                    vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
                    quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha, 
                    espaco_cordinha, valor_cordinha, observacao, imagem, quantidade_paineis, valor_unitario,
                    emenda, emenda_qtd, terceirizado, acabamento_lona, valor_lona,
                    quantidade_lona, outros_valores_lona, tipo_adesivo, valor_adesivo,
                    quantidade_adesivo, outros_valores_adesivo, ziper, cordinha_extra, alcinha, toalha_pronta
             FROM order_items 
             WHERE order_id = ANY($1::int[])
             ORDER BY order_id, id",
        )
        .bind(&order_ids as &[i32])
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Erro ao buscar itens dos pedidos pendentes: {}", e);
            "Erro ao buscar itens dos pedidos".to_string()
        })?
    } else {
        Vec::new()
    };

    // Combinar pedidos com seus itens
    let mut orders_with_items = Vec::new();
    for order in orders {
        let order_items: Vec<OrderItem> = items
            .iter()
            .filter(|item| item.order_id == order.id)
            .cloned()
            .collect();
        
        orders_with_items.push(build_order_with_items(order, order_items));
    }
    
    info!("Retornando {} pedidos pendentes (otimizado)", orders_with_items.len());
    Ok(orders_with_items)
}

#[tauri::command]
pub async fn get_orders(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
) -> Result<Vec<OrderWithItems>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    info!("Buscando todos os pedidos");

    let orders_result = sqlx::query_as::<_, Order>(
        "SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id, pronto, created_at, updated_at 
         FROM orders ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner())
    .await;

    match orders_result {
        Ok(orders) => {
            let mut orders_with_items = Vec::new();

            for order in orders {
                let items = get_order_items(&pool, order.id).await?;
                orders_with_items.push(build_order_with_items(order, items));
            }

            info!("Retornando {} pedidos", orders_with_items.len());
            Ok(orders_with_items)
        }
        Err(e) => {
            error!("Erro ao buscar pedidos: {}", e);
            Err("Erro ao buscar pedidos".to_string())
        }
    }
}

#[tauri::command]
pub async fn get_order_by_id(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    order_id: i32,
) -> Result<OrderWithItems, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    info!("Buscando pedido com ID: {}", order_id);

    let order_result = sqlx::query_as::<_, Order>(
        "SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id, pronto, created_at, updated_at 
         FROM orders WHERE id = $1"
    )
    .bind(order_id)
    .fetch_optional(pool.inner())
    .await;

    match order_result {
        Ok(Some(order)) => {
            let items = get_order_items(&pool, order.id).await?;
            Ok(build_order_with_items(order, items))
        }
        Ok(None) => Err("Pedido não encontrado".to_string()),
        Err(e) => {
            error!("Erro ao buscar pedido: {}", e);
            Err("Erro ao buscar pedido".to_string())
        }
    }
}

#[tauri::command]
pub async fn create_order(
    app_handle: AppHandle,
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    request: CreateOrderRequest,
) -> Result<OrderWithItems, String> {
    let _session_info = sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    let result = create_order_internal(pool.inner(), request).await;
    
    // Se o pedido foi criado com sucesso, emitir evento simples e invalidar cache de materiais
    if let Ok(ref order) = result {
        cache.invalidate_pattern("materiais_cache_").await;
        notify_order_created(&app_handle, order.id).await;
    }
    
    result
}

pub(crate) async fn create_order_internal(
    pool: &DbPool,
    request: CreateOrderRequest,
) -> Result<OrderWithItems, String> {
    info!("Criando novo pedido para cliente: {}", request.cliente);

    // Calcular totais (itens + frete)
    let items_total: f64 = request
        .items
        .iter()
        .map(|item| item.quantity as f64 * item.unit_price)
        .sum();
    let freight_total: f64 = request.valor_frete.unwrap_or(0.0);
    let total_value: f64 = items_total + freight_total;

    let mut tx = pool.begin().await.map_err(|e| {
        error!("Erro ao iniciar transação: {}", e);
        "Erro ao criar pedido".to_string()
    })?;

    // Converter data_entrega de string para NaiveDate se fornecida
    let data_entrega_parsed = request
        .data_entrega
        .as_ref()
        .and_then(|date_str| chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok());

    // Gerar número sequencial do pedido diretamente do banco
    let numero_pedido: String =
        match sqlx::query_scalar("SELECT LPAD(nextval('order_number_seq')::text, 10, '0')")
            .fetch_one(&mut *tx)
            .await
        {
            Ok(numero) => numero,
            Err(e) => {
                error!("Erro ao gerar número sequencial do pedido: {}", e);
                tx.rollback().await.ok();
                return Err("Erro ao criar pedido".to_string());
            }
        };

    // Converter data_entrada de string para NaiveDate (obrigatório)
    let data_entrada_parsed = chrono::NaiveDate::parse_from_str(&request.data_entrada, "%Y-%m-%d")
        .map_err(|e| {
            error!(
                "Erro ao parsear data_entrada '{}': {}",
                request.data_entrada, e
            );
            "Data de entrada inválida".to_string()
        })?;

    info!("Data entrada recebida: {}", request.data_entrada);
    info!("Data entrada parseada: {:?}", data_entrada_parsed);

    // Inserir pedido
    let order_result = sqlx::query_as::<_, Order>(
        "INSERT INTO orders (
             numero, customer_name, cliente, address, cidade_cliente, estado_cliente,
             total_value, valor_frete, status, data_entrada, data_entrega,
             forma_envio, forma_pagamento_id, prioridade, observacao, telefone_cliente, pronto
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
                   data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao,
                   financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id, pronto, created_at, updated_at"
    )
    .bind(&numero_pedido)
    .bind(&request.cliente) // customer_name
    .bind(&request.cliente) // cliente
    .bind(&request.cidade_cliente) // address
    .bind(&request.cidade_cliente)
    .bind(&request.estado_cliente)
    .bind(Decimal::from_f64_retain(total_value).unwrap_or_default())
    .bind(Decimal::from_f64_retain(freight_total).unwrap_or_default())
    .bind(&request.status)
    .bind(data_entrada_parsed)
    .bind(data_entrega_parsed)
    .bind(&request.forma_envio)
    .bind(&request.forma_pagamento_id)
    .bind(&request.prioridade)
    .bind(&request.observacao)
    .bind(&request.telefone_cliente)
    .bind(false)
    .fetch_one(&mut *tx)
    .await;

    let order = match order_result {
        Ok(order) => {
            info!(
                "Pedido criado com sucesso - ID: {}, Data entrada: {:?}, Data entrega: {:?}",
                order.id, order.data_entrada, order.data_entrega
            );
            order
        }
        Err(e) => {
            error!("Erro ao inserir pedido: {}", e);
            tx.rollback().await.ok();
            return Err("Erro ao criar pedido".to_string());
        }
    };

    // Inserir itens
    let mut items = Vec::new();
    for item_req in request.items {
        let subtotal = item_req.quantity as f64 * item_req.unit_price;

        let item_result = sqlx::query_as::<_, OrderItem>(
            "INSERT INTO order_items (order_id, item_name, quantity, unit_price, subtotal,
                                      tipo_producao, descricao, largura, altura, metro_quadrado,
                                      vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
                                      quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha,
                                      espaco_cordinha, valor_cordinha, observacao, imagem, quantidade_paineis, valor_unitario, emenda, emenda_qtd,
                                      terceirizado, acabamento_lona, valor_lona, quantidade_lona, outros_valores_lona,
                                      tipo_adesivo, valor_adesivo, quantidade_adesivo, outros_valores_adesivo,
                                      ziper, cordinha_extra, alcinha, toalha_pronta)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41)
             RETURNING id, order_id, item_name, quantity, unit_price, subtotal,
                       tipo_producao, descricao, largura, altura, metro_quadrado,
                       vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
                       quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha,
                       espaco_cordinha, valor_cordinha, observacao, imagem, quantidade_paineis, valor_unitario, emenda, emenda_qtd,
                       terceirizado, acabamento_lona, valor_lona, quantidade_lona, outros_valores_lona,
                       tipo_adesivo, valor_adesivo, quantidade_adesivo, outros_valores_adesivo,
                       ziper, cordinha_extra, alcinha, toalha_pronta",
        )
        .bind(order.id)
        .bind(&item_req.item_name)
        .bind(item_req.quantity)
        .bind(Decimal::from_f64_retain(item_req.unit_price).unwrap_or_default())
        .bind(Decimal::from_f64_retain(subtotal).unwrap_or_default())
        .bind(&item_req.tipo_producao)
        .bind(&item_req.descricao)
        .bind(&item_req.largura)
        .bind(&item_req.altura)
        .bind(&item_req.metro_quadrado)
        .bind(&item_req.vendedor)
        .bind(&item_req.designer)
        .bind(&item_req.tecido)
        .bind(&item_req.overloque)
        .bind(&item_req.elastico)
        .bind(&item_req.tipo_acabamento)
        .bind(&item_req.quantidade_ilhos)
        .bind(&item_req.espaco_ilhos)
        .bind(&item_req.valor_ilhos)
        .bind(&item_req.quantidade_cordinha)
        .bind(&item_req.espaco_cordinha)
        .bind(&item_req.valor_cordinha)
        .bind(&item_req.observacao)
        .bind(&item_req.imagem)
        .bind(&item_req.quantidade_paineis)
        .bind(&item_req.valor_unitario)
        .bind(&item_req.emenda)
        .bind(&item_req.emenda_qtd)
        .bind(&item_req.terceirizado)
        .bind(&item_req.acabamento_lona)
        .bind(&item_req.valor_lona)
        .bind(&item_req.quantidade_lona)
        .bind(&item_req.outros_valores_lona)
        .bind(&item_req.tipo_adesivo)
        .bind(&item_req.valor_adesivo)
        .bind(&item_req.quantidade_adesivo)
        .bind(&item_req.outros_valores_adesivo)
        .bind(&item_req.ziper)
        .bind(&item_req.cordinha_extra)
        .bind(&item_req.alcinha)
        .bind(&item_req.toalha_pronta)
        .fetch_one(&mut *tx)
        .await;

        match item_result {
            Ok(item) => items.push(item),
            Err(e) => {
                error!("Erro ao inserir item do pedido: {}", e);
                tx.rollback().await.ok();
                return Err("Erro ao criar itens do pedido".to_string());
            }
        }
    }

    tx.commit().await.map_err(|e| {
        error!("Erro ao confirmar transação: {}", e);
        "Erro ao criar pedido".to_string()
    })?;

    info!("Pedido criado com sucesso. ID: {}", order.id);

    Ok(build_order_with_items(order, items))
}

#[tauri::command]
pub async fn update_order_metadata(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    request: UpdateOrderMetadataRequest,
) -> Result<OrderWithItems, String> {
    let _session_info = sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    info!(
        "Atualizando metadados do pedido ID: {} por usuário {}",
        request.id, _session_info.username
    );

    let mut tx = pool.inner().begin().await.map_err(|e| {
        error!("Erro ao iniciar transação: {}", e);
        "Erro ao atualizar pedido".to_string()
    })?;

    let existing = sqlx::query_as::<_, Order>(
        "SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
                data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao,
                financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id,
                pronto, created_at, updated_at
         FROM orders WHERE id = $1",
    )
    .bind(request.id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        error!("Erro ao buscar pedido {} para atualização: {}", request.id, e);
        "Erro ao atualizar pedido".to_string()
    })?;

    let Some(existing_order) = existing else {
        tx.rollback().await.ok();
        return Err("Pedido não encontrado.".to_string());
    };

    let mut changes: Map<String, Value> = Map::new();
    let mut builder = QueryBuilder::new("UPDATE orders SET ");
    let mut separated = builder.separated(", ");
    let mut has_updates = false;

    if let Some(cliente) = &request.cliente {
        if cliente.trim() != existing_order.cliente.as_deref().unwrap_or("") {
            has_updates = true;
            separated.push("cliente = ");
            separated.push_bind(cliente);
            changes.insert(
                "cliente".into(),
                json!({
                    "before": existing_order.cliente.as_deref().unwrap_or(""),
                    "after": cliente
                }),
            );
        }
    }

    if let Some(cidade) = &request.cidade_cliente {
        if existing_order.cidade_cliente.as_ref().map(|s| s.as_str()) != Some(cidade.as_str()) {
            has_updates = true;
            separated.push("cidade_cliente = ");
            separated.push_bind(cidade);
            changes.insert(
                "cidade_cliente".into(),
                json!({
                    "before": existing_order.cidade_cliente,
                    "after": cidade
                }),
            );
        }
    }

    if let Some(estado) = &request.estado_cliente {
        if existing_order.estado_cliente.as_ref().map(|s| s.as_str()) != Some(estado.as_str()) {
            has_updates = true;
            separated.push("estado_cliente = ");
            separated.push_bind(estado);
            changes.insert(
                "estado_cliente".into(),
                json!({
                    "before": existing_order.estado_cliente,
                    "after": estado
                }),
            );
        }
    }

    if let Some(telefone) = &request.telefone_cliente {
        if existing_order.telefone_cliente.as_ref().map(|s| s.as_str()) != Some(telefone.as_str()) {
            has_updates = true;
            separated.push("telefone_cliente = ");
            separated.push_bind(telefone);
            changes.insert(
                "telefone_cliente".into(),
                json!({
                    "before": existing_order.telefone_cliente,
                    "after": telefone
                }),
            );
        }
    }

    if let Some(data_entrega_str) = &request.data_entrega {
        let trimmed = data_entrega_str.trim();
        let parsed_date = if trimmed.is_empty() {
            None
        } else {
            match chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
                .or_else(|_| chrono::NaiveDate::parse_from_str(trimmed, "%d/%m/%Y"))
            {
                Ok(date) => Some(date),
                Err(_) => {
                    tx.rollback().await.ok();
                    return Err("Data de entrega inválida. Use o formato YYYY-MM-DD.".to_string());
                }
            }
        };

        if existing_order.data_entrega != parsed_date {
            has_updates = true;
            separated.push("data_entrega = ");
            separated.push_bind(parsed_date);
            changes.insert(
                "data_entrega".into(),
                json!({
                    "before": existing_order.data_entrega.map(|d| d.to_string()),
                    "after": parsed_date.map(|d| d.to_string())
                }),
            );
        }
    }

    if let Some(prioridade) = &request.prioridade {
        if existing_order.prioridade.as_ref().map(|s| s.as_str()) != Some(prioridade.as_str()) {
            has_updates = true;
            separated.push("prioridade = ");
            separated.push_bind(prioridade);
            changes.insert(
                "prioridade".into(),
                json!({
                    "before": existing_order.prioridade,
                    "after": prioridade
                }),
            );
        }
    }

    if let Some(forma_envio) = &request.forma_envio {
        if existing_order.forma_envio.as_ref().map(|s| s.as_str()) != Some(forma_envio.as_str()) {
            has_updates = true;
            separated.push("forma_envio = ");
            separated.push_bind(forma_envio);
            changes.insert(
                "forma_envio".into(),
                json!({
                    "before": existing_order.forma_envio,
                    "after": forma_envio
                }),
            );
        }
    }

    if let Some(forma_pagamento_id) = request.forma_pagamento_id {
        if existing_order.forma_pagamento_id != Some(forma_pagamento_id) {
            has_updates = true;
            separated.push("forma_pagamento_id = ");
            separated.push_bind(forma_pagamento_id);
            changes.insert(
                "forma_pagamento_id".into(),
                json!({
                    "before": existing_order.forma_pagamento_id,
                    "after": forma_pagamento_id
                }),
            );
        }
    }

    if let Some(observacao) = &request.observacao {
        if existing_order.observacao.as_ref().map(|s| s.as_str()) != Some(observacao.as_str()) {
            has_updates = true;
            separated.push("observacao = ");
            separated.push_bind(observacao);
            changes.insert(
                "observacao".into(),
                json!({
                    "before": existing_order.observacao,
                    "after": observacao
                }),
            );
        }
    }

    if let Some(valor_frete) = request.valor_frete {
        let existing_frete = existing_order.valor_frete.as_ref().and_then(|v| v.to_f64());
        if existing_frete.map(|v| (v - valor_frete).abs() < f64::EPSILON) != Some(true) {
            has_updates = true;
            separated.push("valor_frete = ");
            separated.push_bind(Decimal::from_f64_retain(valor_frete).unwrap_or_default());
            changes.insert(
                "valor_frete".into(),
                json!({
                    "before": existing_frete,
                    "after": valor_frete
                }),
            );
        }
    }

    if let Some(status) = &request.status {
        if &existing_order.status != status {
            has_updates = true;
            separated.push("status = ");
            separated.push_bind(status);
            changes.insert(
                "status".into(),
                json!({
                    "before": existing_order.status,
                    "after": status
                }),
            );
        }
    }

    if !has_updates {
        tx.rollback().await.ok();
        return Err("Nenhuma alteração foi detectada para este pedido.".to_string());
    }

    separated.push("updated_at = CURRENT_TIMESTAMP");

    builder.push(" WHERE id = ");
    builder.push_bind(request.id);
    builder.push(
        " RETURNING id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
                   data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao,
                   financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id,
                   pronto, created_at, updated_at",
    );

    let updated_order = builder
        .build_query_as::<Order>()
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            error!("Erro ao atualizar pedido {}: {}", request.id, e);
            "Erro ao atualizar pedido".to_string()
        })?;

    let changes_json = Value::Object(changes);

    sqlx::query(
        "INSERT INTO order_audit_log (order_id, changed_by, changed_by_name, changes) VALUES ($1, $2, $3, $4)",
    )
    .bind(request.id)
    .bind(_session_info.user_id)
    .bind(&_session_info.username)
    .bind(&changes_json)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        error!(
            "Erro ao registrar histórico de pedido {}: {}",
            request.id, e
        );
        "Erro ao salvar histórico de alterações".to_string()
    })?;

    tx.commit().await.map_err(|e| {
        error!(
            "Erro ao confirmar atualização do pedido {}: {}",
            request.id, e
        );
        "Erro ao atualizar pedido".to_string()
    })?;

    let items = get_order_items(pool.inner(), request.id).await?;
    Ok(build_order_with_items(updated_order, items))
}

#[tauri::command]
pub async fn get_order_audit_log(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    order_id: i32,
) -> Result<Vec<OrderAuditLogEntry>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;

    let history = sqlx::query_as::<_, OrderAuditLogEntry>(
        "SELECT id, order_id, changed_by, changed_by_name, changes, created_at
         FROM order_audit_log
         WHERE order_id = $1
         ORDER BY created_at DESC, id DESC",
    )
    .bind(order_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!(
            "Erro ao buscar histórico de alterações para pedido {}: {}",
            order_id, e
        );
        "Erro ao buscar histórico do pedido".to_string()
    })?;

    Ok(history)
}

#[tauri::command]
pub async fn update_order(
    app_handle: AppHandle,
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    request: UpdateOrderRequest,
) -> Result<OrderWithItems, String> {
    let _session_info = sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    // Invalida cache de materiais
    cache.invalidate_pattern("materiais_cache_").await;
    info!("Atualizando pedido ID: {}", request.id);

    // Calcular novo total (itens + frete)
    let items_total: f64 = request
        .items
        .iter()
        .map(|item| item.quantity as f64 * item.unit_price)
        .sum();

    let mut tx = pool.inner().begin().await.map_err(|e| {
        error!("Erro ao iniciar transação: {}", e);
        "Erro ao atualizar pedido".to_string()
    })?;

    let freight_total: f64 = if let Some(value) = request.valor_frete {
        value
    } else {
        sqlx::query_scalar::<_, Option<Decimal>>("SELECT valor_frete FROM orders WHERE id = $1")
            .bind(request.id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| {
                error!("Erro ao buscar valor_frete atual: {}", e);
                "Erro ao atualizar pedido".to_string()
            })?
            .and_then(|dec| dec.to_f64())
            .unwrap_or(0.0)
    };

    let total_value: f64 = items_total + freight_total;

    // Atualizar pedido
    let order_result = sqlx::query_as::<_, Order>(
        "UPDATE orders SET cliente = $1, cidade_cliente = $2, total_value = $3, valor_frete = $4, status = $5 
         WHERE id = $6 
         RETURNING id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
                   data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao,
                   financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id, pronto, created_at, updated_at"
    )
    .bind(&request.cliente)
    .bind(&request.cidade_cliente)
    .bind(Decimal::from_f64_retain(total_value).unwrap_or_default())
    .bind(Decimal::from_f64_retain(freight_total).unwrap_or_default())
    .bind(&request.status)
    .bind(request.id)
    .fetch_one(&mut *tx)
    .await;

    let order = match order_result {
        Ok(order) => order,
        Err(e) => {
            error!("Erro ao atualizar pedido: {}", e);
            tx.rollback().await.ok();
            return Err("Erro ao atualizar pedido".to_string());
        }
    };

    // Deletar itens antigos
    sqlx::query("DELETE FROM order_items WHERE order_id = $1")
        .bind(request.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!("Erro ao deletar itens antigos: {}", e);
            "Erro ao atualizar itens do pedido".to_string()
        })?;

    // Inserir novos itens
    let mut items = Vec::new();
    for item_req in request.items {
        let subtotal = item_req.quantity as f64 * item_req.unit_price;

        let item_result = sqlx::query_as::<_, OrderItem>(
            "INSERT INTO order_items (order_id, item_name, quantity, unit_price, subtotal,
                                      tipo_producao, descricao, largura, altura, metro_quadrado,
                                      vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
                                      quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha,
                                      espaco_cordinha, valor_cordinha, observacao, imagem, quantidade_paineis, valor_unitario, emenda, emenda_qtd,
                                      terceirizado, acabamento_lona, valor_lona, quantidade_lona, outros_valores_lona,
                                      tipo_adesivo, valor_adesivo, quantidade_adesivo, outros_valores_adesivo,
                                      ziper, cordinha_extra, alcinha, toalha_pronta)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41)
             RETURNING id, order_id, item_name, quantity, unit_price, subtotal,
                       tipo_producao, descricao, largura, altura, metro_quadrado,
                       vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
                       quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha,
                       espaco_cordinha, valor_cordinha, observacao, imagem, quantidade_paineis, valor_unitario, emenda, emenda_qtd,
                       terceirizado, acabamento_lona, valor_lona, quantidade_lona, outros_valores_lona,
                       tipo_adesivo, valor_adesivo, quantidade_adesivo, outros_valores_adesivo,
                       ziper, cordinha_extra, alcinha, toalha_pronta",
        )
        .bind(order.id)
        .bind(&item_req.item_name)
        .bind(item_req.quantity)
        .bind(Decimal::from_f64_retain(item_req.unit_price).unwrap_or_default())
        .bind(Decimal::from_f64_retain(subtotal).unwrap_or_default())
        .bind(&item_req.tipo_producao)
        .bind(&item_req.descricao)
        .bind(&item_req.largura)
        .bind(&item_req.altura)
        .bind(&item_req.metro_quadrado)
        .bind(&item_req.vendedor)
        .bind(&item_req.designer)
        .bind(&item_req.tecido)
        .bind(&item_req.overloque)
        .bind(&item_req.elastico)
        .bind(&item_req.tipo_acabamento)
        .bind(&item_req.quantidade_ilhos)
        .bind(&item_req.espaco_ilhos)
        .bind(&item_req.valor_ilhos)
        .bind(&item_req.quantidade_cordinha)
        .bind(&item_req.espaco_cordinha)
        .bind(&item_req.valor_cordinha)
        .bind(&item_req.observacao)
        .bind(&item_req.imagem)
        .bind(&item_req.quantidade_paineis)
        .bind(&item_req.valor_unitario)
        .bind(&item_req.emenda)
        .bind(&item_req.emenda_qtd)
        .bind(&item_req.terceirizado)
        .bind(&item_req.acabamento_lona)
        .bind(&item_req.valor_lona)
        .bind(&item_req.quantidade_lona)
        .bind(&item_req.outros_valores_lona)
        .bind(&item_req.tipo_adesivo)
        .bind(&item_req.valor_adesivo)
        .bind(&item_req.quantidade_adesivo)
        .bind(&item_req.outros_valores_adesivo)
        .bind(&item_req.ziper)
        .bind(&item_req.cordinha_extra)
        .bind(&item_req.alcinha)
        .bind(&item_req.toalha_pronta)
        .fetch_one(&mut *tx)
        .await;

        match item_result {
            Ok(item) => items.push(item),
            Err(e) => {
                error!("Erro ao inserir novo item: {}", e);
                tx.rollback().await.ok();
                return Err("Erro ao atualizar itens do pedido".to_string());
            }
        }
    }

    tx.commit().await.map_err(|e| {
        error!("Erro ao confirmar transação: {}", e);
        "Erro ao atualizar pedido".to_string()
    })?;

    info!("Pedido atualizado com sucesso. ID: {}", order.id);

    let result = build_order_with_items(order, items);
    
    // Notificar sobre atualização de pedido
    notify_order_updated(&app_handle, result.id).await;

    Ok(result)
}

#[tauri::command]
pub async fn update_order_status_flags(
    app_handle: AppHandle,
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    request: UpdateOrderStatusRequest,
) -> Result<OrderWithItems, String> {
    let session_info = sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    // Verificar se o payload contém o campo financeiro e se o usuário não é admin
    if request.financeiro.is_some() && !session_info.is_admin {
        return Err("Somente administradores podem alterar o status financeiro.".to_string());
    }
    
    let result = update_order_status_flags_internal(pool.inner(), request.clone()).await;
    
    // Invalidar cache de pedidos pendentes e prontos quando status for atualizado
    if result.is_ok() {
        cache.invalidate_pattern("pending_orders").await;
        cache.invalidate_pattern("ready_orders").await;
        info!("Cache de pedidos pendentes e prontos invalidado após atualização de status");
        
        // Notificar sobre mudança de status
        if let Ok(ref order) = result {
            let status_details = format!(
                "Status atualizado: Costura={}, Expedição={}, Pronto={}",
                order.costura.unwrap_or(false),
                order.expedicao.unwrap_or(false),
                order.pronto.unwrap_or(false)
            );
            
            notify_order_status_changed(&app_handle, order.id, status_details).await;
        }
    }
    
    result
}

pub(crate) async fn update_order_status_flags_internal(
    pool: &DbPool,
    request: UpdateOrderStatusRequest,
) -> Result<OrderWithItems, String> {
    info!(
        "Atualizando status de produção do pedido ID: {}",
        request.id
    );

    let mut tx = pool.begin().await.map_err(|e| {
        error!("Erro ao iniciar transação: {}", e);
        "Erro ao atualizar status do pedido".to_string()
    })?;

    let existing_order = sqlx::query_as::<_, Order>(
        "SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id, pronto, created_at, updated_at 
         FROM orders WHERE id = $1"
    )
    .bind(request.id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        error!("Erro ao buscar pedido para atualização de status: {}", e);
        "Erro ao buscar pedido".to_string()
    })?;

    let existing_order = match existing_order {
        Some(order) => order,
        None => {
            tx.rollback().await.ok();
            return Err("Pedido não encontrado".to_string());
        }
    };

    let (financeiro, conferencia, sublimacao, costura, expedicao, pronto) =
        normalize_status_flags(&existing_order, &request);

    let updated_order = sqlx::query_as::<_, Order>(
        "UPDATE orders 
         SET financeiro = $1, conferencia = $2, sublimacao = $3, costura = $4, expedicao = $5, pronto = $6 
         WHERE id = $7 
         RETURNING id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
                   data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao,
                   financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id, pronto, created_at, updated_at"
    )
    .bind(financeiro)
    .bind(conferencia)
    .bind(sublimacao)
    .bind(costura)
    .bind(expedicao)
    .bind(pronto)
    .bind(request.id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        error!("Erro ao atualizar status do pedido: {}", e);
        "Erro ao atualizar status do pedido".to_string()
    })?;

    tx.commit().await.map_err(|e| {
        error!("Erro ao confirmar atualização de status: {}", e);
        "Erro ao atualizar status do pedido".to_string()
    })?;

    info!(
        "Status de produção atualizados para o pedido ID: {}",
        request.id
    );

    let items = get_order_items(pool, request.id).await?;

    Ok(build_order_with_items(updated_order, items))
}

#[tauri::command]
pub async fn delete_order(
    app_handle: AppHandle,
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    order_id: i32,
) -> Result<bool, String> {
    let _session_info = sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    // Invalida cache de materiais
    cache.invalidate_pattern("materiais_cache_").await;
    
    info!("Deletando pedido ID: {}", order_id);

    let result = sqlx::query("DELETE FROM orders WHERE id = $1")
        .bind(order_id)
        .execute(pool.inner())
        .await;

    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                info!("Pedido deletado com sucesso. ID: {}", order_id);
                
                // Notificar sobre exclusão de pedido
                notify_order_deleted(&app_handle, order_id).await;
                
                Ok(true)
            } else {
                Err("Pedido não encontrado".to_string())
            }
        }
        Err(e) => {
            error!("Erro ao deletar pedido: {}", e);
            Err("Erro ao deletar pedido".to_string())
        }
    }
}

#[tauri::command]
pub async fn get_orders_with_filters(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    filters: OrderFilters,
) -> Result<PaginatedOrders, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    info!("Buscando pedidos com filtros");

    let page = filters.page.unwrap_or(1);
    let page_size = filters.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut query = String::from(
        "SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id, pronto, created_at, updated_at 
         FROM orders WHERE 1=1"
    );

    let mut count_query = String::from("SELECT COUNT(*) FROM orders WHERE 1=1");
    let mut param_count = 0;

    if filters.status.is_some() {
        param_count += 1;
        query.push_str(&format!(" AND status = ${}", param_count));
        count_query.push_str(&format!(" AND status = ${}", param_count));
    }

    if filters.cliente.is_some() {
        param_count += 1;
        query.push_str(&format!(" AND cliente ILIKE ${}", param_count));
        count_query.push_str(&format!(" AND cliente ILIKE ${}", param_count));
    }

    if filters.date_from.is_some() {
        param_count += 1;
        query.push_str(&format!(" AND data_entrega >= ${}", param_count));
        count_query.push_str(&format!(" AND data_entrega >= ${}", param_count));
    }

    if filters.date_to.is_some() {
        param_count += 1;
        query.push_str(&format!(" AND data_entrega <= ${}", param_count));
        count_query.push_str(&format!(" AND data_entrega <= ${}", param_count));
    }

    query.push_str(" ORDER BY created_at DESC LIMIT $");
    param_count += 1;
    query.push_str(&param_count.to_string());
    query.push_str(&format!(" OFFSET ${}", param_count + 1));

    let mut orders_query = sqlx::query_as::<_, Order>(&query);
    let mut count_query_builder = sqlx::query(&count_query);

    // Mover search_pattern para fora do escopo para evitar lifetime issues
    let search_pattern = filters
        .cliente
        .as_ref()
        .map(|customer| format!("%{}%", customer));

    // Parsear datas se fornecidas
    let date_from_parsed = filters.date_from.as_ref().and_then(|date_str| {
        chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok()
    });
    
    let date_to_parsed = filters.date_to.as_ref().and_then(|date_str| {
        chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok()
    });

    if let Some(ref status) = filters.status {
        orders_query = orders_query.bind(status);
        count_query_builder = count_query_builder.bind(status);
    }

    if let Some(ref pattern) = search_pattern {
        orders_query = orders_query.bind(pattern);
        count_query_builder = count_query_builder.bind(pattern);
    }

    if let Some(ref date_from) = date_from_parsed {
        orders_query = orders_query.bind(date_from);
        count_query_builder = count_query_builder.bind(date_from);
    }

    if let Some(ref date_to) = date_to_parsed {
        orders_query = orders_query.bind(date_to);
        count_query_builder = count_query_builder.bind(date_to);
    }

    orders_query = orders_query.bind(page_size).bind(offset);

    let total: i64 = count_query_builder
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Erro ao contar pedidos: {}", e);
            "Erro ao buscar pedidos".to_string()
        })?
        .get(0);

    let orders = orders_query.fetch_all(pool.inner()).await.map_err(|e| {
        error!("Erro ao buscar pedidos filtrados: {}", e);
        "Erro ao buscar pedidos".to_string()
    })?;

    let mut orders_with_items = Vec::new();
    for order in orders {
        let items = get_order_items(&pool, order.id).await?;
        orders_with_items.push(build_order_with_items(order, items));
    }

    let total_pages = (total as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedOrders {
        orders: orders_with_items,
        total,
        page,
        page_size,
        total_pages,
    })
}

fn build_order_with_items(order: Order, items: Vec<OrderItem>) -> OrderWithItems {
    OrderWithItems {
        id: order.id,
        numero: order.numero,
        cliente: order.cliente,
        cidade_cliente: order.cidade_cliente,
        estado_cliente: order.estado_cliente,
        telefone_cliente: order.telefone_cliente,
        data_entrada: order.data_entrada,
        data_entrega: order.data_entrega,
        total_value: order.total_value,
        valor_frete: order.valor_frete,
        created_at: order.created_at,
        updated_at: order.updated_at,
        status: order.status,
        prioridade: order.prioridade,
        observacao: order.observacao,
        financeiro: order.financeiro,
        conferencia: order.conferencia,
        sublimacao: order.sublimacao,
        costura: order.costura,
        expedicao: order.expedicao,
        forma_envio: order.forma_envio,
        forma_pagamento_id: order.forma_pagamento_id,
        pronto: order.pronto,
        items,
    }
}

fn normalize_status_flags(
    existing_order: &Order,
    request: &UpdateOrderStatusRequest,
) -> (bool, bool, bool, bool, bool, bool) {
    let financeiro = request
        .financeiro
        .unwrap_or(existing_order.financeiro.unwrap_or(false));
    let mut conferencia = request
        .conferencia
        .unwrap_or(existing_order.conferencia.unwrap_or(false));
    let mut sublimacao = request
        .sublimacao
        .unwrap_or(existing_order.sublimacao.unwrap_or(false));
    let mut costura = request
        .costura
        .unwrap_or(existing_order.costura.unwrap_or(false));
    let mut expedicao = request
        .expedicao
        .unwrap_or(existing_order.expedicao.unwrap_or(false));

    if !financeiro {
        conferencia = false;
        sublimacao = false;
        costura = false;
        expedicao = false;
    }

    let pronto = financeiro && conferencia && sublimacao && costura && expedicao;

    (
        financeiro,
        conferencia,
        sublimacao,
        costura,
        expedicao,
        pronto,
    )
}

// Função auxiliar para buscar itens de um pedido
async fn get_order_items(pool: &DbPool, order_id: i32) -> Result<Vec<OrderItem>, String> {
    sqlx::query_as::<_, OrderItem>(
        "SELECT id, order_id, item_name, quantity, unit_price, subtotal, 
                tipo_producao, descricao, largura, altura, metro_quadrado, 
                vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
                quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha, 
                espaco_cordinha, valor_cordinha, observacao, imagem, quantidade_paineis, valor_unitario,
                emenda, emenda_qtd, terceirizado, acabamento_lona, valor_lona,
                quantidade_lona, outros_valores_lona, tipo_adesivo, valor_adesivo,
                quantidade_adesivo, outros_valores_adesivo, ziper, cordinha_extra, alcinha, toalha_pronta
         FROM order_items WHERE order_id = $1 ORDER BY id",
    )
    .bind(order_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        error!("Erro ao buscar itens do pedido {}: {}", order_id, e);
        "Erro ao buscar itens do pedido".to_string()
    })
}

#[tauri::command]
pub async fn get_orders_by_delivery_date(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    start_date: String,
    end_date: Option<String>,
) -> Result<Vec<OrderWithItems>, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    info!(
        "Buscando pedidos para intervalo de entrega: início {}, fim {:?}",
        start_date, end_date
    );

    let start_trimmed = start_date.trim();
    if start_trimmed.is_empty() {
        return Err("Data inicial é obrigatória".to_string());
    }

    let parsed_start = chrono::NaiveDate::parse_from_str(start_trimmed, "%Y-%m-%d")
        .map_err(|_| "Data inicial inválida. Use o formato YYYY-MM-DD".to_string())?;

    let effective_end = end_date
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(start_trimmed);

    let parsed_end = chrono::NaiveDate::parse_from_str(effective_end, "%Y-%m-%d")
        .map_err(|_| "Data final inválida. Use o formato YYYY-MM-DD".to_string())?;

    if parsed_end < parsed_start {
        return Err("Data final não pode ser anterior à data inicial".to_string());
    }

    info!("Intervalo parseado: {} até {}", parsed_start, parsed_end);

    let orders_result = sqlx::query_as::<_, Order>(
        "SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_frete, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, forma_envio, forma_pagamento_id, pronto, created_at, updated_at 
         FROM orders 
         WHERE data_entrega IS NOT NULL 
           AND data_entrega BETWEEN $1 AND $2
         ORDER BY data_entrega, forma_envio, cliente"
    )
    .bind(parsed_start)
    .bind(parsed_end)
    .fetch_all(pool.inner())
    .await;

    match orders_result {
        Ok(orders) => {
            let mut orders_with_items = Vec::new();

            for order in orders {
                info!(
                    "Pedido encontrado - ID: {}, Data entrega: {}",
                    order.id,
                    order.data_entrega.unwrap_or_default()
                );
                let items = get_order_items(&pool, order.id).await?;
                orders_with_items.push(build_order_with_items(order, items));
            }

            info!(
                "Retornando {} pedidos para o intervalo {} - {}",
                orders_with_items.len(),
                parsed_start,
                parsed_end
            );
            Ok(orders_with_items)
        }
        Err(e) => {
            error!("Erro ao buscar pedidos por data de entrega: {}", e);
            Err("Erro ao buscar pedidos".to_string())
        }
    }
}

// ========================================
// COMANDO PARA FICHA DE SERVIÇO
// ========================================

// #[tauri::command]
// pub async fn test_event_emission(
//     app_handle: AppHandle,
//     event_type: String,
//     order_id: i32,
// ) -> Result<String, String> {
//     info!("🧪 Testando emissão de evento: {} para pedido {}", event_type, order_id);
//     
//     match event_type.as_str() {
//         "order_created" => {
//             app_handle
//                 .emit_all("order_created", order_id)
//                 .unwrap_or_else(|e| error!("Erro ao emitir evento order_created: {}", e));
//         }
//         "order_updated" => {
//             app_handle
//                 .emit_all("order_updated", order_id)
//                 .unwrap_or_else(|e| error!("Erro ao emitir evento order_updated: {}", e));
//         }
//         "order_deleted" => {
//             app_handle
//                 .emit_all("order_deleted", order_id)
//                 .unwrap_or_else(|e| error!("Erro ao emitir evento order_deleted: {}", e));
//         }
//         "order_status_updated" => {
//             app_handle
//                 .emit_all("order_status_updated", order_id)
//                 .unwrap_or_else(|e| error!("Erro ao emitir evento order_status_updated: {}", e));
//         }
//         _ => {
//             return Err(format!("Tipo de evento inválido: {}", event_type));
//         }
//     }
//     
//     Ok(format!("Evento {} emitido para pedido {}", event_type, order_id))
// }

#[tauri::command]
pub async fn get_order_ficha(
    pool: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
    session_token: String,
    order_id: i32,
) -> Result<OrderFicha, String> {
    sessions
        .require_authenticated(&session_token)
        .await
        .map_err(|e| e.to_string())?;
    
    info!("Buscando dados da ficha de serviço para pedido ID: {}", order_id);

    // Buscar dados do pedido
    let order_row = sqlx::query(
        r#"
        SELECT id, numero, cliente, telefone_cliente, cidade_cliente, estado_cliente,
               data_entrada, data_entrega, forma_envio, forma_pagamento_id, 
               valor_frete, total_value, observacao
        FROM orders 
        WHERE id = $1
        "#
    )
    .bind(order_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao buscar pedido {}: {}", order_id, e);
        "Pedido não encontrado".to_string()
    })?;

    // Buscar itens do pedido
    let items = sqlx::query_as::<_, OrderItemFicha>(
        r#"
        SELECT id, order_id, item_name, quantity, unit_price, subtotal,
               tipo_producao, descricao, largura, altura, metro_quadrado,
               vendedor, designer, tecido, overloque, elastico, tipo_acabamento,
               quantidade_ilhos, espaco_ilhos, valor_ilhos, quantidade_cordinha,
               espaco_cordinha, valor_cordinha, observacao, imagem, legenda_imagem,
               emenda, emenda_qtd, ziper, cordinha_extra, alcinha, toalha_pronta, 
               acabamento_lona, valor_lona, quantidade_lona, outros_valores_lona, 
               tipo_adesivo, valor_adesivo, quantidade_adesivo, outros_valores_adesivo,
               NULL::text as acabamento_totem, NULL::text as acabamento_totem_outro, 
               NULL::text as valor_totem, NULL::text as quantidade_totem, 
               NULL::text as outros_valores_totem
        FROM order_items 
        WHERE order_id = $1
        ORDER BY id
        "#
    )
    .bind(order_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Erro ao buscar itens do pedido {}: {}", order_id, e);
        "Erro ao buscar itens do pedido".to_string()
    })?;

    // Construir OrderFicha
    let order_ficha = OrderFicha {
        id: order_row.get("id"),
        numero: order_row.get("numero"),
        cliente: order_row.get("cliente"),
        telefone_cliente: order_row.get("telefone_cliente"),
        cidade_cliente: order_row.get("cidade_cliente"),
        estado_cliente: order_row.get("estado_cliente"),
        data_entrada: order_row.get("data_entrada"),
        data_entrega: order_row.get("data_entrega"),
        forma_envio: order_row.get("forma_envio"),
        forma_pagamento_id: order_row.get("forma_pagamento_id"),
        valor_frete: order_row.get("valor_frete"),
        total_value: order_row.get("total_value"),
        observacao: order_row.get("observacao"),
        items,
    };

    info!("Ficha de serviço carregada com sucesso para pedido {} - {} itens", 
          order_id, order_ficha.items.len());

    Ok(order_ficha)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{NaiveDate, NaiveDateTime};
    use rust_decimal::Decimal;
    use sqlx::{postgres::PgPoolOptions, PgPool};
    use std::sync::OnceLock;
    use tokio::sync::Mutex;

    static TEST_DB_MUTEX: OnceLock<Mutex<()>> = OnceLock::new();

    fn make_date() -> NaiveDate {
        NaiveDate::from_ymd_opt(2024, 1, 10).unwrap()
    }

    fn make_datetime() -> NaiveDateTime {
        make_date().and_hms_opt(12, 0, 0).unwrap()
    }

    fn make_order_with_flags(
        financeiro: bool,
        conferencia: bool,
        sublimacao: bool,
        costura: bool,
        expedicao: bool,
    ) -> Order {
        Order {
            id: 1,
            numero: Some("PED-0001".to_string()),
            cliente: Some("Cliente Teste".to_string()),
            cidade_cliente: Some("Cidade".to_string()),
            estado_cliente: Some("SP".to_string()),
            telefone_cliente: Some("999999999".to_string()),
            data_entrada: Some(make_date()),
            data_entrega: Some(make_date()),
            total_value: Decimal::new(1000, 2),
            valor_frete: Some(Decimal::new(500, 2)),
            created_at: Some(make_datetime().and_utc()),
            updated_at: Some(make_datetime().and_utc()),
            status: OrderStatus::Pendente,
            prioridade: Some("NORMAL".to_string()),
            observacao: Some("Observação".to_string()),
            financeiro: Some(financeiro),
            conferencia: Some(conferencia),
            sublimacao: Some(sublimacao),
            costura: Some(costura),
            expedicao: Some(expedicao),
            forma_envio: Some("Correios".to_string()),
            forma_pagamento_id: Some(1),
            pronto: Some(financeiro && conferencia && sublimacao && costura && expedicao),
        }
    }

    fn make_basic_order_item(order_id: i32) -> OrderItem {
        OrderItem {
            id: 10,
            order_id,
            item_name: "Item 1".to_string(),
            quantity: 2,
            unit_price: Decimal::new(2500, 2),
            subtotal: Decimal::new(5000, 2),
            tipo_producao: None,
            descricao: None,
            largura: None,
            altura: None,
            metro_quadrado: None,
            vendedor: None,
            designer: None,
            tecido: None,
            overloque: None,
            elastico: None,
            tipo_acabamento: None,
            quantidade_ilhos: None,
            espaco_ilhos: None,
            valor_ilhos: None,
            quantidade_cordinha: None,
            espaco_cordinha: None,
            valor_cordinha: None,
            observacao: None,
            imagem: None,
            quantidade_paineis: None,
            valor_unitario: None,
            emenda: None,
            emenda_qtd: None,
            terceirizado: None,
            acabamento_lona: None,
            valor_lona: None,
            quantidade_lona: None,
            outros_valores_lona: None,
            tipo_adesivo: None,
            valor_adesivo: None,
            quantidade_adesivo: None,
            outros_valores_adesivo: None,
            ziper: None,
            cordinha_extra: None,
            alcinha: None,
            toalha_pronta: None,
        }
    }

    fn make_create_order_item(
        name: &str,
        quantity: i32,
        unit_price: f64,
    ) -> CreateOrderItemRequest {
        CreateOrderItemRequest {
            item_name: name.to_string(),
            quantity,
            unit_price,
            tipo_producao: None,
            descricao: None,
            largura: None,
            altura: None,
            metro_quadrado: None,
            vendedor: None,
            designer: None,
            tecido: None,
            overloque: None,
            elastico: None,
            tipo_acabamento: None,
            quantidade_ilhos: None,
            espaco_ilhos: None,
            valor_ilhos: None,
            quantidade_cordinha: None,
            espaco_cordinha: None,
            valor_cordinha: None,
            observacao: None,
            imagem: None,
            quantidade_paineis: None,
            valor_unitario: None,
            emenda: None,
            emenda_qtd: None,
            terceirizado: None,
            acabamento_lona: None,
            valor_lona: None,
            quantidade_lona: None,
            outros_valores_lona: None,
            tipo_adesivo: None,
            valor_adesivo: None,
            quantidade_adesivo: None,
            outros_valores_adesivo: None,
            ziper: None,
            cordinha_extra: None,
            alcinha: None,
            toalha_pronta: None,
        }
    }

    fn make_create_order_request(
        cliente: &str,
        cidade: &str,
        items: Vec<CreateOrderItemRequest>,
    ) -> CreateOrderRequest {
        CreateOrderRequest {
            cliente: cliente.to_string(),
            cidade_cliente: cidade.to_string(),
            estado_cliente: Some("SP".to_string()),
            status: OrderStatus::Pendente,
            items,
            numero: None,
            data_entrada: "2024-01-10".to_string(),
            data_entrega: None,
            forma_envio: Some("Correios".to_string()),
            forma_pagamento_id: None,
            prioridade: Some("NORMAL".to_string()),
            observacao: None,
            telefone_cliente: Some("11999999999".to_string()),
            valor_frete: Some(0.0),
        }
    }

    #[test]
    fn normalize_status_flags_resets_downstream_when_financeiro_false() {
        let existing = make_order_with_flags(true, true, true, true, true);
        let request = UpdateOrderStatusRequest {
            id: existing.id,
            financeiro: Some(false),
            conferencia: None,
            sublimacao: None,
            costura: None,
            expedicao: None,
        };

        let (financeiro, conferencia, sublimacao, costura, expedicao, pronto) =
            normalize_status_flags(&existing, &request);

        assert!(!financeiro);
        assert!(!conferencia);
        assert!(!sublimacao);
        assert!(!costura);
        assert!(!expedicao);
        assert!(!pronto);
    }

    #[test]
    fn normalize_status_flags_preserves_true_values_when_financeiro_true() {
        let existing = make_order_with_flags(false, false, false, false, false);
        let request = UpdateOrderStatusRequest {
            id: existing.id,
            financeiro: Some(true),
            conferencia: Some(true),
            sublimacao: Some(true),
            costura: Some(true),
            expedicao: Some(true),
        };

        let (financeiro, conferencia, sublimacao, costura, expedicao, pronto) =
            normalize_status_flags(&existing, &request);

        assert!(financeiro);
        assert!(conferencia);
        assert!(sublimacao);
        assert!(costura);
        assert!(expedicao);
        assert!(pronto);
    }

    #[test]
    fn build_order_with_items_keeps_all_metadata() {
        let order = make_order_with_flags(true, false, false, true, false);
        let items = vec![make_basic_order_item(order.id)];

        let result = build_order_with_items(order.clone(), items.clone());

        assert_eq!(result.id, order.id);
        assert_eq!(result.numero, order.numero);
        assert_eq!(result.cliente, order.cliente);
        assert_eq!(result.cidade_cliente, order.cidade_cliente);
        assert_eq!(result.valor_frete, order.valor_frete);
        assert_eq!(result.financeiro, order.financeiro);
        assert_eq!(result.costura, order.costura);
        assert_eq!(result.items.len(), items.len());
        assert_eq!(result.items[0].item_name, items[0].item_name);
    }

    async fn setup_integration_db() -> Option<PgPool> {
        let url = std::env::var("TEST_DATABASE_URL")
            .or_else(|_| std::env::var("DATABASE_URL"))
            .map_err(|_| {
                eprintln!(
                    "Skipping integration test: defina TEST_DATABASE_URL ou DATABASE_URL apontando para um PostgreSQL de teste."
                );
            })
            .ok()?;

        let pool = match PgPoolOptions::new().max_connections(1).connect(&url).await {
            Ok(pool) => pool,
            Err(err) => {
                eprintln!("Skipping integration test: não foi possível conectar ao banco ({err}).");
                return None;
            }
        };

        if let Err(err) = crate::migrator::MIGRATOR.run(&pool).await {
            eprintln!("Skipping integration test: falha ao rodar migrações ({err}).");
            return None;
        }

        if let Err(err) = sqlx::query("TRUNCATE TABLE order_items, orders RESTART IDENTITY CASCADE")
            .execute(&pool)
            .await
        {
            eprintln!("Skipping integration test: falha ao limpar dados ({err}).");
            return None;
        }

        Some(pool)
    }

    async fn run_with_pool<F, Fut>(test: F)
    where
        F: FnOnce(PgPool) -> Fut,
        Fut: std::future::Future<Output = ()>,
    {
        let mutex = TEST_DB_MUTEX.get_or_init(|| Mutex::new(()));
        let _guard = mutex.lock().await;

        if let Some(pool) = setup_integration_db().await {
            test(pool).await;
        }
    }

    #[tokio::test]
    async fn create_order_persists_order_and_items() {
        run_with_pool(|pool| async move {
            let request = make_create_order_request(
                "Cliente Teste",
                "Rua A, 123",
                vec![
                    make_create_order_item("Produto 1", 2, 150.0),
                    make_create_order_item("Produto 2", 1, 200.0),
                ],
            );

            let created = super::create_order_internal(&pool, request)
                .await
                .expect("pedido criado");

            assert!(created.numero.is_some());
            assert_eq!(created.numero.as_ref().unwrap().len(), 10);

            let (order_count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM orders")
                .fetch_one(&pool)
                .await
                .expect("contagem de pedidos");
            assert_eq!(order_count, 1);

            let (item_count,): (i64,) =
                sqlx::query_as("SELECT COUNT(*) FROM order_items WHERE order_id = $1")
                    .bind(created.id)
                    .fetch_one(&pool)
                    .await
                    .expect("contagem de itens");
            assert_eq!(item_count, 2);
        })
        .await;
    }

    #[tokio::test]
    async fn update_order_status_flags_resets_dependents() {
        run_with_pool(|pool| async move {
            let request = make_create_order_request(
                "Cliente Teste",
                "Rua B, 456",
                vec![make_create_order_item("Produto", 1, 300.0)],
            );

            let created = super::create_order_internal(&pool, request)
                .await
                .expect("pedido criado");

            let updated = super::update_order_status_flags_internal(
                &pool,
                UpdateOrderStatusRequest {
                    id: created.id,
                    financeiro: Some(true),
                    conferencia: Some(true),
                    sublimacao: Some(true),
                    costura: Some(true),
                    expedicao: Some(true),
                },
            )
            .await
            .expect("status atualizado");

            assert!(updated.financeiro.unwrap());
            assert!(updated.conferencia.unwrap());
            assert!(updated.sublimacao.unwrap());
            assert!(updated.costura.unwrap());
            assert!(updated.expedicao.unwrap());

            let reset = super::update_order_status_flags_internal(
                &pool,
                UpdateOrderStatusRequest {
                    id: created.id,
                    financeiro: Some(false),
                    conferencia: None,
                    sublimacao: None,
                    costura: None,
                    expedicao: None,
                },
            )
            .await
            .expect("status resetado");

            assert!(!reset.financeiro.unwrap());
            assert!(!reset.conferencia.unwrap());
            assert!(!reset.sublimacao.unwrap());
            assert!(!reset.costura.unwrap());
            assert!(!reset.expedicao.unwrap());
        })
        .await;
    }
}
