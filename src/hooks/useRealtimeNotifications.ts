import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useToast } from './use-toast';
import { ordersSocket, OrderEventMessage } from '@/lib/realtimeOrders';

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
  const subscriptionRef = useRef<(() => void) | null>(null);
  const statusSubscriptionRef = useRef<(() => void) | null>(null);

  const updateStatusFromManager = useCallback(() => {
    const status = ordersSocket.getCurrentStatus();
    setIsConnected(status.isConnected);
    setSubscriberCount(ordersSocket.getListenerCount());
  }, []);

  const parseOrderId = useCallback((value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }, []);

  const handleNotification = useCallback((message: OrderEventMessage) => {
    if (!message || !message.type) {
      return;
    }

    const orderPayload = (message as any).order;
    const orderId =
      parseOrderId(message.order_id) ??
      parseOrderId(orderPayload?.id) ??
      parseOrderId(orderPayload?.order_id);

    const notification: OrderNotification = {
      notification_type: normalizeEventType(message.type),
      order_id: orderId ?? 0,
      order_numero: typeof orderPayload?.numero === 'string' ? orderPayload.numero : undefined,
      timestamp: new Date().toISOString(),
      user_id: typeof orderPayload?.user_id === 'number'
        ? orderPayload.user_id
        : undefined,
      details: typeof message.message === 'string' ? message.message : undefined,
    };

    if (!notification.order_id) {
      console.warn('⚠️ Notificação recebida sem order_id válido:', message);
      return;
    }

    // Não mostrar notificação para ações do próprio usuário
    if (notification.user_id === userId) {
      console.log('🚫 Notificação ignorada (próprio usuário)');
      return;
    }

    // Mostrar toast baseado no tipo de notificação
    switch (notification.notification_type) {
      case NotificationType.OrderCreated:
        toast({
          title: "Novo Pedido",
          description: `Pedido #${notification.order_numero || notification.order_id} foi criado`,
        });
        break;

      case NotificationType.OrderUpdated:
        toast({
          title: "Pedido Atualizado",
          description: `Pedido #${notification.order_numero || notification.order_id} foi atualizado`,
        });
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
        break;
    }

    // Sempre recarregar lista de pedidos para qualquer notificação (exceto delete)
    if (notification.notification_type !== NotificationType.OrderDeleted) {
      refreshOrders();
    }
  }, [parseOrderId, removeOrder, toast, userId]);

  const connect = useCallback(() => {
    if (subscriptionRef.current) {
      return;
    }

    subscriptionRef.current = ordersSocket.subscribe(handleNotification);
    statusSubscriptionRef.current = ordersSocket.onStatus((status) => {
      setIsConnected(status.isConnected);
      setSubscriberCount(ordersSocket.getListenerCount());
    });

    ordersSocket.connect();
    updateStatusFromManager();
  }, [handleNotification, updateStatusFromManager]);

  const disconnect = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
    if (statusSubscriptionRef.current) {
      statusSubscriptionRef.current();
      statusSubscriptionRef.current = null;
    }
    updateStatusFromManager();
  }, [updateStatusFromManager]);

  const updateSubscriberCount = useCallback(() => {
    setSubscriberCount(ordersSocket.getListenerCount());
  }, []);

  // Recarregar lista de pedidos
  const refreshOrders = async () => {
    try {
      console.log('🔄 Disparando evento de refresh de pedidos...');
      
      // Disparar evento customizado para que os componentes escutem
      window.dispatchEvent(new CustomEvent('orders-refresh-requested', {
        detail: { timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Erro ao recarregar pedidos:', error);
    }
  };

  // Conectar automaticamente quando o token de sessão estiver disponível
  useEffect(() => {
    if (sessionToken && !isConnected) {
      connect();
    }
    
    // Cleanup ao desmontar
    return () => {
      disconnect();
    };
  }, [sessionToken, connect, disconnect, isConnected]);

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
    const handleRefreshRequest = (event: CustomEvent) => {
      console.log('🔄 Evento de refresh recebido:', event.detail);
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('orders-refresh-requested', handleRefreshRequest as EventListener);
    
    return () => {
      window.removeEventListener('orders-refresh-requested', handleRefreshRequest as EventListener);
    };
  }, []);

  return refreshTrigger;
};

const normalizeEventType = (eventType: string): NotificationType => {
  switch (eventType) {
    case 'order_created':
      return NotificationType.OrderCreated;
    case 'order_deleted':
      return NotificationType.OrderDeleted;
    case 'order_status_updated':
      return NotificationType.OrderStatusChanged;
    default:
      return NotificationType.OrderUpdated;
  }
};
