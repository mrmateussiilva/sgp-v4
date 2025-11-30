// ========================================
// EXEMPLO DE LISTENER REACT PARA POLLING
// ========================================

import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// Tipos TypeScript para as notificações
interface OrderStatusNotification {
  order_id: number;
  status: string;
  pronto: boolean | null;
  financeiro: boolean | null;
  conferencia: boolean | null;
  sublimacao: boolean | null;
  costura: boolean | null;
  expedicao: boolean | null;
  details: string;
  timestamp: string;
}

// Hook personalizado para gerenciar o polling de pedidos
export function useOrderPolling() {
  const reloadOrders = useCallback(async () => {
    try {
      console.log('🔄 Recarregando pedidos devido a mudança de status...');
      
      // Aqui você chama sua função de reload dos pedidos
      // Exemplo: await fetchPendingOrders();
      // Exemplo: await fetchReadyOrders();
      
      // Ou se você tem um estado global:
      // dispatch({ type: 'RELOAD_ORDERS' });
      
      console.log('✅ Pedidos recarregados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao recarregar pedidos:', error);
    }
  }, []);

  useEffect(() => {
    console.log('🎧 Registrando listener para order_status_changed...');
    
    // Registrar listener para mudanças de status
    const unlisten = listen<OrderStatusNotification>(
      'order_status_changed',
      (event) => {
        const notification = event.payload;
        console.log('📡 Mudança de status detectada:', notification);
        
        // Log detalhado da mudança
        console.log(`Pedido ${notification.order_id}:`, {
          status: notification.status,
          pronto: notification.pronto,
          financeiro: notification.financeiro,
          conferencia: notification.conferencia,
          sublimacao: notification.sublimacao,
          costura: notification.costura,
          expedicao: notification.expedicao,
          details: notification.details,
          timestamp: notification.timestamp
        });
        
        // Recarregar a lista de pedidos
        reloadOrders();
      }
    );

    // Cleanup: remover listener quando componente desmontar
    return () => {
      console.log('🔌 Removendo listener de order_status_changed');
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, [reloadOrders]);

  return { reloadOrders };
}

// ========================================
// EXEMPLO DE USO EM COMPONENTE
// ========================================

export function OrdersPage() {
  const { reloadOrders } = useOrderPolling();
  
  // Sua lógica de componente aqui...
  
  return (
    <div>
      <h1>Pedidos</h1>
      <button onClick={reloadOrders}>
        Recarregar Pedidos Manualmente
      </button>
      {/* Sua tabela de pedidos aqui */}
    </div>
  );
}

// ========================================
// EXEMPLO DE TESTE DO SISTEMA
// ========================================

export async function testOrderPolling() {
  try {
    console.log('🧪 Testando sistema de polling...');
    
    const result = await invoke<string>('test_order_polling');
    console.log('✅ Teste executado:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Erro no teste de polling:', error);
    throw error;
  }
}

export async function forceOrderCheck() {
  try {
    console.log('🔄 Forçando verificação de pedidos...');
    
    const result = await invoke<string>('force_order_check');
    console.log('✅ Verificação forçada:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Erro na verificação forçada:', error);
    throw error;
  }
}

// ========================================
// EXEMPLO COM REDUX/ZUSTAND (OPCIONAL)
// ========================================

// Se você usa Redux:
/*
export function useOrderPollingWithRedux() {
  const dispatch = useDispatch();
  
  const reloadOrders = useCallback(() => {
    dispatch(fetchPendingOrders());
    dispatch(fetchReadyOrders());
  }, [dispatch]);

  useEffect(() => {
    const unlisten = listen<OrderStatusNotification>(
      'order_status_changed',
      (event) => {
        console.log('📡 Mudança detectada:', event.payload);
        reloadOrders();
      }
    );

    return () => {
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, [reloadOrders]);
}
*/

// Se você usa Zustand:
/*
export function useOrderPollingWithZustand() {
  const { fetchOrders } = useOrderStore();
  
  const reloadOrders = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const unlisten = listen<OrderStatusNotification>(
      'order_status_changed',
      (event) => {
        console.log('📡 Mudança detectada:', event.payload);
        reloadOrders();
      }
    );

    return () => {
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, [reloadOrders]);
}
*/
