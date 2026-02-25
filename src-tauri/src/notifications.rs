use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Emitter};
use tracing::{error, info};

// ========================================
// SISTEMA SIMPLES DE NOTIFICAÇÕES
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleNotification {
    pub event_type: String,
    pub order_id: i32,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

// ========================================
// FUNÇÕES SIMPLES DE NOTIFICAÇÃO
// ========================================

/// Notifica sobre criação de pedido (simples)
pub async fn notify_order_created(app_handle: &AppHandle, order_id: i32) {
    let notification = SimpleNotification {
        event_type: "order_created".to_string(),
        order_id,
        message: "Novo pedido criado".to_string(),
        timestamp: chrono::Utc::now(),
    };
    
    if let Err(e) = app_handle.emit("order_created", &notification) {
        error!("Erro ao emitir notificação de criação: {}", e);
    } else {
        info!("✅ Notificação de criação enviada para pedido {}", order_id);
    }
}

/// Notifica sobre atualização de pedido (simples)
pub async fn notify_order_updated(app_handle: &AppHandle, order_id: i32) {
    let notification = SimpleNotification {
        event_type: "order_updated".to_string(),
        order_id,
        message: "Pedido atualizado".to_string(),
        timestamp: chrono::Utc::now(),
    };
    
    if let Err(e) = app_handle.emit("order_updated", &notification) {
        error!("Erro ao emitir notificação de atualização: {}", e);
    } else {
        info!("✅ Notificação de atualização enviada para pedido {}", order_id);
    }
}

/// Notifica sobre exclusão de pedido (simples)
pub async fn notify_order_deleted(app_handle: &AppHandle, order_id: i32) {
    let notification = SimpleNotification {
        event_type: "order_deleted".to_string(),
        order_id,
        message: "Pedido excluído".to_string(),
        timestamp: chrono::Utc::now(),
    };
    
    if let Err(e) = app_handle.emit("order_deleted", &notification) {
        error!("Erro ao emitir notificação de exclusão: {}", e);
    } else {
        info!("✅ Notificação de exclusão enviada para pedido {}", order_id);
    }
}

/// Notifica sobre mudança de status (simples)
pub async fn notify_order_status_changed(app_handle: &AppHandle, order_id: i32, status_details: String) {
    let notification = SimpleNotification {
        event_type: "order_status_changed".to_string(),
        order_id,
        message: status_details,
        timestamp: chrono::Utc::now(),
    };
    
    if let Err(e) = app_handle.emit("order_status_changed", &notification) {
        error!("Erro ao emitir notificação de status: {}", e);
    } else {
        info!("✅ Notificação de status enviada para pedido {}", order_id);
    }
}

// ========================================
// COMANDOS TAURI SIMPLES
// ========================================

#[tauri::command]
pub async fn test_simple_notification(app_handle: AppHandle) -> Result<String, String> {
    info!("🧪 Testando notificação simples...");
    
    let notification = SimpleNotification {
        event_type: "test".to_string(),
        order_id: 999,
        message: "Teste de notificação simples".to_string(),
        timestamp: chrono::Utc::now(),
    };
    
    match app_handle.emit("test_notification", &notification) {
        Ok(_) => Ok("✅ Notificação de teste enviada com sucesso".to_string()),
        Err(e) => Err(format!("❌ Erro ao enviar notificação: {}", e)),
    }
}