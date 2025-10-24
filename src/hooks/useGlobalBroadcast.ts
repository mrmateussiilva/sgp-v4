import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

// Tipos para o sistema de broadcast global
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

export interface BroadcastStatus {
  isConnected: boolean;
  activeClients: string[];
  lastHeartbeat: Date | null;
  clientId: string;
}

export interface UseGlobalBroadcastReturn {
  status: BroadcastStatus;
  subscribe: (clientId: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendHeartbeat: () => Promise<void>;
  getActiveClients: () => Promise<string[]>;
  broadcastStatusUpdate: (orderId: number, orderNumero: string | null, userId: number, details: string) => Promise<void>;
}

export function useGlobalBroadcast(): UseGlobalBroadcastReturn {
  const [status, setStatus] = useState<BroadcastStatus>({
    isConnected: false,
    activeClients: [],
    lastHeartbeat: null,
    clientId: '',
  });

  // Gerar ID único para este cliente
  const generateClientId = useCallback(() => {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Conectar ao sistema de notificações
  const subscribe = useCallback(async (clientId?: string) => {
    try {
      const id = clientId || generateClientId();
      
      await invoke('subscribe_to_notifications', { clientId: id });
      
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        clientId: id,
      }));
      
      console.log('✅ Conectado ao sistema de broadcast global');
    } catch (error) {
      console.error('❌ Erro ao conectar ao broadcast:', error);
    }
  }, [generateClientId]);

  // Desconectar do sistema de notificações
  const unsubscribe = useCallback(async () => {
    try {
      if (status.clientId) {
        await invoke('unsubscribe_from_notifications', { clientId: status.clientId });
        
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          clientId: '',
        }));
        
        console.log('🔌 Desconectado do sistema de broadcast global');
      }
    } catch (error) {
      console.error('❌ Erro ao desconectar do broadcast:', error);
    }
  }, [status.clientId]);

  // Enviar heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      if (status.clientId) {
        await invoke('send_heartbeat', { clientId: status.clientId });
        setStatus(prev => ({
          ...prev,
          lastHeartbeat: new Date(),
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao enviar heartbeat:', error);
    }
  }, [status.clientId]);

  // Obter lista de clientes ativos
  const getActiveClients = useCallback(async (): Promise<string[]> => {
    try {
      const clients = await invoke<string[]>('get_active_clients');
      setStatus(prev => ({
        ...prev,
        activeClients: clients,
      }));
      return clients;
    } catch (error) {
      console.error('❌ Erro ao obter clientes ativos:', error);
      return [];
    }
  }, []);

  // Broadcast de atualização de status
  const broadcastStatusUpdate = useCallback(async (
    orderId: number,
    orderNumero: string | null,
    userId: number,
    details: string
  ) => {
    try {
      await invoke('broadcast_status_update', {
        orderId,
        orderNumero,
        userId,
        statusDetails: details,
        clientId: status.clientId,
      });
      
      console.log('🌐 Broadcast de status enviado:', { orderId, details });
    } catch (error) {
      console.error('❌ Erro no broadcast de status:', error);
    }
  }, [status.clientId]);

  // Escutar notificações globais
  useEffect(() => {
    if (!status.isConnected) return;

    const setupNotificationListener = async () => {
      try {
        // Escutar eventos de notificação
        const unlisten = await listen<OrderNotification>('order_notification', (event) => {
          const notification = event.payload;
          
          console.log('📨 Notificação global recebida:', notification);
          
          // Atualizar heartbeat se for uma notificação de heartbeat
          if (notification.notification_type === 'Heartbeat') {
            setStatus(prev => ({
              ...prev,
              lastHeartbeat: new Date(),
            }));
          }
          
          // Atualizar lista de clientes se necessário
          if (notification.notification_type === 'ClientConnected' || 
              notification.notification_type === 'ClientDisconnected') {
            getActiveClients();
          }
        });

        return unlisten;
      } catch (error) {
        console.error('❌ Erro ao configurar listener de notificações:', error);
        return () => {};
      }
    };

    let unlisten: (() => void) | undefined;
    
    setupNotificationListener().then((unlistenFn) => {
      unlisten = unlistenFn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [status.isConnected, getActiveClients]);

  // Heartbeat automático a cada 30 segundos
  useEffect(() => {
    if (!status.isConnected) return;

    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 30000); // 30 segundos

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [status.isConnected, sendHeartbeat]);

  // Conectar automaticamente quando o componente monta
  useEffect(() => {
    subscribe();
    
    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  return {
    status,
    subscribe,
    unsubscribe,
    sendHeartbeat,
    getActiveClients,
    broadcastStatusUpdate,
  };
}

