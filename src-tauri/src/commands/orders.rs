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
        "SELECT id, numero, customer_name, cliente, address, cidade_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_total, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, created_at, updated_at 
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
    order_id: i32,
) -> Result<OrderWithItems, String> {
    info!("Buscando pedido com ID: {}", order_id);

    let order_result = sqlx::query_as::<_, Order>(
        "SELECT id, numero, customer_name, cliente, address, cidade_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_total, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, created_at, updated_at 
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
    pool: State<'_, DbPool>,
    request: CreateOrderRequest,
) -> Result<OrderWithItems, String> {
    create_order_internal(pool.inner(), request).await
}

pub(crate) async fn create_order_internal(
    pool: &DbPool,
    request: CreateOrderRequest,
) -> Result<OrderWithItems, String> {
    info!(
        "Criando novo pedido para cliente: {}",
        request.customer_name
    );

    // Calcular total
    let total_value: f64 = request
        .items
        .iter()
        .map(|item| item.quantity as f64 * item.unit_price)
        .sum();

    let mut tx = pool.begin().await.map_err(|e| {
        error!("Erro ao iniciar transação: {}", e);
        "Erro ao criar pedido".to_string()
    })?;

    // Inserir pedido
    let order_result = sqlx::query_as::<_, Order>(
        "INSERT INTO orders (customer_name, address, total_value, status) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, numero, customer_name, cliente, address, cidade_cliente, telefone_cliente,
                   data_entrada, data_entrega, total_value, valor_total, status, prioridade, observacao,
                   financeiro, conferencia, sublimacao, costura, expedicao, created_at, updated_at"
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
             RETURNING id, order_id, item_name, quantity, unit_price, subtotal",
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

    Ok(build_order_with_items(order, items))
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
         RETURNING id, numero, customer_name, cliente, address, cidade_cliente, telefone_cliente,
                   data_entrada, data_entrega, total_value, valor_total, status, prioridade, observacao,
                   financeiro, conferencia, sublimacao, costura, expedicao, created_at, updated_at"
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
             RETURNING id, order_id, item_name, quantity, unit_price, subtotal",
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

    Ok(build_order_with_items(order, items))
}

#[tauri::command]
pub async fn update_order_status_flags(
    pool: State<'_, DbPool>,
    request: UpdateOrderStatusRequest,
) -> Result<OrderWithItems, String> {
    update_order_status_flags_internal(pool.inner(), request).await
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
        "SELECT id, numero, customer_name, cliente, address, cidade_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_total, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, created_at, updated_at 
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

    let (financeiro, conferencia, sublimacao, costura, expedicao) =
        normalize_status_flags(&existing_order, &request);

    let updated_order = sqlx::query_as::<_, Order>(
        "UPDATE orders 
         SET financeiro = $1, conferencia = $2, sublimacao = $3, costura = $4, expedicao = $5 
         WHERE id = $6 
         RETURNING id, numero, customer_name, cliente, address, cidade_cliente, telefone_cliente,
                   data_entrada, data_entrega, total_value, valor_total, status, prioridade, observacao,
                   financeiro, conferencia, sublimacao, costura, expedicao, created_at, updated_at"
    )
    .bind(financeiro)
    .bind(conferencia)
    .bind(sublimacao)
    .bind(costura)
    .bind(expedicao)
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
        "SELECT id, numero, customer_name, cliente, address, cidade_cliente, telefone_cliente, 
                data_entrada, data_entrega, total_value, valor_total, status, prioridade, observacao, 
                financeiro, conferencia, sublimacao, costura, expedicao, created_at, updated_at 
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
    let search_pattern = filters
        .customer_name
        .as_ref()
        .map(|customer| format!("%{}%", customer));

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
        customer_name: order.customer_name,
        cliente: order.cliente,
        address: order.address,
        cidade_cliente: order.cidade_cliente,
        telefone_cliente: order.telefone_cliente,
        data_entrada: order.data_entrada,
        data_entrega: order.data_entrega,
        total_value: order.total_value,
        valor_total: order.valor_total,
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
        items,
    }
}

fn normalize_status_flags(
    existing_order: &Order,
    request: &UpdateOrderStatusRequest,
) -> (bool, bool, bool, bool, bool) {
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

    (financeiro, conferencia, sublimacao, costura, expedicao)
}

// Função auxiliar para buscar itens de um pedido
async fn get_order_items(pool: &DbPool, order_id: i32) -> Result<Vec<OrderItem>, String> {
    sqlx::query_as::<_, OrderItem>(
        "SELECT id, order_id, item_name, quantity, unit_price, subtotal 
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
            customer_name: "Cliente Teste".to_string(),
            cliente: Some("Cliente Teste".to_string()),
            address: "Rua A, 123".to_string(),
            cidade_cliente: Some("Cidade".to_string()),
            telefone_cliente: Some("999999999".to_string()),
            data_entrada: Some(make_date()),
            data_entrega: Some(make_date()),
            total_value: Decimal::new(1000, 2),
            valor_total: Some(Decimal::new(1000, 2)),
            created_at: Some(make_datetime()),
            updated_at: Some(make_datetime()),
            status: OrderStatus::Pendente,
            prioridade: Some("NORMAL".to_string()),
            observacao: Some("Observação".to_string()),
            financeiro: Some(financeiro),
            conferencia: Some(conferencia),
            sublimacao: Some(sublimacao),
            costura: Some(costura),
            expedicao: Some(expedicao),
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

        let (financeiro, conferencia, sublimacao, costura, expedicao) =
            normalize_status_flags(&existing, &request);

        assert!(!financeiro);
        assert!(!conferencia);
        assert!(!sublimacao);
        assert!(!costura);
        assert!(!expedicao);
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

        let (financeiro, conferencia, sublimacao, costura, expedicao) =
            normalize_status_flags(&existing, &request);

        assert!(financeiro);
        assert!(conferencia);
        assert!(sublimacao);
        assert!(costura);
        assert!(expedicao);
    }

    #[test]
    fn build_order_with_items_keeps_all_metadata() {
        let order = make_order_with_flags(true, false, false, true, false);
        let items = vec![OrderItem {
            id: 10,
            order_id: order.id,
            item_name: "Item 1".to_string(),
            quantity: 2,
            unit_price: Decimal::new(2500, 2),
            subtotal: Decimal::new(5000, 2),
        }];

        let result = build_order_with_items(order.clone(), items.clone());

        assert_eq!(result.id, order.id);
        assert_eq!(result.numero, order.numero);
        assert_eq!(result.customer_name, order.customer_name);
        assert_eq!(result.cidade_cliente, order.cidade_cliente);
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
            let request = CreateOrderRequest {
                customer_name: "Cliente Teste".into(),
                address: "Rua A, 123".into(),
                status: OrderStatus::Pendente,
                items: vec![
                    CreateOrderItemRequest {
                        item_name: "Produto 1".into(),
                        quantity: 2,
                        unit_price: 150.0,
                    },
                    CreateOrderItemRequest {
                        item_name: "Produto 2".into(),
                        quantity: 1,
                        unit_price: 200.0,
                    },
                ],
            };

            let created = super::create_order_internal(&pool, request)
                .await
                .expect("pedido criado");

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
            let request = CreateOrderRequest {
                customer_name: "Cliente Teste".into(),
                address: "Rua B, 456".into(),
                status: OrderStatus::Pendente,
                items: vec![CreateOrderItemRequest {
                    item_name: "Produto".into(),
                    quantity: 1,
                    unit_price: 300.0,
                }],
            };

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
