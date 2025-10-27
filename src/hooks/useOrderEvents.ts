import { useEffect, useCallback, useRef } from 'react';
import { OrderWithItems } from '../types';
import { api } from '@/services/api';
import { getApiUrl } from '@/services/apiClient';

// ========================================
// HOOK PARA EVENTOS DE PEDIDOS EM TEMPO REAL
// ========================================

interface UseOrderEventsProps {
  onOrderCreated?: (orderId: number) => void;
  onOrderUpdated?: (orderId: number) => void;
  onOrderDeleted?: (orderId: number) => void;
  onOrderStatusUpdated?: (orderId: number) => void;
}

export const useOrderEvents = ({
  onOrderCreated,
  onOrderUpdated,
  onOrderDeleted,
  onOrderStatusUpdated,
}: UseOrderEventsProps = {}) => {
  const handlersRef = useRef({
    onOrderCreated,
    onOrderUpdated,
    onOrderDeleted,
    onOrderStatusUpdated,
  });

  useEffect(() => {
    handlersRef.current = {
      onOrderCreated,
      onOrderUpdated,
      onOrderDeleted,
      onOrderStatusUpdated,
    };
  }, [onOrderCreated, onOrderUpdated, onOrderDeleted, onOrderStatusUpdated]);

  useEffect(() => {
    const apiBase = getApiUrl();
    if (!apiBase) {
      console.warn('⚠️ API URL não configurada. Eventos em tempo real desabilitados.');
      return;
    }

    let socket: WebSocket | null = null;
    let shouldReconnect = true;
    const parsedUrl = new URL(apiBase);
    parsedUrl.protocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    parsedUrl.pathname = '/ws/orders';
    parsedUrl.search = '';
    parsedUrl.hash = '';
    const wsUrl = parsedUrl.toString();

    const connect = () => {
      console.log('🔌 Conectando ao WebSocket de pedidos em', wsUrl);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('✅ WebSocket conectado');
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket desconectado', event.reason || 'sem motivo');
        if (shouldReconnect) {
          setTimeout(connect, 2000);
        }
      };

      socket.onerror = (error) => {
        console.error('❌ Erro no WebSocket de pedidos:', error);
        socket?.close();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data ?? '{}');
          const orderId: number | undefined = data.order?.id ?? data.order_id;
          const type: string | undefined = data.type;

          if (!type) {
            return;
          }

          const { onOrderCreated, onOrderUpdated, onOrderDeleted, onOrderStatusUpdated } = handlersRef.current;

          if ((type === 'order_created' || type === 'order_updated') && orderId && onOrderUpdated) {
            onOrderUpdated(orderId);
          }

          if (type === 'order_created' && orderId && onOrderCreated) {
            onOrderCreated(orderId);
          }

          if (type === 'order_deleted' && orderId && onOrderDeleted) {
            onOrderDeleted(orderId);
          }

          if (type === 'order_status_updated' && orderId && onOrderStatusUpdated) {
            onOrderStatusUpdated(orderId);
          }
        } catch (error) {
          console.error('❌ Erro ao processar mensagem do WebSocket:', error);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      socket?.close();
    };
  }, []);
};

// ========================================
// HOOK SIMPLIFICADO PARA SINCRONIZAÇÃO AUTOMÁTICA
// ========================================

interface UseOrderAutoSyncProps {
  orders: OrderWithItems[];
  setOrders: (orders: OrderWithItems[]) => void;
  removeOrder: (orderId: number) => void;
}

export const useOrderAutoSync = ({ orders, setOrders, removeOrder }: UseOrderAutoSyncProps) => {
  const handleOrderCreated = useCallback(
    async (orderId: number) => {
      try {
        const newOrder = await api.getOrderById(orderId);
        const exists = orders.some((order) => order.id === newOrder.id);
        if (exists) {
          return;
        }
        setOrders([newOrder, ...orders]);
      } catch (error) {
        console.error('❌ Erro ao sincronizar pedido criado:', error);
      }
    },
    [orders, setOrders],
  );

  const handleOrderUpdated = useCallback(
    async (orderId: number) => {
      try {
        const updatedOrder = await api.getOrderById(orderId);
        const updated = orders.map((order) => (order.id === orderId ? updatedOrder : order));
        setOrders(updated);
      } catch (error) {
        console.error('❌ Erro ao sincronizar pedido atualizado:', error);
      }
    },
    [orders, setOrders],
  );

  const handleOrderDeleted = useCallback(
    (orderId: number) => {
      removeOrder(orderId);
    },
    [removeOrder],
  );

  const handleOrderStatusUpdated = useCallback(
    async (orderId: number) => {
      try {
        const updatedOrder = await api.getOrderById(orderId);
        const updated = orders.map((order) => (order.id === orderId ? updatedOrder : order));
        setOrders(updated);
      } catch (error) {
        console.error('❌ Erro ao sincronizar status do pedido:', error);
      }
    },
    [orders, setOrders],
  );

  useOrderEvents({
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: handleOrderUpdated,
    onOrderDeleted: handleOrderDeleted,
    onOrderStatusUpdated: handleOrderStatusUpdated,
  });

  return {
    handleOrderCreated,
    handleOrderUpdated,
    handleOrderDeleted,
    handleOrderStatusUpdated,
  };
};
