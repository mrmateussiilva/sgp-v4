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
      // Type guard para acessar propriedades dinâmicas
      const messageWithOrder = message as OrderEventMessage & { order?: unknown; pedido_id?: number };
      const orderPayload = messageWithOrder.order as { id?: number; order_id?: number; pedido_id?: number } | undefined;
      
      console.log('📡 [useOrderEvents] Evento WebSocket recebido:', {
        type: message.type,
        order_id: message.order_id,
        has_order: !!orderPayload,
        full_message: message,
      });
      
      const type = message.type;
      if (!type) {
        console.warn('⚠️ [useOrderEvents] Evento sem tipo:', message);
        return;
      }

      // Tentar extrair order_id de múltiplas fontes possíveis
      const orderId =
        parseOrderId(message.order_id) ??
        parseOrderId(messageWithOrder.pedido_id) ??
        parseOrderId(orderPayload?.id) ??
        parseOrderId(orderPayload?.order_id) ??
        parseOrderId(orderPayload?.pedido_id);

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
  updateOrder: (order: OrderWithItems) => void;
  loadOrders?: () => Promise<void>;
}

export const useOrderAutoSync = ({ orders, setOrders, removeOrder, updateOrder, loadOrders }: UseOrderAutoSyncProps) => {
  // Usar ref para sempre ter acesso ao estado mais recente (evita closure stale)
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  
  // Usar ref para loadOrders para evitar recriação de callbacks quando loadOrders muda
  // Isso previne múltiplas assinaturas WebSocket
  const loadOrdersRef = useRef(loadOrders);
  useEffect(() => {
    loadOrdersRef.current = loadOrders;
  }, [loadOrders]);

  const handleOrderCreated = useCallback(
    async (orderId: number) => {
      try {
        console.log('🆕 [useOrderAutoSync] Pedido criado, buscando dados:', orderId);
        const newOrder = await api.getOrderById(orderId);
        
        // 1. Sempre atualizar no store global primeiro
        updateOrder(newOrder);
        
        // 2. Atualizar na lista local se não existir
        setOrders((currentOrders) => {
          const exists = currentOrders.some((order) => order.id === newOrder.id);
          if (exists) {
            console.log('⚠️ [useOrderAutoSync] Pedido já existe na lista, atualizando');
            return currentOrders.map((order) => (order.id === newOrder.id ? newOrder : order));
          }
          console.log('✅ [useOrderAutoSync] Adicionando novo pedido à lista');
          return [newOrder, ...currentOrders];
        });
        
        // 3. NÃO recarregar lista automaticamente - apenas atualizar o que já temos
        // Recarregar apenas quando necessário (ex: quando modal fecha)
        // Isso evita loops infinitos e múltiplas conexões WebSocket
      } catch (error) {
        console.error('❌ Erro ao sincronizar pedido criado:', error);
      }
    },
    [setOrders, updateOrder], // Remover loadOrders das dependências
  );

  const handleOrderUpdated = useCallback(
    async (orderId: number) => {
      try {
        console.log('🔄 [useOrderAutoSync] handleOrderUpdated chamado para pedido:', orderId);
        const updatedOrder = await api.getOrderById(orderId);
        
        // 1. SEMPRE atualizar no store global primeiro (independente de estar na lista)
        updateOrder(updatedOrder);
        console.log('✅ [useOrderAutoSync] Pedido atualizado no store global:', orderId);
        
        // 2. Atualizar na lista local se existir
        setOrders((currentOrders) => {
          const oldOrder = currentOrders.find(o => o.id === orderId);
          if (oldOrder) {
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
            console.log('✅ [useOrderAutoSync] Lista local atualizada:', {
              orderId,
              totalOrders: updated.length,
            });
            return updated;
          } else {
            console.log('⚠️ [useOrderAutoSync] Pedido não está na lista atual, mas foi atualizado no store');
            return currentOrders;
          }
        });
        
        // 3. NÃO recarregar lista automaticamente - apenas atualizar o que já temos
        // Isso evita loops infinitos e múltiplas conexões WebSocket
        // Se o pedido mudou de status e deveria aparecer/desaparecer da lista filtrada,
        // isso será tratado quando o usuário interagir com a interface ou quando o modal fechar
      } catch (error) {
        console.error('❌ Erro ao sincronizar pedido atualizado:', error);
      }
    },
    [setOrders, updateOrder], // Remover loadOrders das dependências
  );

  const handleOrderDeleted = useCallback(
    (orderId: number) => {
      console.log('🗑️ [useOrderAutoSync] Removendo pedido:', orderId);
      removeOrder(orderId);
      
      // NÃO recarregar lista automaticamente - apenas remover da lista atual
      // Isso evita loops infinitos e múltiplas conexões WebSocket
    },
    [removeOrder], // Remover loadOrders das dependências
  );

  const handleOrderStatusUpdated = useCallback(
    async (orderId: number) => {
      try {
        console.log('🔄 [useOrderAutoSync] handleOrderStatusUpdated chamado para pedido:', orderId);
        const updatedOrder = await api.getOrderById(orderId);
        
        // 1. SEMPRE atualizar no store global primeiro (independente de estar na lista)
        updateOrder(updatedOrder);
        console.log('✅ [useOrderAutoSync] Status do pedido atualizado no store global:', orderId);
        
        // 2. Atualizar na lista local se existir
        setOrders((currentOrders) => {
          const oldOrder = currentOrders.find(o => o.id === orderId);
          if (oldOrder) {
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
            });
            return updated;
          } else {
            console.log('⚠️ [useOrderAutoSync] Pedido não está na lista atual, mas foi atualizado no store');
            return currentOrders;
          }
        });
        
        // 3. NÃO recarregar lista automaticamente - apenas atualizar o que já temos
        // Isso evita loops infinitos e múltiplas conexões WebSocket
        // Se o pedido mudou de status e deveria aparecer/desaparecer da lista filtrada,
        // isso será tratado quando o usuário interagir com a interface ou quando o modal fechar
      } catch (error) {
        console.error('❌ Erro ao sincronizar status do pedido:', error);
      }
    },
    [setOrders, updateOrder], // Remover loadOrders das dependências
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
