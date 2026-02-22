import { useEffect, useRef, useState } from 'react';

// ========================================
// HOOK PARA ATUALIZAÇÃO AUTOMÁTICA SUAVE
// ========================================

export const useAutoRefresh = (callback: () => Promise<void>, intervalMs: number = 7000) => {
  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const isRefreshingRef = useRef(false);

  // Atualizar a referência do callback sempre que ele mudar
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Função para executar refresh com loading suave
  const executeRefresh = async () => {
    if (isRefreshingRef.current) {
      console.log('⏳ Refresh já em andamento, ignorando...');
      return;
    }

    try {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      console.log('🔄 Executando refresh suave...');

      // Pequeno delay para suavizar a transição
      await new Promise(resolve => setTimeout(resolve, 100));

      await callbackRef.current();
      setRefreshCount(prev => prev + 1);

      console.log('✅ Refresh concluído suavemente');
    } catch (error) {
      console.error('❌ Erro durante refresh:', error);
    } finally {
      isRefreshingRef.current = false;
      // Delay adicional para suavizar o fim do loading
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };

  // Configurar o intervalo
  useEffect(() => {
    console.log(`🔄 Configurando auto-refresh suave a cada ${intervalMs}ms`);

    intervalRef.current = setInterval(() => {
      console.log('⏰ Auto-refresh executando...');
      executeRefresh();
    }, intervalMs);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        console.log('🛑 Parando auto-refresh');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalMs]);

  // Função para parar o auto-refresh temporariamente
  const pauseAutoRefresh = () => {
    if (intervalRef.current) {
      console.log('⏸️ Auto-refresh pausado');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Função para retomar o auto-refresh
  const resumeAutoRefresh = () => {
    if (!intervalRef.current) {
      console.log('▶️ Auto-refresh retomado');
      intervalRef.current = setInterval(() => {
        console.log('⏰ Auto-refresh executando...');
        executeRefresh();
      }, intervalMs);
    }
  };

  // Função para forçar uma atualização imediata
  const forceRefresh = async () => {
    console.log('🔄 Forçando atualização imediata');
    await executeRefresh();
  };

  return {
    pauseAutoRefresh,
    resumeAutoRefresh,
    forceRefresh,
    isRefreshing,
    refreshCount,
  };
};
