// Script de teste para simular dois clientes ativos
// Este arquivo demonstra como o sistema otimizado funciona na prática

use crate::notifications::{
    NotificationManager, OrderNotification, NotificationType, create_notification
};
use tauri::AppHandle;
use tokio::time::{sleep, Duration};
use tracing::{info, debug};

/// Simula dois clientes ativos e demonstra o fluxo de logs esperado
pub async fn simulate_two_active_clients(app_handle: &AppHandle) -> Result<(), String> {
    info!("🚀 Iniciando simulação de dois clientes ativos...");
    
    let notification_manager = app_handle.state::<NotificationManager>();
    
    // Simular conexão dos clientes
    info!("📱 Cliente A (Desktop) conectando...");
    let client_a = "client_desktop_001".to_string();
    let _receiver_a = notification_manager.subscribe(client_a.clone()).await;
    
    info!("📱 Cliente B (Mobile) conectando...");
    let client_b = "client_mobile_002".to_string();
    let _receiver_b = notification_manager.subscribe(client_b.clone()).await;
    
    // Aguardar um pouco para estabilizar
    sleep(Duration::from_millis(100)).await;
    
    // Simular eventos sequenciais
    simulate_events(&notification_manager).await?;
    
    // Simular desconexão de um cliente
    info!("📱 Cliente A desconectando...");
    notification_manager.unsubscribe(&client_a).await;
    
    // Simular mais eventos após desconexão
    simulate_events_after_disconnect(&notification_manager).await?;
    
    info!("✅ Simulação concluída com sucesso!");
    Ok(())
}

/// Simula eventos típicos entre os clientes
async fn simulate_events(notification_manager: &NotificationManager) -> Result<(), String> {
    info!("🔄 Simulando eventos entre clientes...");
    
    // Evento 1: Cliente A atualiza status do pedido #123
    info!("📝 Cliente A atualiza status do pedido #123");
    let notification_1 = create_notification(
        NotificationType::OrderStatusChanged,
        123,
        Some("PED-123".to_string()),
        Some(1),
        Some("Status atualizado para 'Em Produção'".to_string()),
        Some("client_desktop_001".to_string()),
        false,
    );
    
    let result_1 = notification_manager.safe_broadcast(notification_1, None).await?;
    debug!("✅ Evento 1 enviado para {} clientes", result_1);
    
    // Aguardar um pouco
    sleep(Duration::from_millis(500)).await;
    
    // Evento 2: Cliente B atualiza status do pedido #456
    info!("📝 Cliente B atualiza status do pedido #456");
    let notification_2 = create_notification(
        NotificationType::OrderStatusChanged,
        456,
        Some("PED-456".to_string()),
        Some(2),
        Some("Status atualizado para 'Pronto'".to_string()),
        Some("client_mobile_002".to_string()),
        false,
    );
    
    let result_2 = notification_manager.safe_broadcast(notification_2, None).await?;
    debug!("✅ Evento 2 enviado para {} clientes", result_2);
    
    // Aguardar um pouco
    sleep(Duration::from_millis(500)).await;
    
    // Evento 3: Cliente A tenta atualizar pedido #123 novamente (teste de throttling)
    info!("📝 Cliente A tenta atualizar pedido #123 novamente (teste de throttling)");
    let notification_3 = create_notification(
        NotificationType::OrderStatusChanged,
        123,
        Some("PED-123".to_string()),
        Some(1),
        Some("Status atualizado para 'Expedição'".to_string()),
        Some("client_desktop_001".to_string()),
        false,
    );
    
    let result_3 = notification_manager.safe_broadcast(notification_3, None).await?;
    debug!("✅ Evento 3 enviado para {} clientes (deve ser 0 devido ao throttling)", result_3);
    
    // Aguardar cooldown
    info!("⏳ Aguardando cooldown de 2 segundos...");
    sleep(Duration::from_secs(2)).await;
    
    // Evento 4: Cliente A atualiza pedido #123 após cooldown
    info!("📝 Cliente A atualiza pedido #123 após cooldown");
    let notification_4 = create_notification(
        NotificationType::OrderStatusChanged,
        123,
        Some("PED-123".to_string()),
        Some(1),
        Some("Status atualizado para 'Expedição'".to_string()),
        Some("client_desktop_001".to_string()),
        false,
    );
    
    let result_4 = notification_manager.safe_broadcast(notification_4, None).await?;
    debug!("✅ Evento 4 enviado para {} clientes", result_4);
    
    Ok(())
}

/// Simula eventos após desconexão de um cliente
async fn simulate_events_after_disconnect(notification_manager: &NotificationManager) -> Result<(), String> {
    info!("🔄 Simulando eventos após desconexão...");
    
    // Evento 5: Cliente B atualiza status após desconexão do Cliente A
    info!("📝 Cliente B atualiza status após desconexão do Cliente A");
    let notification_5 = create_notification(
        NotificationType::OrderStatusChanged,
        789,
        Some("PED-789".to_string()),
        Some(2),
        Some("Status atualizado para 'Entregue'".to_string()),
        Some("client_mobile_002".to_string()),
        false,
    );
    
    let result_5 = notification_manager.safe_broadcast(notification_5, None).await?;
    debug!("✅ Evento 5 enviado para {} clientes (deve ser 1)", result_5);
    
    Ok(())
}

/// Simula heartbeat automático
pub async fn simulate_heartbeat(notification_manager: &NotificationManager) -> Result<(), String> {
    info!("💓 Simulando heartbeat automático...");
    
    let heartbeat_notification = create_notification(
        NotificationType::Heartbeat,
        0,
        None,
        None,
        Some("ping".to_string()),
        None,
        true,
    );
    
    let result = notification_manager.safe_broadcast(heartbeat_notification, None).await?;
    debug!("✅ Heartbeat enviado para {} clientes", result);
    
    Ok(())
}

/// Simula broadcast segmentado para clientes específicos
pub async fn simulate_segmented_broadcast(notification_manager: &NotificationManager) -> Result<(), String> {
    info!("🎯 Simulando broadcast segmentado...");
    
    let notification = create_notification(
        NotificationType::OrderStatusFlagsUpdated,
        999,
        Some("PED-999".to_string()),
        Some(1),
        Some("Flags de produção atualizadas".to_string()),
        None,
        false,
    );
    
    // Enviar apenas para cliente específico
    let target_clients = vec!["client_desktop_001".to_string()];
    let result = notification_manager.broadcast_to_clients(notification, target_clients).await?;
    debug!("✅ Broadcast segmentado enviado para {} clientes", result);
    
    Ok(())
}

/// Comando Tauri para executar a simulação
#[tauri::command]
pub async fn run_notification_simulation(app_handle: AppHandle) -> Result<String, String> {
    info!("🧪 Iniciando simulação de notificações...");
    
    // Executar simulação
    simulate_two_active_clients(&app_handle).await?;
    
    // Simular heartbeat
    let notification_manager = app_handle.state::<NotificationManager>();
    simulate_heartbeat(&notification_manager).await?;
    
    // Simular broadcast segmentado
    simulate_segmented_broadcast(&notification_manager).await?;
    
    Ok("✅ Simulação concluída com sucesso! Verifique os logs para ver o fluxo otimizado.".to_string())
}

