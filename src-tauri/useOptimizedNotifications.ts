import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';

// Tipos para as notificações
export interface OrderNotification {
  notification_type: 'OrderCreated' | 'OrderUpdated' | 'OrderDeleted' | 'OrderStatusChanged' | 'OrderStatusFlagsUpdated' | 'Heartbeat' | 'ClientConnected' | 'ClientDisconnected';
  order_id: number;
  order_numero?: string;
  timestamp: string;
  user_id?: number;
  details?: string;
  client_id?: string;
  broadcast_to_all: boolean;
}

// Hook otimizado para notificações
export function useOptimizedNotifications(clientId: string) {
  const isSubscribed = useRef(false);
  const eventName = useRef<string>('');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Função para conectar ao sistema de notificações
  const connect = useCallback(async () => {
    if (isSubscribed.current) {
      console.log(`Cliente ${clientId} já está conectado`);
      return;
    }

    try {
      // Inscrever no sistema de notificações
      const result = await invoke<string>('subscribe_to_notifications', { clientId });
      console.log(`Conectado ao sistema de notificações: ${result}`);
      
      // Definir nome do evento específico para este cliente
      eventName.current = `order-notification-${clientId}`;
      
      // Configurar listener único para este cliente
      const unsubscribe = await listen<OrderNotification>(eventName.current, (event) => {
        const notification = event.payload;
        
        // Logs reduzidos - apenas para eventos importantes
        switch (notification.notification_type) {
          case 'OrderStatusChanged':
          case 'OrderStatusFlagsUpdated':
            console.log(`📡 Evento crítico recebido:`, notification);
            // Aqui você pode disparar callbacks específicos ou atualizar estado
            break;
          case 'Heartbeat':
            // Não logar heartbeats para reduzir spam
            break;
          default:
            console.log(`📡 Evento recebido:`, notification.notification_type);
        }
      });
      
      unsubscribeRef.current = unsubscribe;
      isSubscribed.current = true;
      
    } catch (error) {
      console.error('Erro ao conectar ao sistema de notificações:', error);
    }
  }, [clientId]);

  // Função para desconectar
  const disconnect = useCallback(async () => {
    if (!isSubscribed.current) {
      return;
    }

    try {
      // Cancelar inscrição no backend
      await invoke<string>('unsubscribe_from_notifications', { clientId });
      
      // Remover listener do frontend
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      isSubscribed.current = false;
      console.log(`Cliente ${clientId} desconectado do sistema de notificações`);
      
    } catch (error) {
      console.error('Erro ao desconectar do sistema de notificações:', error);
    }
  }, [clientId]);

  // Função para enviar heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!isSubscribed.current) {
      return;
    }

    try {
      await invoke<string>('send_heartbeat', { clientId });
    } catch (error) {
      console.error('Erro ao enviar heartbeat:', error);
    }
  }, [clientId]);

  // Conectar automaticamente quando o componente monta
  useEffect(() => {
    connect();

    // Cleanup quando o componente desmonta
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Enviar heartbeat a cada 30 segundos
  useEffect(() => {
    if (!isSubscribed.current) {
      return;
    }

    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 30000); // 30 segundos

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sendHeartbeat]);

  return {
    isConnected: isSubscribed.current,
    connect,
    disconnect,
    sendHeartbeat,
  };
}

// Hook para broadcast segmentado (opcional)
export function useBroadcastToClients() {
  const broadcastToSpecificClients = useCallback(async (
    notificationType: string,
    orderId: number,
    orderNumero?: string,
    userId?: number,
    details?: string,
    clientIds: string[] = []
  ) => {
    try {
      const result = await invoke<number>('broadcast_to_specific_clients', {
        notificationType,
        orderId,
        orderNumero,
        userId,
        details,
        clientIds,
      });
      
      console.log(`Broadcast segmentado enviado para ${result} clientes`);
      return result;
    } catch (error) {
      console.error('Erro no broadcast segmentado:', error);
      throw error;
    }
  }, []);

  return { broadcastToSpecificClients };
}

// Exemplo de uso em um componente
export function NotificationExample() {
  const clientId = 'client_' + Math.random().toString(36).substr(2, 9);
  const { isConnected, connect, disconnect } = useOptimizedNotifications(clientId);
  const { broadcastToSpecificClients } = useBroadcastToClients();

  const handleTestBroadcast = async () => {
    try {
      await broadcastToSpecificClients(
        'OrderStatusChanged',
        123,
        'PED-001',
        1,
        'Status atualizado para pronto',
        ['client1', 'client2'] // Apenas para clientes específicos
      );
    } catch (error) {
      console.error('Erro no teste de broadcast:', error);
    }
  };

  return (
    <div>
      <h3>Sistema de Notificações Otimizado</h3>
      <p>Status: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      <p>Client ID: {clientId}</p>
      
      <button onClick={connect} disabled={isConnected}>
        Conectar
      </button>
      
      <button onClick={disconnect} disabled={!isConnected}>
        Desconectar
      </button>
      
      <button onClick={handleTestBroadcast} disabled={!isConnected}>
        Testar Broadcast Segmentado
      </button>
    </div>
  );
}

