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
      console.log('📡 [useOrderEvents] Evento WebSocket recebido:', {
        type: message.type,
        order_id: message.order_id,
        has_order: !!(message as any).order,
        full_message: message,
      });
      
      const type = message.type;
      if (!type) {
        console.warn('⚠️ [useOrderEvents] Evento sem tipo:', message);
        return;
      }

      const orderPayload = (message as any).order;
      const orderId =
        parseOrderId(message.order_id) ??
        parseOrderId(orderPayload?.id) ??
        parseOrderId(orderPayload?.order_id);

      console.log('🔍 [useOrderEvents] OrderId extraído:', {
        from_message: message.order_id,
        from_order_payload: orderPayload?.id,
        final_orderId: orderId,
      });

      const { onOrderCreated, onOrderUpdated, onOrderDeleted, onOrderStatusUpdated } = handlersRef.current;

      if (!orderId) {
        console.warn('⚠️ [useOrderEvents] Evento recebido sem order_id rastreável:', message);
        return; // Não processar se não tiver orderId
      }
      
      console.log('✅ [useOrderEvents] Handlers disponíveis:', {
        onOrderCreated: !!onOrderCreated,
        onOrderUpdated: !!onOrderUpdated,
        onOrderDeleted: !!onOrderDeleted,
        onOrderStatusUpdated: !!onOrderStatusUpdated,
      });

      // Processar eventos na ordem correta para evitar conflitos
      if (type === 'order_created' && orderId) {
        if (onOrderCreated) {
          onOrderCreated(orderId);
        }
        // order_created também dispara onOrderUpdated
        if (onOrderUpdated) {
          onOrderUpdated(orderId);
        }
      } else if (type === 'order_status_updated' && orderId) {
        // order_status_updated tem prioridade e dispara ambos os handlers
        if (onOrderStatusUpdated) {
          console.log('🔄 Chamando onOrderStatusUpdated para pedido:', orderId);
          onOrderStatusUpdated(orderId);
        }
        // Também disparar onOrderUpdated para garantir atualização
        if (onOrderUpdated) {
          console.log('🔄 Chamando onOrderUpdated para pedido:', orderId);
          onOrderUpdated(orderId);
        }
      } else if (type === 'order_updated' && orderId && onOrderUpdated) {
        console.log('🔄 Chamando onOrderUpdated para pedido:', orderId);
        onOrderUpdated(orderId);
      }

      if (type === 'order_deleted' && orderId && onOrderDeleted) {
        onOrderDeleted(orderId);
      }
    };

    // subscribe() já chama ensureConnection() internamente, não precisa chamar connect() novamente
    const unsubscribe = ordersSocket.subscribe(handleMessage);

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
  setOrders: (orders: OrderWithItems[] | ((prev: OrderWithItems[]) => OrderWithItems[])) => void;
  removeOrder: (orderId: number) => void;
}

export const useOrderAutoSync = ({ orders, setOrders, removeOrder }: UseOrderAutoSyncProps) => {
  // Usar ref para sempre ter acesso ao estado mais recente (evita closure stale)
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const handleOrderCreated = useCallback(
    async (orderId: number) => {
      try {
        console.log('🆕 [useOrderAutoSync] Pedido criado, buscando dados:', orderId);
        const newOrder = await api.getOrderById(orderId);
        // Usar função de atualização do Zustand para garantir que pega o estado mais recente
        setOrders((currentOrders) => {
          const exists = currentOrders.some((order) => order.id === newOrder.id);
          if (exists) {
            console.log('⚠️ [useOrderAutoSync] Pedido já existe na lista, ignorando');
            return currentOrders;
          }
          console.log('✅ [useOrderAutoSync] Adicionando novo pedido à lista');
          return [newOrder, ...currentOrders];
        });
      } catch (error) {
        console.error('❌ Erro ao sincronizar pedido criado:', error);
      }
    },
    [setOrders],
  );

  const handleOrderUpdated = useCallback(
    async (orderId: number) => {
      try {
        console.log('🔄 [useOrderAutoSync] handleOrderUpdated chamado para pedido:', orderId);
        const updatedOrder = await api.getOrderById(orderId);
        // Usar função de atualização do Zustand para garantir que pega o estado mais recente
        setOrders((currentOrders) => {
          const oldOrder = currentOrders.find(o => o.id === orderId);
          console.log('📦 [useOrderAutoSync] Comparando pedidos:', {
            orderId,
            oldStatus: oldOrder?.status,
            newStatus: updatedOrder.status,
            oldFinanceiro: oldOrder?.financeiro,
            newFinanceiro: updatedOrder.financeiro,
            oldConferencia: oldOrder?.conferencia,
            newConferencia: updatedOrder.conferencia,
          });
          const updated = currentOrders.map((order) => (order.id === orderId ? updatedOrder : order));
          console.log('✅ [useOrderAutoSync] Lista atualizada:', {
            orderId,
            totalOrders: updated.length,
            updated: updated.find(o => o.id === orderId),
          });
          return updated;
        });
      } catch (error) {
        console.error('❌ Erro ao sincronizar pedido atualizado:', error);
      }
    },
    [setOrders],
  );

  const handleOrderDeleted = useCallback(
    (orderId: number) => {
      console.log('🗑️ [useOrderAutoSync] Removendo pedido:', orderId);
      removeOrder(orderId);
    },
    [removeOrder],
  );

  const handleOrderStatusUpdated = useCallback(
    async (orderId: number) => {
      try {
        console.log('🔄 [useOrderAutoSync] handleOrderStatusUpdated chamado para pedido:', orderId);
        const updatedOrder = await api.getOrderById(orderId);
        // Usar função de atualização do Zustand para garantir que pega o estado mais recente
        setOrders((currentOrders) => {
          const oldOrder = currentOrders.find(o => o.id === orderId);
          console.log('📦 [useOrderAutoSync] Pedido atualizado recebido:', {
            id: updatedOrder.id,
            status: updatedOrder.status,
            financeiro: updatedOrder.financeiro,
            conferencia: updatedOrder.conferencia,
            sublimacao: updatedOrder.sublimacao,
            costura: updatedOrder.costura,
            expedicao: updatedOrder.expedicao,
            oldStatus: oldOrder?.status,
            oldFinanceiro: oldOrder?.financeiro,
            oldConferencia: oldOrder?.conferencia,
          });
          const updated = currentOrders.map((order) => (order.id === orderId ? updatedOrder : order));
          console.log('✅ [useOrderAutoSync] Atualizando lista de pedidos:', {
            orderId,
            totalOrders: updated.length,
            oldStatus: oldOrder?.status,
            newStatus: updatedOrder.status,
            willUpdate: oldOrder?.id === orderId,
          });
          return updated;
        });
      } catch (error) {
        console.error('❌ Erro ao sincronizar status do pedido:', error);
      }
    },
    [setOrders],
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
