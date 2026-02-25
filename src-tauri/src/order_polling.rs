use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tauri::{AppHandle, Manager, Emitter};
use tracing::{error, info, debug};
use sqlx::PgPool;

// ========================================
// SISTEMA DE POLLING DE PEDIDOS
// ========================================

/// Estado anterior dos pedidos em cache
type OrderStatusCache = Arc<Mutex<HashMap<i32, String>>>;

/// Estrutura para representar o status de um pedido
#[derive(Debug, Clone)]
struct OrderStatus {
    id: i32,
    status: String,
    pronto: Option<bool>,
    financeiro: Option<bool>,
    conferencia: Option<bool>,
    sublimacao: Option<bool>,
    costura: Option<bool>,
    expedicao: Option<bool>,
}

/// Inicia o sistema de polling de pedidos em background
pub fn start_order_polling(app_handle: AppHandle, pool: PgPool) {
    let cache: OrderStatusCache = Arc::new(Mutex::new(HashMap::new()));
    
    tokio::spawn(async move {
        info!("🚀 Sistema de polling de pedidos iniciado");
        
        loop {
            // Aguardar 60 segundos
            tokio::time::sleep(Duration::from_secs(60)).await;
            
            // Verificar mudanças de status
            if let Err(e) = check_order_changes(&app_handle, &pool, &cache).await {
                error!("❌ Erro ao verificar mudanças de pedidos: {}", e);
            }
        }
    });
}

/// Verifica mudanças nos pedidos e emite eventos quando necessário
async fn check_order_changes(
    app_handle: &AppHandle,
    pool: &PgPool,
    cache: &OrderStatusCache,
) -> Result<(), String> {
    debug!("🔍 Verificando mudanças de status dos pedidos...");
    
    // Buscar todos os pedidos com seus status atuais
    let current_orders = fetch_current_order_statuses(pool).await?;
    
    // Obter cache anterior
    let mut previous_cache = cache.lock().await;
    
    let mut changes_detected = 0;
    
    // Verificar mudanças
    for order in &current_orders {
        let order_key = order.id;
        let current_status = format!(
            "status:{}|pronto:{:?}|financeiro:{:?}|conferencia:{:?}|sublimacao:{:?}|costura:{:?}|expedicao:{:?}",
            order.status,
            order.pronto,
            order.financeiro,
            order.conferencia,
            order.sublimacao,
            order.costura,
            order.expedicao
        );
        
        // Verificar se houve mudança
        if let Some(previous_status) = previous_cache.get(&order_key) {
            if previous_status != &current_status {
                // Status mudou - emitir evento
                emit_order_status_changed(app_handle, order).await;
                changes_detected += 1;
            }
        } else {
            // Pedido novo - emitir evento
            emit_order_status_changed(app_handle, order).await;
            changes_detected += 1;
        }
        
        // Atualizar cache
        previous_cache.insert(order_key, current_status);
    }
    
    // Remover pedidos que não existem mais do cache
    let current_ids: std::collections::HashSet<i32> = current_orders.iter().map(|o| o.id).collect();
    previous_cache.retain(|&id, _| current_ids.contains(&id));
    
    if changes_detected > 0 {
        info!("✅ {} mudanças de status detectadas e eventos emitidos", changes_detected);
    } else {
        debug!("ℹ️ Nenhuma mudança de status detectada");
    }
    
    Ok(())
}

/// Busca o status atual de todos os pedidos
async fn fetch_current_order_statuses(pool: &PgPool) -> Result<Vec<OrderStatus>, String> {
    let rows = sqlx::query_as::<_, OrderStatusRow>(
        r#"
        SELECT id, status, pronto, financeiro, conferencia, sublimacao, costura, expedicao
        FROM orders
        ORDER BY id
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| {
        error!("Erro ao buscar status dos pedidos: {}", e);
        "Erro ao buscar pedidos".to_string()
    })?;
    
    let orders: Vec<OrderStatus> = rows
        .into_iter()
        .map(|row| OrderStatus {
            id: row.id,
            status: format!("{:?}", row.status),
            pronto: row.pronto,
            financeiro: row.financeiro,
            conferencia: row.conferencia,
            sublimacao: row.sublimacao,
            costura: row.costura,
            expedicao: row.expedicao,
        })
        .collect();
    
    debug!("📊 {} pedidos carregados para verificação", orders.len());
    Ok(orders)
}

// Estrutura para mapear os dados do banco
#[derive(sqlx::FromRow)]
struct OrderStatusRow {
    id: i32,
    status: crate::models::OrderStatus,
    pronto: Option<bool>,
    financeiro: Option<bool>,
    conferencia: Option<bool>,
    sublimacao: Option<bool>,
    costura: Option<bool>,
    expedicao: Option<bool>,
}

/// Emite evento de mudança de status para o frontend
async fn emit_order_status_changed(app_handle: &AppHandle, order: &OrderStatus) {
    let status_details = format!(
        "Pedido {}: Status={}, Pronto={:?}, Financeiro={:?}, Conferência={:?}, Sublimação={:?}, Costura={:?}, Expedição={:?}",
        order.id,
        order.status,
        order.pronto,
        order.financeiro,
        order.conferencia,
        order.sublimacao,
        order.costura,
        order.expedicao
    );
    
    let notification = OrderStatusNotification {
        order_id: order.id,
        status: order.status.clone(),
        pronto: order.pronto,
        financeiro: order.financeiro,
        conferencia: order.conferencia,
        sublimacao: order.sublimacao,
        costura: order.costura,
        expedicao: order.expedicao,
        details: status_details,
        timestamp: chrono::Utc::now(),
    };
    
    info!("🚀 Tentando emitir evento order_status_changed para pedido {}", order.id);
    info!("📋 Dados do evento: {:?}", notification);
    
    match app_handle.emit("order_status_changed", &notification) {
        Ok(_) => {
            info!("✅ Evento order_status_changed emitido com SUCESSO para pedido {}: {}", order.id, order.status);
            info!("📡 Evento enviado para todos os listeners conectados");
        }
        Err(e) => {
            error!("❌ ERRO ao emitir evento order_status_changed: {}", e);
            error!("🔍 Detalhes do erro: {:?}", e);
        }
    }
}

// ========================================
// ESTRUTURA DE NOTIFICAÇÃO
// ========================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OrderStatusNotification {
    pub order_id: i32,
    pub status: String,
    pub pronto: Option<bool>,
    pub financeiro: Option<bool>,
    pub conferencia: Option<bool>,
    pub sublimacao: Option<bool>,
    pub costura: Option<bool>,
    pub expedicao: Option<bool>,
    pub details: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

// ========================================
// COMANDO TAURI PARA TESTE
// ========================================

#[tauri::command]
pub async fn test_order_polling(app_handle: AppHandle) -> Result<String, String> {
    info!("🧪 [BACKEND] Testando sistema de polling de pedidos...");
    
    let test_notification = OrderStatusNotification {
        order_id: 999,
        status: "TESTE".to_string(),
        pronto: Some(false),
        financeiro: Some(true),
        conferencia: Some(false),
        sublimacao: Some(false),
        costura: Some(false),
        expedicao: Some(false),
        details: "Teste do sistema de polling".to_string(),
        timestamp: chrono::Utc::now(),
    };
    
    info!("🚀 [BACKEND] Tentando emitir evento de teste...");
    info!("📋 [BACKEND] Dados do teste: {:?}", test_notification);
    
    match app_handle.emit("order_status_changed", &test_notification) {
        Ok(_) => {
            info!("✅ [BACKEND] Teste executado com SUCESSO!");
            info!("📡 [BACKEND] Evento enviado para todos os listeners");
            Ok("✅ Teste de polling executado com sucesso - verifique o console do frontend".to_string())
        }
        Err(e) => {
            error!("❌ [BACKEND] Erro no teste de polling: {}", e);
            Err(format!("❌ Erro no teste de polling: {}", e))
        }
    }
}

// ========================================
// COMANDO PARA FORÇAR VERIFICAÇÃO
// ========================================

#[tauri::command]
pub async fn force_order_check(
    app_handle: AppHandle,
    pool: tauri::State<'_, sqlx::PgPool>,
) -> Result<String, String> {
    info!("🔄 Forçando verificação de mudanças de pedidos...");
    
    let cache: OrderStatusCache = Arc::new(Mutex::new(HashMap::new()));
    
    match check_order_changes(&app_handle, pool.inner(), &cache).await {
        Ok(_) => Ok("✅ Verificação forçada executada com sucesso".to_string()),
        Err(e) => Err(format!("❌ Erro na verificação forçada: {}", e)),
    }
}
