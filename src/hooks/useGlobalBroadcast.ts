import { useState, useEffect, useCallback, useRef } from 'react';
// import { invoke } from '@tauri-apps/api/core';
// import { listen } from '@tauri-apps/api/event';

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

  // Ref para o ID do cliente (evita re-renders e loops)
  const internalClientIdRef = useRef<string>(`client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Conectar ao sistema de notificações
  const subscribe = useCallback(async (clientId?: string) => {
    try {
      const id = clientId || internalClientIdRef.current;
      internalClientIdRef.current = id;

      setStatus(prev => ({
        ...prev,
        isConnected: false, // Mock: sempre desconectado
        clientId: id,
      }));

    } catch {
      // noop
    }
  }, []);

  // Desconectar do sistema de notificações
  const unsubscribe = useCallback(async () => {
    try {
      if (internalClientIdRef.current) {
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          clientId: '',
        }));

      }
    } catch {
      // noop
    }
  }, []);

  // Enviar heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      if (status.clientId) {
        // MOCK: Sem backend Rust
        // await invoke('send_heartbeat', { clientId: status.clientId });
        setStatus(prev => ({
          ...prev,
          lastHeartbeat: new Date(),
        }));
      }
    } catch {
      // noop
    }
  }, [status.clientId]);

  // Obter lista de clientes ativos
  const getActiveClients = useCallback(async (): Promise<string[]> => {
    try {
      // MOCK: Sem backend Rust
      // const clients = await invoke<string[]>('get_active_clients');
      const clients: string[] = [];
      setStatus(prev => ({
        ...prev,
        activeClients: clients,
      }));
      return clients;
    } catch (error) {

      return [];
    }
  }, []);

  // Broadcast de atualização de status
  const broadcastStatusUpdate = useCallback(async (
    _orderId: number,
    _orderNumero: string | null,
    _userId: number,
    _details: string
  ) => {
    try {
      // broadcast mock enviado
    } catch {
      // ignore
    }
  }, []);

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
  }, []); // Executar apenas uma vez no mount/unmount

  return {
    status,
    subscribe,
    unsubscribe,
    sendHeartbeat,
    getActiveClients,
    broadcastStatusUpdate,
  };
}
