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
    console.log('📨 Mensagem de notificação recebida:', {
      type: message.type,
      message_user_id: (message as Record<string, unknown>).user_id,
      message_username: (message as Record<string, unknown>).username,
      order: (message as Record<string, unknown>).order,
    });
    
    if (!message || !message.type) {
      return;
    }

    const orderPayload = (message as OrderEventMessage & { order?: Record<string, unknown> }).order;
    const orderId =
      parseOrderId(message.order_id) ??
      parseOrderId(orderPayload?.id) ??
      parseOrderId(orderPayload?.order_id);

    // Extrair user_id da mensagem (pode estar na raiz ou no order)
    const messageUserId = typeof (message as Record<string, unknown>).user_id === 'number'
      ? (message as Record<string, unknown>).user_id as number
      : undefined;
    const orderUserId = typeof orderPayload?.user_id === 'number'
      ? (orderPayload.user_id as number)
      : undefined;
    const extractedUserId: number | undefined = messageUserId ?? orderUserId;

    console.log('🔍 Extração de user_id:', {
      messageUserId,
      orderUserId,
      extractedUserId,
      currentUserId: userId,
    });

    const notification: OrderNotification = {
      notification_type: normalizeEventType(message.type),
      order_id: orderId ?? 0,
      order_numero: typeof orderPayload?.numero === 'string' ? orderPayload.numero : undefined,
      timestamp: new Date().toISOString(),
      user_id: extractedUserId,
      details: typeof message.message === 'string' ? message.message : undefined,
    };

    if (!notification.order_id) {
      console.warn('⚠️ Notificação recebida sem order_id válido:', message);
      return;
    }

    // IMPORTANTE:
    // Não filtrar por user_id aqui.
    // Em cenários onde múltiplos computadores usam o mesmo login, filtrar por user_id
    // faria os outros clientes ignorarem notificações legítimas.

    // Log para debug
    console.log('✅ Notificação será exibida:', {
      type: notification.notification_type,
      order_id: notification.order_id,
      notification_user_id: notification.user_id,
      current_user_id: userId,
      will_show: true,
    });

    // Extrair informações adicionais do pedido
    const clienteName = orderPayload?.cliente || orderPayload?.customer_name || 'Cliente';
    const statusInfo = orderPayload?.status ? `Status: ${orderPayload.status}` : '';
    const orderNum = notification.order_numero || notification.order_id;
    
    // Mostrar toast baseado no tipo de notificação com mais detalhes
    switch (notification.notification_type) {
      case NotificationType.OrderCreated:
        toast({
          title: "✨ Novo Pedido Criado",
          description: `Pedido #${orderNum}\n${clienteName}${statusInfo ? `\n${statusInfo}` : ''}`,
          variant: "success",
        });
        break;

      case NotificationType.OrderUpdated:
        toast({
          title: "📝 Pedido Atualizado",
          description: `Pedido #${orderNum}\n${clienteName}`,
          variant: "info",
        });
        break;

      case NotificationType.OrderDeleted:
        toast({
          title: "🗑️ Pedido Excluído",
          description: `Pedido #${orderNum}\n${clienteName}`,
          variant: "destructive",
        });
        // Remover pedido da lista local
        removeOrder(notification.order_id);
        break;

      case NotificationType.OrderStatusChanged: {
        // Extrair detalhes da mudança de status
        const statusDetails = extractStatusDetails(orderPayload);
        toast({
          title: "🔄 Status Atualizado",
          description: `Pedido #${orderNum}\n${clienteName}${statusDetails ? `\n${statusDetails}` : ''}`,
          variant: "warning",
        });
        break;
      }
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

    // REMOVIDO: ordersSocket.connect() - subscribe() já chama ensureConnection() internamente
    // Chamar connect() aqui força reconexões desnecessárias
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

// Função para extrair detalhes de mudanças de status
const extractStatusDetails = (orderPayload: Record<string, unknown> | undefined): string | null => {
  if (!orderPayload) return null;
  
  const changes: string[] = [];
  
  if (orderPayload.financeiro) changes.push('Financeiro ✓');
  if (orderPayload.conferencia) changes.push('Conferência ✓');
  if (orderPayload.sublimacao) changes.push('Sublimação ✓');
  if (orderPayload.costura) changes.push('Costura ✓');
  if (orderPayload.expedicao) changes.push('Expedição ✓');
  if (orderPayload.pronto) changes.push('Pronto ✓');
  
  if (orderPayload.status) {
    const statusMap: Record<string, string> = {
      'pendente': 'Pendente',
      'em_producao': 'Em Produção',
      'pronto': 'Pronto',
      'entregue': 'Entregue',
      'cancelado': 'Cancelado',
    };
    const statusStr = String(orderPayload.status);
    changes.push(`Status: ${statusMap[statusStr] || statusStr}`);
  }
  
  return changes.length > 0 ? changes.join(' • ') : null;
};
