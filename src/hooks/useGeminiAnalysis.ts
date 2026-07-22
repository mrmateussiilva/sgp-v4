import { useState, useCallback } from 'react';
import { OrderWithItems } from '@/types';
import { analyzeOrderWithGemini } from '@/services/geminiService';

interface GeminiAnalysisState {
  loading: boolean;
  result: string | null;
  error: string | null;
}

export function useGeminiAnalysis() {
  const [state, setState] = useState<GeminiAnalysisState>({
    loading: false,
    result: null,
    error: null,
  });

  const analyze = useCallback(async (order: OrderWithItems, apiKey: string) => {
    setState({ loading: true, result: null, error: null });
    try {
      const result = await analyzeOrderWithGemini(order, apiKey);
      setState({ loading: false, result, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao analisar pedido.';
      setState({ loading: false, result: null, error: message });
    }
  }, []);

  const clear = useCallback(() => {
    setState({ loading: false, result: null, error: null });
  }, []);

  return {
    ...state,
    analyze,
    clear,
  };
}
