use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tauri::{AppHandle, Manager};
use tracing::{error, info};

// ========================================
// TIPOS DE NOTIFICAÇÃO
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    OrderCreated,
    OrderUpdated,
    OrderDeleted,
    OrderStatusChanged,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderNotification {
    pub notification_type: NotificationType,
    pub order_id: i32,
    pub order_numero: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub user_id: Option<i32>,
    pub details: Option<String>,
}

// ========================================
// GERENCIADOR DE NOTIFICAÇÕES
// ========================================

#[derive(Debug, Clone)]
pub struct NotificationManager {
    sender: broadcast::Sender<OrderNotification>,
    subscribers: Arc<RwLock<HashMap<String, broadcast::Receiver<OrderNotification>>>>,
}

impl NotificationManager {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000); // Buffer para 1000 notificações
        
        Self {
            sender,
            subscribers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn subscribe(&self, client_id: String) -> broadcast::Receiver<OrderNotification> {
        let receiver = self.sender.subscribe();
        
        let mut subscribers = self.subscribers.write().await;
        subscribers.insert(client_id.clone(), receiver.resubscribe());
        
        info!("Cliente {} se inscreveu para notificações", client_id);
        receiver
    }

    pub async fn unsubscribe(&self, client_id: &str) {
        let mut subscribers = self.subscribers.write().await;
        subscribers.remove(client_id);
        
        info!("Cliente {} cancelou inscrição nas notificações", client_id);
    }

    pub async fn broadcast(&self, notification: OrderNotification) -> Result<usize, String> {
        let receiver_count = self.sender.receiver_count();
        
        if receiver_count == 0 {
            info!("Nenhum cliente conectado para receber notificação");
            return Ok(0);
        }

        match self.sender.send(notification.clone()) {
            Ok(count) => {
                info!("Notificação enviada para {} clientes: {:?}", count, notification.notification_type);
                Ok(count)
            }
            Err(e) => {
                error!("Erro ao enviar notificação: {}", e);
                Err(format!("Erro ao enviar notificação: {}", e))
            }
        }
    }

    pub async fn get_subscriber_count(&self) -> usize {
        self.sender.receiver_count()
    }
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

pub fn create_notification(
    notification_type: NotificationType,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
    details: Option<String>,
) -> OrderNotification {
    OrderNotification {
        notification_type,
        order_id,
        order_numero,
        timestamp: chrono::Utc::now(),
        user_id,
        details,
    }
}

// ========================================
// COMANDOS TAURI PARA NOTIFICAÇÕES
// ========================================

#[tauri::command]
pub async fn subscribe_to_notifications(
    app_handle: AppHandle,
    client_id: String,
) -> Result<String, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    // Verificar se o cliente já está inscrito
    let subscribers = notification_manager.subscribers.read().await;
    if subscribers.contains_key(&client_id) {
        info!("Cliente {} já está inscrito, reutilizando conexão", client_id);
        return Ok(format!("Cliente {} já estava inscrito", client_id));
    }
    drop(subscribers);
    
    // Criar um receiver para este cliente
    let mut receiver = notification_manager.subscribe(client_id.clone()).await;
    
    // Spawn uma task para escutar notificações e enviar para o frontend
    let app_handle_clone = app_handle.clone();
    let client_id_clone = client_id.clone();
    
    tokio::spawn(async move {
        while let Ok(notification) = receiver.recv().await {
            let event_name = format!("order-notification-{}", client_id_clone);
            
            match app_handle_clone.emit_all(&event_name, &notification) {
                Ok(_) => {
                    info!("Notificação enviada para cliente {}: {:?}", client_id_clone, notification.notification_type);
                }
                Err(e) => {
                    error!("Erro ao enviar notificação para cliente {}: {}", client_id_clone, e);
                    break;
                }
            }
        }
        
        // Cleanup: remover cliente da lista de subscribers quando desconectar
        let notification_manager = app_handle_clone.state::<NotificationManager>();
        notification_manager.unsubscribe(&client_id_clone).await;
        info!("Cliente {} desconectado das notificações", client_id_clone);
    });
    
    Ok(format!("Inscrito para notificações como cliente {}", client_id))
}

#[tauri::command]
pub async fn unsubscribe_from_notifications(
    app_handle: AppHandle,
    client_id: String,
) -> Result<String, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    notification_manager.unsubscribe(&client_id).await;
    
    Ok(format!("Cancelada inscrição do cliente {}", client_id))
}

#[tauri::command]
pub async fn get_notification_subscriber_count(
    app_handle: AppHandle,
) -> Result<usize, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    Ok(notification_manager.get_subscriber_count().await)
}

// ========================================
// FUNÇÕES PARA BROADCAST AUTOMÁTICO
// ========================================

pub async fn broadcast_order_created(
    app_handle: &AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
) -> Result<usize, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderCreated,
        order_id,
        order_numero,
        user_id,
        Some("Novo pedido criado".to_string()),
    );
    
    notification_manager.broadcast(notification).await
}

pub async fn broadcast_order_updated(
    app_handle: &AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
) -> Result<usize, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderUpdated,
        order_id,
        order_numero,
        user_id,
        Some("Pedido atualizado".to_string()),
    );
    
    notification_manager.broadcast(notification).await
}

pub async fn broadcast_order_deleted(
    app_handle: &AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
) -> Result<usize, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderDeleted,
        order_id,
        order_numero,
        user_id,
        Some("Pedido excluído".to_string()),
    );
    
    notification_manager.broadcast(notification).await
}

pub async fn broadcast_order_status_changed(
    app_handle: &AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
    status_details: String,
) -> Result<usize, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderStatusChanged,
        order_id,
        order_numero,
        user_id,
        Some(status_details),
    );
    
    notification_manager.broadcast(notification).await
}
