import { useEffect, useCallback, useRef } from 'react';
import { OrderWithItems } from '../types';
import { api } from '@/services/api';
import { ordersSocket, OrderEventMessage } from '@/lib/realtimeOrders';
import { logger } from '@/utils/logger';

// ========================================
// HOOK PARA EVENTOS DE PEDIDOS EM TEMPO REAL
// ========================================

interface UseOrderEventsProps {
  onOrderCreated?: (orderId: number) => void;
  onOrderUpdated?: (orderId: number) => void;
  onOrderDeleted?: (orderId: number) => void;
  onOrderStatusUpdated?: (orderId: number) => void;
}

// Singleton para gerenciar handlers globais e assinatura única
class OrderEventsManager {
  private static instance: OrderEventsManager | null = null;
  private globalSubscription: (() => void) | null = null;
  private handlers = new Map<symbol, UseOrderEventsProps>();
  private subscriptionCount = 0;

  static getInstance(): OrderEventsManager {
    if (!OrderEventsManager.instance) {
      OrderEventsManager.instance = new OrderEventsManager();
    }
    return OrderEventsManager.instance;
  }

  private parseOrderId(value: unknown): number | undefined {
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
  }

  private handleMessage = (message: OrderEventMessage) => {
    // Type guard para acessar propriedades dinâmicas
    const messageWithOrder = message as OrderEventMessage & { order?: unknown; pedido_id?: number };
    const orderPayload = messageWithOrder.order as { id?: number; order_id?: number; pedido_id?: number } | undefined;

    if (import.meta.env.DEV) {
      logger.debug('📡 [OrderEventsManager] Evento WebSocket recebido:', {
        type: message.type,
        order_id: message.order_id,
        has_order: !!orderPayload,
        handlers_count: this.handlers.size,
      });
    }

    const type = message.type;
    if (!type) {
      if (import.meta.env.DEV) {
        // noop
      }
      return;
    }

    // Tentar extrair order_id de múltiplas fontes possíveis
    const orderId =
      this.parseOrderId(message.order_id) ??
      this.parseOrderId(messageWithOrder.pedido_id) ??
      this.parseOrderId(orderPayload?.id) ??
      this.parseOrderId(orderPayload?.order_id) ??
      this.parseOrderId(orderPayload?.pedido_id);

    if (!orderId) {
      if (import.meta.env.DEV) {
        // noop
      }
      return;
    }

    // Notificar todos os handlers registrados
    this.handlers.forEach((handlers) => {
      const { onOrderCreated, onOrderUpdated, onOrderDeleted, onOrderStatusUpdated } = handlers;

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
          if (import.meta.env.DEV) {
            logger.debug('🔄 [OrderEventsManager] Chamando onOrderStatusUpdated para pedido:', orderId);
          }
          onOrderStatusUpdated(orderId);
        }
        // Também disparar onOrderUpdated para garantir atualização
        if (onOrderUpdated) {
          if (import.meta.env.DEV) {
            logger.debug('🔄 [OrderEventsManager] Chamando onOrderUpdated para pedido:', orderId);
          }
          onOrderUpdated(orderId);
        }
      } else if (type === 'order_updated' && orderId && onOrderUpdated) {
        if (import.meta.env.DEV) {
          logger.debug('🔄 [OrderEventsManager] Chamando onOrderUpdated para pedido:', orderId);
        }
        onOrderUpdated(orderId);
      }

      if (type === 'order_deleted' && orderId && onOrderDeleted) {
        onOrderDeleted(orderId);
      }
    });
  };

  subscribe(handlers: UseOrderEventsProps): { unsubscribe: () => void; id: symbol } {
    const id = Symbol('order-events-handler');
    this.handlers.set(id, handlers);
    this.subscriptionCount++;

    // Criar assinatura WebSocket apenas na primeira vez
    if (!this.globalSubscription) {
      this.globalSubscription = ordersSocket.subscribe(this.handleMessage);
      if (import.meta.env.DEV) {
        logger.debug('✅ [OrderEventsManager] Assinatura WebSocket global criada');
      }
    }

    // Retornar função de unsubscribe e ID
    return {
      id,
      unsubscribe: () => {
        if (this.handlers.has(id)) {
          this.handlers.delete(id);
          this.subscriptionCount--;

          // Se não houver mais handlers, fazer unsubscribe
          if (this.subscriptionCount === 0 && this.globalSubscription) {
            this.globalSubscription();
            this.globalSubscription = null;
            if (import.meta.env.DEV) {
              logger.debug('✅ [OrderEventsManager] Assinatura WebSocket global removida (sem mais handlers)');
            }
          }
        }
      },
    };
  }

  updateHandlers(id: symbol, handlers: UseOrderEventsProps): void {
    if (this.handlers.has(id)) {
      this.handlers.set(id, handlers);
    }
  }
}

const orderEventsManager = OrderEventsManager.getInstance();

export const useOrderEvents = ({
  onOrderCreated,
  onOrderUpdated,
  onOrderDeleted,
  onOrderStatusUpdated,
}: UseOrderEventsProps = {}) => {
  const handlerIdRef = useRef<symbol | null>(null);
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

    // Atualizar handlers no manager se já estiver registrado
    if (handlerIdRef.current) {
      orderEventsManager.updateHandlers(handlerIdRef.current, handlersRef.current);
    }
  }, [onOrderCreated, onOrderUpdated, onOrderDeleted, onOrderStatusUpdated]);

  useEffect(() => {
    // Registrar handlers no manager singleton
    const { id, unsubscribe } = orderEventsManager.subscribe(handlersRef.current);

    // Armazenar o ID para atualizações futuras
    handlerIdRef.current = id;

    return () => {
      unsubscribe();
      handlerIdRef.current = null;
    };
  }, []); // Dependências vazias - criar apenas uma vez por componente
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

  // ========================================
  // FALLBACK: POLLING quando WS está bloqueado por "Outra sessão ativa"
  // (servidor fecha conexões antigas quando o mesmo usuário abre outra)
  // ========================================
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    const stopPolling = () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };

    const startPolling = (intervalMs: number) => {
      if (pollingTimerRef.current) return;

      pollingTimerRef.current = setInterval(async () => {
        if (isPollingRef.current) return;

        const fn = loadOrdersRef.current;
        if (!fn) return;

        try {
          isPollingRef.current = true;
          await fn();
        } catch (error) {
          // Não quebrar polling por erro pontual

        } finally {
          isPollingRef.current = false;
        }
      }, intervalMs);
    };

    const unsubscribe = ordersSocket.onStatus((status) => {
      const blockedByOtherSession =
        !status.isConnected &&
        typeof status.lastError === 'string' &&
        status.lastError.includes('Outra sessão ativa');

      if (blockedByOtherSession) {
        // WS bloqueado por login duplicado -> usar polling
        startPolling(8000);
      } else {
        stopPolling();
      }
    });

    return () => {
      unsubscribe();
      stopPolling();
    };
  }, []);

  const handleOrderCreated = useCallback(
    async (orderId: number) => {
      try {
        logger.debug('🆕 [useOrderAutoSync] Pedido criado, buscando dados:', orderId);
        const newOrder = await api.getOrderById(orderId);

        // 1. Sempre atualizar no store global primeiro
        updateOrder(newOrder);

        // 2. Atualizar na lista local se não existir
        setOrders((currentOrders) => {
          const exists = currentOrders.some((order) => order.id === newOrder.id);
          if (exists) {
            logger.debug('⚠️ [useOrderAutoSync] Pedido já existe na lista, atualizando');
            return currentOrders.map((order) => (order.id === newOrder.id ? newOrder : order));
          }
          logger.debug('✅ [useOrderAutoSync] Adicionando novo pedido à lista');
          return [newOrder, ...currentOrders];
        });

        // 3. NÃO recarregar lista automaticamente - apenas atualizar o que já temos
        // Recarregar apenas quando necessário (ex: quando modal fecha)
        // Isso evita loops infinitos e múltiplas conexões WebSocket
      } catch (error) {
        logger.error('❌ Erro ao sincronizar pedido criado:', error);
      }
    },
    [setOrders, updateOrder], // Remover loadOrders das dependências
  );

  const handleOrderUpdated = useCallback(
    async (orderId: number) => {
      try {
        logger.debug('🔄 [useOrderAutoSync] handleOrderUpdated chamado para pedido:', orderId);
        const updatedOrder = await api.getOrderById(orderId);

        // 1. SEMPRE atualizar no store global primeiro (independente de estar na lista)
        updateOrder(updatedOrder);
        logger.debug('✅ [useOrderAutoSync] Pedido atualizado no store global:', orderId);

        // 2. Atualizar na lista local se existir
        setOrders((currentOrders) => {
          const oldOrder = currentOrders.find(o => o.id === orderId);
          if (oldOrder) {
            logger.debug('📦 [useOrderAutoSync] Comparando pedidos:', {
              orderId,
              oldStatus: oldOrder?.status,
              newStatus: updatedOrder.status,
              oldFinanceiro: oldOrder?.financeiro,
              newFinanceiro: updatedOrder.financeiro,
              oldConferencia: oldOrder?.conferencia,
              newConferencia: updatedOrder.conferencia,
            });
            const updated = currentOrders.map((order) => (order.id === orderId ? updatedOrder : order));
            logger.debug('✅ [useOrderAutoSync] Lista local atualizada:', {
              orderId,
              totalOrders: updated.length,
            });
            return updated;
          } else {
            logger.debug('⚠️ [useOrderAutoSync] Pedido não está na lista atual, mas foi atualizado no store');
            return currentOrders;
          }
        });

        // 3. NÃO recarregar lista automaticamente - apenas atualizar o que já temos
        // Isso evita loops infinitos e múltiplas conexões WebSocket
        // Se o pedido mudou de status e deveria aparecer/desaparecer da lista filtrada,
        // isso será tratado quando o usuário interagir com a interface ou quando o modal fechar
      } catch (error) {
        logger.error('❌ Erro ao sincronizar pedido atualizado:', error);
      }
    },
    [setOrders, updateOrder], // Remover loadOrders das dependências
  );

  const handleOrderDeleted = useCallback(
    (orderId: number) => {
      logger.debug('🗑️ [useOrderAutoSync] Removendo pedido:', orderId);
      removeOrder(orderId);

      // NÃO recarregar lista automaticamente - apenas remover da lista atual
      // Isso evita loops infinitos e múltiplas conexões WebSocket
    },
    [removeOrder], // Remover loadOrders das dependências
  );

  const handleOrderStatusUpdated = useCallback(
    async (orderId: number) => {
      try {
        logger.debug('🔄 [useOrderAutoSync] handleOrderStatusUpdated chamado para pedido:', orderId);
        const updatedOrder = await api.getOrderById(orderId);

        // 1. SEMPRE atualizar no store global primeiro (independente de estar na lista)
        updateOrder(updatedOrder);
        logger.debug('✅ [useOrderAutoSync] Status do pedido atualizado no store global:', orderId);

        // 2. Atualizar na lista local se existir
        setOrders((currentOrders) => {
          const oldOrder = currentOrders.find(o => o.id === orderId);
          if (oldOrder) {
            logger.debug('📦 [useOrderAutoSync] Pedido atualizado recebido:', {
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
            logger.debug('✅ [useOrderAutoSync] Atualizando lista de pedidos:', {
              orderId,
              totalOrders: updated.length,
              oldStatus: oldOrder?.status,
              newStatus: updatedOrder.status,
            });
            return updated;
          } else {
            logger.debug('⚠️ [useOrderAutoSync] Pedido não está na lista atual, mas foi atualizado no store');
            return currentOrders;
          }
        });

        // 3. NÃO recarregar lista automaticamente - apenas atualizar o que já temos
        // Isso evita loops infinitos e múltiplas conexões WebSocket
        // Se o pedido mudou de status e deveria aparecer/desaparecer da lista filtrada,
        // isso será tratado quando o usuário interagir com a interface ou quando o modal fechar
      } catch (error) {
        logger.error('❌ Erro ao sincronizar status do pedido:', error);
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
