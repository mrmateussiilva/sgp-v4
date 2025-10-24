import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { OrderWithItems } from '../types';
import { useGlobalBroadcast } from './useGlobalBroadcast';

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
  
  // Usar o sistema de broadcast global
  const { status: broadcastStatus } = useGlobalBroadcast();
  
  // Log do status do broadcast
  useEffect(() => {
    if (broadcastStatus.isConnected) {
      console.log('🌐 Sistema de broadcast global ativo:', {
        clientId: broadcastStatus.clientId,
        activeClients: broadcastStatus.activeClients.length,
        lastHeartbeat: broadcastStatus.lastHeartbeat,
      });
    }
  }, [broadcastStatus]);
  
  // Função para buscar pedido atualizado
  const fetchUpdatedOrder = useCallback(async (orderId: number): Promise<OrderWithItems | null> => {
    try {
      const order = await invoke<OrderWithItems>('get_order_by_id', { orderId });
      return order;
    } catch (error) {
      console.error('Erro ao buscar pedido atualizado:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log('🔊 Configurando listeners de eventos de pedidos...');
    
    const unlistenPromises: Promise<() => void>[] = [];

    // Listener para pedido criado
    if (onOrderCreated) {
      console.log('🎧 Configurando listener para order_created');
      const unlistenCreated = listen<number>('order_created', (event) => {
        const orderId = event.payload;
        console.log('🆕 EVENTO RECEBIDO - Pedido criado:', orderId);
        onOrderCreated(orderId);
      });
      unlistenPromises.push(unlistenCreated);
    }

    // Listener para pedido atualizado
    if (onOrderUpdated) {
      console.log('🎧 Configurando listener para order_updated');
      const unlistenUpdated = listen<number>('order_updated', (event) => {
        const orderId = event.payload;
        console.log('📝 EVENTO RECEBIDO - Pedido atualizado:', orderId);
        onOrderUpdated(orderId);
      });
      unlistenPromises.push(unlistenUpdated);
    }

    // Listener para pedido deletado
    if (onOrderDeleted) {
      console.log('🎧 Configurando listener para order_deleted');
      const unlistenDeleted = listen<number>('order_deleted', (event) => {
        const orderId = event.payload;
        console.log('🗑️ EVENTO RECEBIDO - Pedido deletado:', orderId);
        onOrderDeleted(orderId);
      });
      unlistenPromises.push(unlistenDeleted);
    }

    // Listener para status de pedido atualizado
    if (onOrderStatusUpdated) {
      console.log('🎧 Configurando listener para order_status_updated');
      const unlistenStatusUpdated = listen<number>('order_status_updated', (event) => {
        const orderId = event.payload;
        console.log('🔄 EVENTO RECEBIDO - Status do pedido atualizado:', orderId);
        onOrderStatusUpdated(orderId);
      });
      unlistenPromises.push(unlistenStatusUpdated);
    }

    console.log(`✅ ${unlistenPromises.length} listeners configurados`);

    // Cleanup: remover todos os listeners quando o componente for desmontado
    return () => {
      console.log('🔇 Removendo listeners de eventos de pedidos...');
      Promise.all(unlistenPromises).then((unlistenFunctions) => {
        unlistenFunctions.forEach(unlisten => unlisten());
        console.log('✅ Listeners removidos');
      });
    };
  }, [onOrderCreated, onOrderUpdated, onOrderDeleted, onOrderStatusUpdated]);

  return {
    fetchUpdatedOrder,
  };
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
  
  // Handler para pedido criado - recarrega a lista completa
  const handleOrderCreated = useCallback(async (orderId: number) => {
    console.log('🆕 Sincronizando pedido criado:', orderId);
    // Para pedidos criados, geralmente recarregamos a lista completa
    // ou adicionamos o pedido específico se tivermos os dados
  }, []);

  // Handler para pedido atualizado - atualiza apenas o pedido específico
  const handleOrderUpdated = useCallback(async (orderId: number) => {
    console.log('📝 Sincronizando pedido atualizado:', orderId);
    
    try {
      const updatedOrder = await invoke<OrderWithItems>('get_order_by_id', { orderId });
      
      const updatedOrders = orders.map((order: OrderWithItems) => 
        order.id === orderId ? updatedOrder : order
      );
      setOrders(updatedOrders);
      
      console.log('✅ Pedido sincronizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao sincronizar pedido:', error);
    }
  }, [setOrders]);

  // Handler para pedido deletado - remove da lista
  const handleOrderDeleted = useCallback((orderId: number) => {
    console.log('🗑️ Removendo pedido deletado:', orderId);
    removeOrder(orderId);
  }, [removeOrder]);

  // Handler para status atualizado - atualiza apenas o pedido específico
  const handleOrderStatusUpdated = useCallback(async (orderId: number) => {
    console.log('🔄 Sincronizando status do pedido:', orderId);
    
    try {
      const updatedOrder = await invoke<OrderWithItems>('get_order_by_id', { orderId });
      
      const updatedOrders = orders.map((order: OrderWithItems) => 
        order.id === orderId ? updatedOrder : order
      );
      setOrders(updatedOrders);
      
      console.log('✅ Status do pedido sincronizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao sincronizar status do pedido:', error);
    }
  }, [setOrders]);

  console.log('🔧 Configurando useOrderAutoSync com handlers:', {
    hasOrders: orders.length > 0,
    hasSetOrders: !!setOrders,
    hasRemoveOrder: !!removeOrder,
  });

  // Configurar os listeners
  useOrderEvents({
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: handleOrderUpdated,
    onOrderDeleted: handleOrderDeleted,
    onOrderStatusUpdated: handleOrderStatusUpdated,
  });

  return {
    // Retornar funções para uso manual se necessário
    handleOrderCreated,
    handleOrderUpdated,
    handleOrderDeleted,
    handleOrderStatusUpdated,
  };
};
