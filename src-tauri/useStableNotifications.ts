import { useEffect, useRef, useCallback } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
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

// Hook otimizado para evitar reconexões constantes
export function useStableNotifications(clientId: string) {
  const isConnected = useRef(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const eventName = useRef<string>('');
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Função para conectar ao sistema de notificações
  const connect = useCallback(async () => {
    // Evitar múltiplas conexões simultâneas
    if (isConnected.current) {
      console.log(`Cliente ${clientId} já está conectado, ignorando nova tentativa`);
      return;
    }

    try {
      // Tentar inscrever no sistema de notificações
      const result = await invoke<string>('subscribe_to_notifications', { clientId });
      console.log(`Tentativa de conexão: ${result}`);
      
      // Se a conexão foi bem-sucedida ou o cliente já estava conectado
      if (result.includes('conectado') || result.includes('inscrito')) {
        isConnected.current = true;
        reconnectAttempts.current = 0;
        
        // Definir nome do evento específico para este cliente
        eventName.current = `order-notification-${clientId}`;
        
        // Configurar listener único para este cliente (apenas se não existir)
        if (!unlistenRef.current) {
          const unlisten = await listen<OrderNotification>(eventName.current, (event) => {
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
          
          unlistenRef.current = unlisten;
        }
      } else {
        console.warn(`Falha na conexão: ${result}`);
        reconnectAttempts.current++;
      }
      
    } catch (error) {
      console.error('Erro ao conectar ao sistema de notificações:', error);
      reconnectAttempts.current++;
      
      // Tentar reconectar apenas se não excedeu o limite
      if (reconnectAttempts.current < maxReconnectAttempts) {
        console.log(`Tentando reconectar (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
        setTimeout(() => {
          connect();
        }, 2000); // Aguardar 2 segundos antes de tentar novamente
      } else {
        console.error('Máximo de tentativas de reconexão atingido');
      }
    }
  }, [clientId]);

  // Função para desconectar
  const disconnect = useCallback(async () => {
    if (!isConnected.current) {
      return;
    }

    try {
      // Cancelar inscrição no backend
      await invoke<string>('unsubscribe_from_notifications', { clientId });
      
      // Remover listener do frontend
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      
      isConnected.current = false;
      console.log(`Cliente ${clientId} desconectado do sistema de notificações`);
      
    } catch (error) {
      console.error('Erro ao desconectar do sistema de notificações:', error);
    }
  }, [clientId]);

  // Função para enviar heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!isConnected.current) {
      return;
    }

    try {
      await invoke<string>('send_heartbeat', { clientId });
    } catch (error) {
      console.error('Erro ao enviar heartbeat:', error);
      // Se o heartbeat falhar, tentar reconectar
      if (reconnectAttempts.current < maxReconnectAttempts) {
        console.log('Heartbeat falhou, tentando reconectar...');
        isConnected.current = false;
        connect();
      }
    }
  }, [clientId, connect]);

  // Conectar automaticamente quando o componente monta
  useEffect(() => {
    // Aguardar um pouco antes de conectar para evitar conexões muito rápidas
    const connectTimeout = setTimeout(() => {
      connect();
    }, 100);

    // Cleanup quando o componente desmonta
    return () => {
      clearTimeout(connectTimeout);
      disconnect();
    };
  }, [connect, disconnect]);

  // Enviar heartbeat a cada 30 segundos
  useEffect(() => {
    if (!isConnected.current) {
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
    isConnected: isConnected.current,
    connect,
    disconnect,
    sendHeartbeat,
  };
}

// Exemplo de uso em um componente
export function StableNotificationExample() {
  // Gerar um ID único para o cliente (apenas uma vez)
  const clientId = useRef('client_' + Math.random().toString(36).substr(2, 9)).current;
  const { isConnected, connect, disconnect } = useStableNotifications(clientId);

  const handleTestConnection = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  return (
    <div>
      <h3>Sistema de Notificações Estável</h3>
      <p>Status: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      <p>Client ID: {clientId}</p>
      
      <button onClick={handleTestConnection}>
        {isConnected ? 'Desconectar' : 'Conectar'}
      </button>
    </div>
  );
}

// Hook para uso global (recomendado)
export function useGlobalStableNotifications() {
  // ID único global para toda a aplicação
  const globalClientId = useRef('global_client_' + Math.random().toString(36).substr(2, 9)).current;
  
  return useStableNotifications(globalClientId);
}

