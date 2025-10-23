import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useToast } from './use-toast';

// ========================================
// TIPOS DE NOTIFICAÇÃO
// ========================================

export enum NotificationType {
  OrderCreated = 'OrderCreated',
  OrderUpdated = 'OrderUpdated',
  OrderDeleted = 'OrderDeleted',
  OrderStatusChanged = 'OrderStatusChanged',
}

export interface OrderNotification {
  notification_type: NotificationType;
  order_id: number;
  order_numero?: string;
  timestamp: string;
  user_id?: number;
  details?: string;
}

// ========================================
// HOOK DE NOTIFICAÇÕES
// ========================================

export const useRealtimeNotifications = () => {
  const { sessionToken, userId } = useAuthStore();
  const { removeOrder } = useOrderStore();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const clientIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Gerar ID único para este cliente
  const generateClientId = () => {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Conectar às notificações
  const connect = async () => {
    if (!sessionToken || isConnected) {
      return;
    }

    try {
      const clientId = generateClientId();
      clientIdRef.current = clientId;

      // Inscrever-se nas notificações
      await invoke('subscribe_to_notifications', { clientId });
      
      // Escutar eventos de notificação
      const unsubscribe = await listen<OrderNotification>(
        `order-notification-${clientId}`,
        (event) => {
          handleNotification(event.payload);
        }
      );

      unsubscribeRef.current = unsubscribe;
      setIsConnected(true);

      // Atualizar contador de subscribers
      updateSubscriberCount();

      console.log('✅ Conectado às notificações em tempo real');
    } catch (error) {
      console.error('❌ Erro ao conectar às notificações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível conectar às notificações em tempo real",
        variant: "destructive",
      });
    }
  };

  // Desconectar das notificações
  const disconnect = async () => {
    if (!clientIdRef.current || !isConnected) {
      return;
    }

    try {
      // Cancelar inscrição
      await invoke('unsubscribe_from_notifications', { 
        clientId: clientIdRef.current 
      });

      // Remover listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setIsConnected(false);
      clientIdRef.current = null;

      console.log('🔌 Desconectado das notificações em tempo real');
    } catch (error) {
      console.error('❌ Erro ao desconectar das notificações:', error);
    }
  };

  // Atualizar contador de subscribers
  const updateSubscriberCount = async () => {
    try {
      const count = await invoke<number>('get_notification_subscriber_count');
      setSubscriberCount(count);
    } catch (error) {
      console.error('Erro ao obter contador de subscribers:', error);
    }
  };

  // Processar notificação recebida
  const handleNotification = (notification: OrderNotification) => {
    console.log('📨 Notificação recebida:', notification);

    // Não mostrar notificação para ações do próprio usuário
    if (notification.user_id === userId) {
      return;
    }

    // Mostrar toast baseado no tipo de notificação
    switch (notification.notification_type) {
      case NotificationType.OrderCreated:
        toast({
          title: "Novo Pedido",
          description: `Pedido #${notification.order_numero || notification.order_id} foi criado`,
        });
        // Recarregar lista de pedidos
        refreshOrders();
        break;

      case NotificationType.OrderUpdated:
        toast({
          title: "Pedido Atualizado",
          description: `Pedido #${notification.order_numero || notification.order_id} foi atualizado`,
        });
        // Recarregar lista de pedidos
        refreshOrders();
        break;

      case NotificationType.OrderDeleted:
        toast({
          title: "Pedido Excluído",
          description: `Pedido #${notification.order_numero || notification.order_id} foi excluído`,
        });
        // Remover pedido da lista local
        removeOrder(notification.order_id);
        break;

      case NotificationType.OrderStatusChanged:
        toast({
          title: "Status Atualizado",
          description: `Status do pedido #${notification.order_numero || notification.order_id} foi alterado`,
        });
        // Recarregar lista de pedidos para obter status atualizado
        refreshOrders();
        break;
    }
  };

  // Recarregar lista de pedidos
  const refreshOrders = async () => {
    try {
      // Aqui você pode implementar a lógica para recarregar os pedidos
      // Por exemplo, chamando a função loadOrders do OrderList
      console.log('🔄 Recarregando lista de pedidos...');
      
      // Disparar evento customizado para que os componentes escutem
      window.dispatchEvent(new CustomEvent('orders-refresh-requested'));
    } catch (error) {
      console.error('Erro ao recarregar pedidos:', error);
    }
  };

  // Conectar automaticamente quando o token de sessão estiver disponível
  useEffect(() => {
    if (sessionToken && !isConnected) {
      connect();
    }
  }, [sessionToken]);

  // Desconectar quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  // Reconectar quando o token mudar
  useEffect(() => {
    if (sessionToken && isConnected) {
      disconnect().then(() => {
        setTimeout(() => connect(), 1000);
      });
    }
  }, [sessionToken]);

  return {
    isConnected,
    subscriberCount,
    connect,
    disconnect,
    updateSubscriberCount,
  };
};

// ========================================
// HOOK SIMPLIFICADO PARA COMPONENTES
// ========================================

export const useOrderRefresh = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleRefreshRequest = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('orders-refresh-requested', handleRefreshRequest);
    
    return () => {
      window.removeEventListener('orders-refresh-requested', handleRefreshRequest);
    };
  }, []);

  return refreshTrigger;
};
