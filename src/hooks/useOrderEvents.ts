import { useEffect, useCallback, useRef } from 'react';
import { OrderWithItems } from '../types';
import { api } from '@/services/api';
import { ordersSocket, OrderEventMessage } from '@/lib/realtimeOrders';

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
    const parseOrderId = (value: unknown): number | undefined => {
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
    };

    const handleMessage = (message: OrderEventMessage) => {
      const type = message.type;
      if (!type) {
        return;
      }

      const orderPayload = (message as any).order;
      const orderId =
        parseOrderId(message.order_id) ??
        parseOrderId(orderPayload?.id) ??
        parseOrderId(orderPayload?.order_id);

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
    };

    const unsubscribe = ordersSocket.subscribe(handleMessage);
    ordersSocket.connect();

    return () => {
      unsubscribe();
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
