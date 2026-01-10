import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useToast } from './use-toast';
import { ordersSocket, OrderEventMessage } from '@/lib/realtimeOrders';
import { NotificationManager } from './notificationManager';

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
  
  // Gerenciador inteligente de notificações
  const notificationManagerRef = useRef<NotificationManager | null>(null);
  
  // Inicializar gerenciador de notificações
  useEffect(() => {
    notificationManagerRef.current = new NotificationManager(toast);
    return () => {
      notificationManagerRef.current?.clear();
    };
  }, [toast]);

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

    // Filtrar notificações do próprio usuário (exceto delete que é sempre importante)
    if (
      extractedUserId !== undefined &&
      userId !== undefined &&
      extractedUserId === userId &&
      notification.notification_type !== NotificationType.OrderDeleted
    ) {
      console.log('🔇 Notificação do próprio usuário ignorada:', notification);
      // Ainda recarregar a lista, mas sem mostrar toast
      refreshOrders();
      return;
    }

    // Extrair informações adicionais do pedido para detalhes
    const statusDetails = extractStatusDetails(orderPayload);
    if (statusDetails) {
      notification.details = statusDetails;
    }

    // Log para debug
    console.log('✅ Notificação processada:', {
      type: notification.notification_type,
      order_id: notification.order_id,
      notification_user_id: notification.user_id,
      current_user_id: userId,
    });

    // Processar notificação usando o gerenciador inteligente
    notificationManagerRef.current?.processNotification(notification);

    // Sempre processar ações necessárias independente de mostrar toast
    if (notification.notification_type === NotificationType.OrderDeleted) {
      // Remover pedido da lista local quando deletado
      removeOrder(notification.order_id);
    } else {
      // Recarregar lista de pedidos para outras notificações
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
  // IMPORTANTE: não depender de isConnected aqui, senão ao conectar (isConnected=true)
  // o React reexecuta o effect e roda o cleanup, derrubando o WebSocket.
  useEffect(() => {
    if (sessionToken) {
      connect();
    } else {
      // Se perder token (logout), desconectar imediatamente
      disconnect();
    }

    // Cleanup ao desmontar ou quando sessionToken trocar
    return () => {
      disconnect();
    };
  }, [sessionToken, connect, disconnect]);

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
