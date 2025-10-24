use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, RwLock};
use tokio::time::interval;
use tauri::{AppHandle, Manager};
use tracing::{error, info, warn};

// ========================================
// TIPOS DE NOTIFICAÇÃO
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    OrderCreated,
    OrderUpdated,
    OrderDeleted,
    OrderStatusChanged,
    OrderStatusFlagsUpdated, // Novo: para atualizações de flags de produção
    Heartbeat,              // Novo: para detectar clientes ativos
    ClientConnected,        // Novo: quando cliente se conecta
    ClientDisconnected,     // Novo: quando cliente se desconecta
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderNotification {
    pub notification_type: NotificationType,
    pub order_id: i32,
    pub order_numero: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub user_id: Option<i32>,
    pub details: Option<String>,
    pub client_id: Option<String>, // Novo: ID do cliente que gerou a notificação
    pub broadcast_to_all: bool,    // Novo: se deve ser enviado para todos os clientes
}

// ========================================
// GERENCIADOR DE NOTIFICAÇÕES
// ========================================

#[derive(Debug, Clone)]
pub struct ClientInfo {
    pub last_heartbeat: Instant,
    pub is_active: bool,
}

#[derive(Debug, Clone)]
pub struct NotificationManager {
    sender: broadcast::Sender<OrderNotification>,
    subscribers: Arc<RwLock<HashMap<String, broadcast::Receiver<OrderNotification>>>>,
    client_info: Arc<RwLock<HashMap<String, ClientInfo>>>,
    heartbeat_interval: Duration,
}

impl NotificationManager {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000); // Buffer para 1000 notificações
        
        Self {
            sender,
            subscribers: Arc::new(RwLock::new(HashMap::new())),
            client_info: Arc::new(RwLock::new(HashMap::new())),
            heartbeat_interval: Duration::from_secs(30), // Heartbeat a cada 30 segundos
        }
    }

    pub async fn subscribe(&self, client_id: String) -> broadcast::Receiver<OrderNotification> {
        let receiver = self.sender.subscribe();
        
        let mut subscribers = self.subscribers.write().await;
        let mut client_info = self.client_info.write().await;
        
        // Registrar cliente
        subscribers.insert(client_id.clone(), receiver.resubscribe());
        client_info.insert(client_id.clone(), ClientInfo {
            last_heartbeat: Instant::now(),
            is_active: true,
        });
        
        info!("Cliente {} conectado ao sistema de notificações", client_id);
        
        // Enviar notificação de conexão
        let connection_notification = OrderNotification {
            notification_type: NotificationType::ClientConnected,
            order_id: 0,
            order_numero: None,
            timestamp: chrono::Utc::now(),
            user_id: None,
            details: Some(format!("Cliente {} conectado", client_id)),
            client_id: Some(client_id),
            broadcast_to_all: true,
        };
        
        let _ = self.sender.send(connection_notification);
        
        receiver
    }

    pub async fn unsubscribe(&self, client_id: &str) {
        let mut subscribers = self.subscribers.write().await;
        let mut client_info = self.client_info.write().await;
        
        subscribers.remove(client_id);
        client_info.remove(client_id);
        
        info!("Cliente {} desconectado do sistema de notificações", client_id);
        
        // Enviar notificação de desconexão
        let disconnection_notification = OrderNotification {
            notification_type: NotificationType::ClientDisconnected,
            order_id: 0,
            order_numero: None,
            timestamp: chrono::Utc::now(),
            user_id: None,
            details: Some(format!("Cliente {} desconectado", client_id)),
            client_id: Some(client_id.to_string()),
            broadcast_to_all: true,
        };
        
        let _ = self.sender.send(disconnection_notification);
    }

    pub async fn broadcast(&self, notification: OrderNotification) -> Result<usize, String> {
        let receiver_count = self.sender.receiver_count();
        info!("📊 Tentando broadcast: {} receivers ativos", receiver_count);
        
        if receiver_count == 0 {
            info!("⚠️ Nenhum cliente conectado para receber notificação");
            return Ok(0);
        }

        match self.sender.send(notification.clone()) {
            Ok(count) => {
                info!("✅ Notificação enviada para {} clientes: {:?}", count, notification.notification_type);
                Ok(count)
            }
            Err(e) => {
                error!("❌ Erro ao enviar notificação: {}", e);
                Err(format!("Erro ao enviar notificação: {}", e))
            }
        }
    }

    pub async fn get_subscriber_count(&self) -> usize {
        self.sender.receiver_count()
    }

    // ========================================
    // NOVOS MÉTODOS PARA BROADCAST GLOBAL
    // ========================================

    /// Atualiza heartbeat de um cliente
    pub async fn update_heartbeat(&self, client_id: &str) {
        let mut client_info = self.client_info.write().await;
        if let Some(info) = client_info.get_mut(client_id) {
            info.last_heartbeat = Instant::now();
            info.is_active = true;
        }
    }

    /// Verifica clientes inativos e remove-os
    pub async fn cleanup_inactive_clients(&self) {
        let mut subscribers = self.subscribers.write().await;
        let mut client_info = self.client_info.write().await;
        let timeout = Duration::from_secs(60); // 60 segundos de timeout
        
        let now = Instant::now();
        let inactive_clients: Vec<String> = client_info
            .iter()
            .filter(|(_, info)| now.duration_since(info.last_heartbeat) > timeout)
            .map(|(id, _)| id.clone())
            .collect();

        for client_id in inactive_clients {
            warn!("Removendo cliente inativo: {}", client_id);
            subscribers.remove(&client_id);
            client_info.remove(&client_id);
            
            // Enviar notificação de desconexão por timeout
            let timeout_notification = OrderNotification {
                notification_type: NotificationType::ClientDisconnected,
                order_id: 0,
                order_numero: None,
                timestamp: chrono::Utc::now(),
                user_id: None,
                details: Some(format!("Cliente {} desconectado por timeout", client_id)),
                client_id: Some(client_id),
                broadcast_to_all: true,
            };
            
            let _ = self.sender.send(timeout_notification);
        }
    }

    /// Broadcast global para todos os clientes conectados
    pub async fn broadcast_to_all(&self, notification: OrderNotification) -> Result<usize, String> {
        let receiver_count = self.sender.receiver_count();
        info!("🌐 Broadcast global: {} receivers ativos", receiver_count);
        
        if receiver_count == 0 {
            warn!("⚠️ Nenhum cliente conectado para broadcast global");
            return Ok(0);
        }

        match self.sender.send(notification.clone()) {
            Ok(receiver_count) => {
                info!("✅ Broadcast global enviado para {} clientes", receiver_count);
                Ok(receiver_count)
            }
            Err(e) => {
                error!("❌ Erro no broadcast global: {}", e);
                Err(format!("Erro no broadcast global: {}", e))
            }
        }
    }

    /// Inicia o sistema de heartbeat automático
    pub async fn start_heartbeat_monitor(&self) {
        let manager = self.clone();
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(30));
            loop {
                interval.tick().await;
                manager.cleanup_inactive_clients().await;
                
                // Enviar heartbeat para todos os clientes ativos
                let heartbeat_notification = OrderNotification {
                    notification_type: NotificationType::Heartbeat,
                    order_id: 0,
                    order_numero: None,
                    timestamp: chrono::Utc::now(),
                    user_id: None,
                    details: Some("Heartbeat do servidor".to_string()),
                    client_id: None,
                    broadcast_to_all: true,
                };
                
                let _ = manager.sender.send(heartbeat_notification);
            }
        });
    }

    /// Obtém lista de clientes ativos
    pub async fn get_active_clients(&self) -> Vec<String> {
        let client_info = self.client_info.read().await;
        client_info
            .iter()
            .filter(|(_, info)| info.is_active)
            .map(|(id, _)| id.clone())
            .collect()
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
    client_id: Option<String>,
    broadcast_to_all: bool,
) -> OrderNotification {
    OrderNotification {
        notification_type,
        order_id,
        order_numero,
        timestamp: chrono::Utc::now(),
        user_id,
        details,
        client_id,
        broadcast_to_all,
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
        info!("🚀 Iniciando listener para cliente: {}", client_id_clone);
        
        while let Ok(notification) = receiver.recv().await {
            let event_name = format!("order-notification-{}", client_id_clone);
            info!("📡 Tentando enviar evento '{}' para cliente {}", event_name, client_id_clone);
            
            match app_handle_clone.emit_all(&event_name, &notification) {
                Ok(_) => {
                    info!("✅ Notificação enviada com sucesso para cliente {}: {:?}", client_id_clone, notification.notification_type);
                }
                Err(e) => {
                    error!("❌ Erro ao enviar notificação para cliente {}: {}", client_id_clone, e);
                    break;
                }
            }
        }
        
        // Cleanup: remover cliente da lista de subscribers quando desconectar
        let notification_manager = app_handle_clone.state::<NotificationManager>();
        notification_manager.unsubscribe(&client_id_clone).await;
        info!("🔌 Cliente {} desconectado das notificações", client_id_clone);
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

#[tauri::command]
pub async fn test_notification_broadcast(
    app_handle: AppHandle,
) -> Result<String, String> {
    info!("🧪 Testando broadcast de notificação...");
    
    let notification_manager = app_handle.state::<NotificationManager>();
    let subscriber_count = notification_manager.get_subscriber_count().await;
    
    if subscriber_count == 0 {
        return Ok("❌ Nenhum subscriber conectado".to_string());
    }
    
    // Criar uma notificação de teste
    let test_notification = create_notification(
        NotificationType::OrderStatusChanged,
        999, // ID de teste
        Some("TESTE".to_string()),
        Some(999), // User ID de teste
        Some("Notificação de teste do sistema".to_string()),
        Some("test_client".to_string()),
        true,
    );
    
    let result = notification_manager.broadcast(test_notification).await?;
    
    Ok(format!("✅ Teste concluído: {} clientes notificados", result))
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
    info!("📢 Broadcasting order_created: order_id={}, numero={:?}, user_id={:?}", order_id, order_numero, user_id);
    
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderCreated,
        order_id,
        order_numero,
        user_id,
        Some("Novo pedido criado".to_string()),
        None,
        false,
    );
    
    let result = notification_manager.broadcast(notification).await?;
    info!("✅ Broadcast order_created concluído, {} clientes notificados", result);
    Ok(result)
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
        None,
        false,
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
        None,
        false,
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
    info!("📢 Broadcasting order_status_changed: order_id={}, numero={:?}, user_id={:?}, details={}", order_id, order_numero, user_id, status_details);
    
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderStatusChanged,
        order_id,
        order_numero,
        user_id,
        Some(status_details),
        None,
        false,
    );
    
    let result = notification_manager.broadcast(notification).await?;
    info!("✅ Broadcast order_status_changed concluído, {} clientes notificados", result);
    Ok(result)
}

// ========================================
// NOVOS COMANDOS TAURI PARA BROADCAST GLOBAL
// ========================================

#[tauri::command]
pub async fn send_heartbeat(
    app_handle: AppHandle,
    client_id: String,
) -> Result<String, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    notification_manager.update_heartbeat(&client_id).await;
    
    Ok(format!("Heartbeat atualizado para cliente {}", client_id))
}

#[tauri::command]
pub async fn get_active_clients(
    app_handle: AppHandle,
) -> Result<Vec<String>, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    let clients = notification_manager.get_active_clients().await;
    
    Ok(clients)
}

#[tauri::command]
pub async fn broadcast_status_update(
    app_handle: AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
    status_details: String,
    client_id: Option<String>,
) -> Result<usize, String> {
    info!("🌐 Broadcasting status update global: order_id={}, numero={:?}, user_id={:?}, details={}", order_id, order_numero, user_id, status_details);
    
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderStatusFlagsUpdated,
        order_id,
        order_numero,
        user_id,
        Some(status_details),
        client_id,
        true, // broadcast_to_all = true
    );
    
    let result = notification_manager.broadcast_to_all(notification).await?;
    info!("✅ Broadcast global de status concluído, {} clientes notificados", result);
    Ok(result)
}

// ========================================
// FUNÇÕES DE BROADCAST GLOBAL ATUALIZADAS
// ========================================

pub async fn broadcast_order_created_global(
    app_handle: &AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
    client_id: Option<String>,
) -> Result<usize, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderCreated,
        order_id,
        order_numero,
        user_id,
        Some("Novo pedido criado".to_string()),
        client_id,
        true, // broadcast_to_all = true
    );
    
    let result = notification_manager.broadcast_to_all(notification).await?;
    info!("✅ Broadcast global order_created concluído, {} clientes notificados", result);
    Ok(result)
}

pub async fn broadcast_order_updated_global(
    app_handle: &AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
    client_id: Option<String>,
) -> Result<usize, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderUpdated,
        order_id,
        order_numero,
        user_id,
        Some("Pedido atualizado".to_string()),
        client_id,
        true, // broadcast_to_all = true
    );
    
    let result = notification_manager.broadcast_to_all(notification).await?;
    info!("✅ Broadcast global order_updated concluído, {} clientes notificados", result);
    Ok(result)
}

pub async fn broadcast_order_deleted_global(
    app_handle: &AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
    client_id: Option<String>,
) -> Result<usize, String> {
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderDeleted,
        order_id,
        order_numero,
        user_id,
        Some("Pedido excluído".to_string()),
        client_id,
        true, // broadcast_to_all = true
    );
    
    let result = notification_manager.broadcast_to_all(notification).await?;
    info!("✅ Broadcast global order_deleted concluído, {} clientes notificados", result);
    Ok(result)
}

pub async fn broadcast_order_status_changed_global(
    app_handle: &AppHandle,
    order_id: i32,
    order_numero: Option<String>,
    user_id: Option<i32>,
    status_details: String,
    client_id: Option<String>,
) -> Result<usize, String> {
    info!("🌐 Broadcasting order_status_changed global: order_id={}, numero={:?}, user_id={:?}, details={}", order_id, order_numero, user_id, status_details);
    
    let notification_manager = app_handle.state::<NotificationManager>();
    
    let notification = create_notification(
        NotificationType::OrderStatusChanged,
        order_id,
        order_numero,
        user_id,
        Some(status_details),
        client_id,
        true, // broadcast_to_all = true
    );
    
    let result = notification_manager.broadcast_to_all(notification).await?;
    info!("✅ Broadcast global order_status_changed concluído, {} clientes notificados", result);
    Ok(result)
}
