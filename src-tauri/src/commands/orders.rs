use crate::db::DbPool;
use crate::models::*;
use rust_decimal::Decimal;
use sqlx::Row;
use tauri::State;
use tracing::{error, info};

#[tauri::command]
pub async fn get_orders(pool: State<'_, DbPool>) -> Result<Vec<OrderWithItems>, String> {
    info!("Buscando todos os pedidos");

    let orders_result = sqlx::query_as::<_, Order>(
        "SELECT id, customer_name, address, total_value, created_at, updated_at, status 
         FROM orders ORDER BY created_at DESC"
    )
    .fetch_all(pool.inner())
    .await;

    match orders_result {
        Ok(orders) => {
            let mut orders_with_items = Vec::new();

            for order in orders {
                let items = get_order_items(&pool, order.id).await?;
                orders_with_items.push(OrderWithItems {
                    id: order.id,
                    customer_name: order.customer_name,
                    address: order.address,
                    total_value: order.total_value,
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    status: order.status,
                    items,
                });
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
    order_id: i32,
) -> Result<OrderWithItems, String> {
    info!("Buscando pedido com ID: {}", order_id);

    let order_result = sqlx::query_as::<_, Order>(
        "SELECT id, customer_name, address, total_value, created_at, updated_at, status 
         FROM orders WHERE id = $1"
    )
    .bind(order_id)
    .fetch_optional(pool.inner())
    .await;

    match order_result {
        Ok(Some(order)) => {
            let items = get_order_items(&pool, order.id).await?;
            Ok(OrderWithItems {
                id: order.id,
                customer_name: order.customer_name,
                address: order.address,
                total_value: order.total_value,
                created_at: order.created_at,
                updated_at: order.updated_at,
                status: order.status,
                items,
            })
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
    pool: State<'_, DbPool>,
    request: CreateOrderRequest,
) -> Result<OrderWithItems, String> {
    info!("Criando novo pedido para cliente: {}", request.customer_name);

    // Calcular total
    let total_value: f64 = request
        .items
        .iter()
        .map(|item| item.quantity as f64 * item.unit_price)
        .sum();

    let mut tx = pool.inner().begin().await.map_err(|e| {
        error!("Erro ao iniciar transação: {}", e);
        "Erro ao criar pedido".to_string()
    })?;

    // Inserir pedido
    let order_result = sqlx::query_as::<_, Order>(
        "INSERT INTO orders (customer_name, address, total_value, status) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, customer_name, address, total_value, created_at, updated_at, status"
    )
    .bind(&request.customer_name)
    .bind(&request.address)
    .bind(Decimal::from_f64_retain(total_value).unwrap_or_default())
    .bind(&request.status)
    .fetch_one(&mut *tx)
    .await;

    let order = match order_result {
        Ok(order) => order,
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
            "INSERT INTO order_items (order_id, item_name, quantity, unit_price, subtotal) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, order_id, item_name, quantity, unit_price, subtotal"
        )
        .bind(order.id)
        .bind(&item_req.item_name)
        .bind(item_req.quantity)
        .bind(Decimal::from_f64_retain(item_req.unit_price).unwrap_or_default())
        .bind(Decimal::from_f64_retain(subtotal).unwrap_or_default())
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

    Ok(OrderWithItems {
        id: order.id,
        customer_name: order.customer_name,
        address: order.address,
        total_value: order.total_value,
        created_at: order.created_at,
        updated_at: order.updated_at,
        status: order.status,
        items,
    })
}

#[tauri::command]
pub async fn update_order(
    pool: State<'_, DbPool>,
    request: UpdateOrderRequest,
) -> Result<OrderWithItems, String> {
    info!("Atualizando pedido ID: {}", request.id);

    // Calcular novo total
    let total_value: f64 = request
        .items
        .iter()
        .map(|item| item.quantity as f64 * item.unit_price)
        .sum();

    let mut tx = pool.inner().begin().await.map_err(|e| {
        error!("Erro ao iniciar transação: {}", e);
        "Erro ao atualizar pedido".to_string()
    })?;

    // Atualizar pedido
    let order_result = sqlx::query_as::<_, Order>(
        "UPDATE orders SET customer_name = $1, address = $2, total_value = $3, status = $4 
         WHERE id = $5 
         RETURNING id, customer_name, address, total_value, created_at, updated_at, status"
    )
    .bind(&request.customer_name)
    .bind(&request.address)
    .bind(Decimal::from_f64_retain(total_value).unwrap_or_default())
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
            "INSERT INTO order_items (order_id, item_name, quantity, unit_price, subtotal) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, order_id, item_name, quantity, unit_price, subtotal"
        )
        .bind(order.id)
        .bind(&item_req.item_name)
        .bind(item_req.quantity)
        .bind(Decimal::from_f64_retain(item_req.unit_price).unwrap_or_default())
        .bind(Decimal::from_f64_retain(subtotal).unwrap_or_default())
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

    Ok(OrderWithItems {
        id: order.id,
        customer_name: order.customer_name,
        address: order.address,
        total_value: order.total_value,
        created_at: order.created_at,
        updated_at: order.updated_at,
        status: order.status,
        items,
    })
}

#[tauri::command]
pub async fn delete_order(pool: State<'_, DbPool>, order_id: i32) -> Result<bool, String> {
    info!("Deletando pedido ID: {}", order_id);

    let result = sqlx::query("DELETE FROM orders WHERE id = $1")
        .bind(order_id)
        .execute(pool.inner())
        .await;

    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                info!("Pedido deletado com sucesso. ID: {}", order_id);
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
    filters: OrderFilters,
) -> Result<PaginatedOrders, String> {
    info!("Buscando pedidos com filtros");

    let page = filters.page.unwrap_or(1);
    let page_size = filters.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut query = String::from(
        "SELECT id, customer_name, address, total_value, created_at, updated_at, status 
         FROM orders WHERE 1=1"
    );

    let mut count_query = String::from("SELECT COUNT(*) FROM orders WHERE 1=1");

    if filters.status.is_some() {
        query.push_str(" AND status = $1");
        count_query.push_str(" AND status = $1");
    }

    if filters.customer_name.is_some() {
        let param_num = if filters.status.is_some() { 2 } else { 1 };
        query.push_str(&format!(" AND customer_name ILIKE ${}", param_num));
        count_query.push_str(&format!(" AND customer_name ILIKE ${}", param_num));
    }

    query.push_str(" ORDER BY created_at DESC LIMIT $");
    let limit_param = if filters.status.is_some() && filters.customer_name.is_some() {
        3
    } else if filters.status.is_some() || filters.customer_name.is_some() {
        2
    } else {
        1
    };
    query.push_str(&limit_param.to_string());
    query.push_str(&format!(" OFFSET ${}", limit_param + 1));

    let mut orders_query = sqlx::query_as::<_, Order>(&query);
    let mut count_query_builder = sqlx::query(&count_query);

    // Mover search_pattern para fora do escopo para evitar lifetime issues
    let search_pattern = filters.customer_name.as_ref().map(|customer| format!("%{}%", customer));

    if let Some(ref status) = filters.status {
        orders_query = orders_query.bind(status);
        count_query_builder = count_query_builder.bind(status);
    }

    if let Some(ref pattern) = search_pattern {
        orders_query = orders_query.bind(pattern);
        count_query_builder = count_query_builder.bind(pattern);
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
        orders_with_items.push(OrderWithItems {
            id: order.id,
            customer_name: order.customer_name,
            address: order.address,
            total_value: order.total_value,
            created_at: order.created_at,
            updated_at: order.updated_at,
            status: order.status,
            items,
        });
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

// Função auxiliar para buscar itens de um pedido
async fn get_order_items(pool: &DbPool, order_id: i32) -> Result<Vec<OrderItem>, String> {
    sqlx::query_as::<_, OrderItem>(
        "SELECT id, order_id, item_name, quantity, unit_price, subtotal 
         FROM order_items WHERE order_id = $1 ORDER BY id"
    )
    .bind(order_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        error!("Erro ao buscar itens do pedido {}: {}", order_id, e);
        "Erro ao buscar itens do pedido".to_string()
    })
}

