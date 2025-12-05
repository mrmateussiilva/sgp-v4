/**
 * Serviço central de eventos de pedidos em tempo real.
 * 
 * Este serviço gerencia a conexão WebSocket e fornece uma interface simples
 * para componentes assinarem eventos de pedidos (criado, atualizado, cancelado).
 * 
 * Funcionalidades:
 * - Conexão automática ao WebSocket da API
 * - Reconexão automática em caso de queda
 * - Callbacks para eventos de pedidos
 * - Notificações toast automáticas
 */

import { ordersSocket, OrderEventMessage } from '@/lib/realtimeOrders';
import { api } from './api';
import { OrderWithItems } from '@/types';

export type OrderEventType = 'pedido_criado' | 'pedido_atualizado' | 'pedido_cancelado';

export interface OrderEventCallback {
  onOrderCreated?: (orderId: number, orderData?: Partial<OrderWithItems>) => void;
  onOrderUpdated?: (orderId: number, orderData?: Partial<OrderWithItems>) => void;
  onOrderCanceled?: (orderId: number, orderData?: Partial<OrderWithItems>) => void;
}

export interface ToastFunction {
  (options: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
  }): void;
}

/**
 * Mapeia os tipos de evento do backend para os tipos internos.
 */
const mapEventType = (type: string): OrderEventType | null => {
  // Backend pode enviar: pedido_criado, pedido_atualizado, pedido_cancelado
  // Frontend também pode receber: order_created, order_updated, order_deleted, order_status_updated (legado)
  if (type === 'pedido_criado' || type === 'order_created') {
    return 'pedido_criado';
  }
  // order_status_updated também deve ser tratado como pedido_atualizado
  if (type === 'pedido_atualizado' || type === 'order_updated' || type === 'order_status_updated') {
    return 'pedido_atualizado';
  }
  if (type === 'pedido_cancelado' || type === 'order_deleted' || type === 'order_canceled') {
    return 'pedido_cancelado';
  }
  return null;
};

/**
 * Assina eventos de pedidos e executa callbacks quando eventos são recebidos.
 * 
 * @param callbacks - Funções a serem chamadas quando eventos ocorrem
 * @param showToast - Se true, exibe notificações toast automaticamente (padrão: true)
 * @param toastFn - Função opcional para exibir toast (se não fornecida e showToast=true, não exibirá toast)
 * @returns Função para cancelar a assinatura
 */
export function subscribeToOrderEvents(
  callbacks: OrderEventCallback,
  showToast: boolean = true,
  toastFn?: ToastFunction
): () => void {
  const handleMessage = async (message: OrderEventMessage) => {
    const eventType = mapEventType(message.type || '');
    
    if (!eventType) {
      // Ignorar eventos desconhecidos
      return;
    }

    const pedidoId = message.pedido_id || (message as any).order_id;
    if (!pedidoId) {
      console.warn('⚠️ Evento recebido sem pedido_id:', message);
      return;
    }

    // Extrair dados do pedido da mensagem (se disponível)
    const orderData: Partial<OrderWithItems> = {
      id: pedidoId,
      cliente: (message as any).cliente,
      status: (message as any).status_atual as any,
      valor_total: parseFloat((message as any).valor_total || '0'),
    };

    // Executar callbacks
    switch (eventType) {
      case 'pedido_criado':
        if (showToast && toastFn) {
          toastFn({
            title: 'Novo Pedido',
            description: `Pedido #${pedidoId} foi criado${orderData.cliente ? ` - ${orderData.cliente}` : ''}`,
            variant: 'default',
          });
        }
        callbacks.onOrderCreated?.(pedidoId, orderData);
        break;

      case 'pedido_atualizado':
        if (showToast && toastFn) {
          toastFn({
            title: 'Pedido Atualizado',
            description: `Pedido #${pedidoId} foi atualizado${orderData.cliente ? ` - ${orderData.cliente}` : ''}`,
            variant: 'default',
          });
        }
        callbacks.onOrderUpdated?.(pedidoId, orderData);
        break;

      case 'pedido_cancelado':
        if (showToast && toastFn) {
          toastFn({
            title: 'Pedido Cancelado',
            description: `Pedido #${pedidoId} foi cancelado${orderData.cliente ? ` - ${orderData.cliente}` : ''}`,
            variant: 'destructive',
          });
        }
        callbacks.onOrderCanceled?.(pedidoId, orderData);
        break;
    }
  };

  // Assinar eventos do WebSocket
  const unsubscribe = ordersSocket.subscribe(handleMessage);

  // Garantir que a conexão está ativa
  ordersSocket.connect();

  // Retornar função de cancelamento
  return unsubscribe;
}

/**
 * Hook React para assinar eventos de pedidos.
 * 
 * @param callbacks - Funções a serem chamadas quando eventos ocorrem
 * @param showToast - Se true, exibe notificações toast automaticamente (padrão: true)
 */
export function useOrderEventsSubscription(
  callbacks: OrderEventCallback,
  showToast: boolean = true
): void {
  const { useEffect } = require('react');

  useEffect(() => {
    const unsubscribe = subscribeToOrderEvents(callbacks, showToast);
    return unsubscribe;
  }, []);
}

/**
 * Busca um pedido completo da API após receber um evento.
 * Útil para atualizar a lista ou exibir detalhes atualizados.
 */
export async function fetchOrderAfterEvent(orderId: number): Promise<OrderWithItems | null> {
  try {
    return await api.getOrderById(orderId);
  } catch (error) {
    console.error(`Erro ao buscar pedido #${orderId} após evento:`, error);
    return null;
  }
}

