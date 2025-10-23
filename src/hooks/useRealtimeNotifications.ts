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
    if (!sessionToken || isConnected || clientIdRef.current) {
      console.log('🚫 Conexão ignorada - já conectado ou sem token');
      return;
    }

    try {
      const clientId = generateClientId();
      clientIdRef.current = clientId;

      console.log('🔌 Tentando conectar com ID:', clientId);

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
      console.log('🚫 Desconexão ignorada - não conectado');
      return;
    }

    try {
      console.log('🔌 Desconectando cliente:', clientIdRef.current);

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

      console.log('✅ Desconectado das notificações em tempo real');
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
  };

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
      if (isConnected) {
        disconnect();
      }
    };
  }, [sessionToken, isConnected]); // Dependências corretas

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
