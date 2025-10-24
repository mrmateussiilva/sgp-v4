// ========================================
// LISTENER REACT FUNCIONAL - SGP v4
// ========================================

import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';

// Interface para a notificação
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

// Hook funcional para polling de pedidos
export function useOrderPolling() {
  const reloadOrders = useCallback(async () => {
    try {
      console.log('🔄 [FRONTEND] Recarregando pedidos devido a mudança de status...');
      
      // Aqui você deve chamar suas funções de reload
      // Exemplo:
      // await fetchPendingOrders();
      // await fetchReadyOrders();
      
      // Ou se você tem um estado global:
      // dispatch({ type: 'RELOAD_ORDERS' });
      
      console.log('✅ [FRONTEND] Pedidos recarregados com sucesso');
    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao recarregar pedidos:', error);
    }
  }, []);

  useEffect(() => {
    console.log('🎧 [FRONTEND] Registrando listener para order_status_changed...');
    
    let unlistenPromise: Promise<() => void> | null = null;
    
    // Registrar listener
    unlistenPromise = listen<OrderStatusNotification>(
      'order_status_changed',
      (event) => {
        const notification = event.payload;
        console.log('📡 [FRONTEND] Evento order_status_changed recebido!');
        console.log('📋 [FRONTEND] Dados:', notification);
        
        // Log detalhado
        console.log(`🔄 [FRONTEND] Pedido ${notification.order_id} mudou:`, {
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
        
        // Recarregar pedidos
        reloadOrders();
      }
    );

    // Cleanup
    return () => {
      console.log('🔌 [FRONTEND] Removendo listener de order_status_changed');
      if (unlistenPromise) {
        unlistenPromise.then(unlistenFn => {
          console.log('✅ [FRONTEND] Listener removido com sucesso');
          unlistenFn();
        }).catch(error => {
          console.error('❌ [FRONTEND] Erro ao remover listener:', error);
        });
      }
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
        🔄 Recarregar Pedidos Manualmente
      </button>
      {/* Sua tabela de pedidos aqui */}
    </div>
  );
}

// ========================================
// FUNÇÕES DE TESTE
// ========================================

export async function testOrderPolling() {
  try {
    console.log('🧪 [FRONTEND] Testando sistema de polling...');
    
    const result = await invoke<string>('test_order_polling');
    console.log('✅ [FRONTEND] Teste executado:', result);
    
    return result;
  } catch (error) {
    console.error('❌ [FRONTEND] Erro no teste de polling:', error);
    throw error;
  }
}

export async function forceOrderCheck() {
  try {
    console.log('🔄 [FRONTEND] Forçando verificação de pedidos...');
    
    const result = await invoke<string>('force_order_check');
    console.log('✅ [FRONTEND] Verificação forçada:', result);
    
    return result;
  } catch (error) {
    console.error('❌ [FRONTEND] Erro na verificação forçada:', error);
    throw error;
  }
}

// ========================================
// EXEMPLO COM ESTADO LOCAL
// ========================================

import { useState, useEffect } from 'react';

export function OrdersPageWithState() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const reloadOrders = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔄 [FRONTEND] Recarregando pedidos...');
      
      // Aqui você chama sua função de fetch
      // const newOrders = await fetchOrders();
      // setOrders(newOrders);
      
      console.log('✅ [FRONTEND] Pedidos recarregados');
    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao recarregar:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Usar o hook de polling
  useOrderPolling();
  
  return (
    <div>
      <h1>Pedidos {loading && '🔄'}</h1>
      <button onClick={reloadOrders} disabled={loading}>
        {loading ? 'Carregando...' : 'Recarregar'}
      </button>
      {/* Sua tabela aqui */}
    </div>
  );
}

// ========================================
// DEBUG: VERIFICAR SE EVENTOS ESTÃO CHEGANDO
// ========================================

export function DebugEventListener() {
  useEffect(() => {
    console.log('🔍 [DEBUG] Registrando listener de debug...');
    
    const unlistenPromise = listen('order_status_changed', (event) => {
      console.log('🎯 [DEBUG] EVENTO RECEBIDO!', event);
      console.log('🎯 [DEBUG] Payload:', event.payload);
      console.log('🎯 [DEBUG] Event name:', event.event);
    });
    
    return () => {
      unlistenPromise.then(unlistenFn => {
        console.log('🔍 [DEBUG] Listener de debug removido');
        unlistenFn();
      });
    };
  }, []);
  
  return (
    <div>
      <h3>Debug: Escutando eventos...</h3>
      <p>Abra o console para ver os eventos</p>
    </div>
  );
}

