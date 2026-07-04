/**
 * useFormDraftCache
 *
 * Cache leve de formulário usando sessionStorage.
 * Preserva os dados preenchidos na tela de criação de pedidos
 * quando o usuário troca de aba/rota antes de salvar.
 *
 * - Só ativo em modo de CRIAÇÃO (não edição).
 * - Os dados são salvos automaticamente com debounce para não
 *   bloquear a thread a cada tecla.
 * - Limpar explicitamente ao salvar ou descartar o formulário.
 */
import { useEffect, useRef, useCallback } from 'react';

const CACHE_KEY = 'sgp_create_order_draft';
const CACHE_VERSION = 1; // incremente ao mudar a estrutura do formulário para descartar caches antigos
const SAVE_DEBOUNCE_MS = 800; // aguarda 800ms sem mudanças antes de persistir

/** Campos de imagem que NÃO devem ser cacheados (podem ser base64 gigante e estourar o sessionStorage) */
const EXCLUDED_IMAGE_FIELDS = ['imagem', 'legenda_imagem'];

export interface FormDraftCachePayload {
  version: number;
  formData: Record<string, unknown>;
  tabs: string[];
  tabsData: Record<string, unknown>;
  activeTab: string;
  savedAt: string; // ISO timestamp
}

interface UseFormDraftCacheOptions {
  /** Quando false, o cache é completamente desabilitado (ex: modo edição) */
  enabled: boolean;
}

interface UseFormDraftCacheReturn {
  /** Verifica se existe um rascunho salvo no sessionStorage */
  hasCachedDraft: () => boolean;
  /** Carrega e retorna o payload salvo, ou null se não existir */
  loadCachedDraft: () => FormDraftCachePayload | null;
  /** Salva o estado atual no cache (é debouncado automaticamente) */
  saveDraft: (payload: Omit<FormDraftCachePayload, 'savedAt' | 'version'>) => void;
  /** Remove o cache — chamar após salvar ou descartar */
  clearDraft: () => void;
}

export function useFormDraftCache({ enabled }: UseFormDraftCacheOptions): UseFormDraftCacheReturn {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const hasCachedDraft = useCallback((): boolean => {
    if (!enabled) return false;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      return !!raw;
    } catch {
      return false;
    }
  }, [enabled]);

  const loadCachedDraft = useCallback((): FormDraftCachePayload | null => {
    if (!enabled) return null;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as FormDraftCachePayload;
      // Descartar cache de versão diferente (estrutura mudou)
      if (parsed.version !== CACHE_VERSION) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [enabled]);

  const saveDraft = useCallback(
    (payload: Omit<FormDraftCachePayload, 'savedAt' | 'version'>) => {
      if (!enabled) return;

      // Cancelar o timer anterior (debounce)
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        try {
          // Sanitizar tabsData — remover campos de imagem (podem ser base64 e estourar o sessionStorage)
          const sanitizedTabsData = Object.fromEntries(
            Object.entries(payload.tabsData).map(([tabId, tabItem]) => {
              const item = { ...(tabItem as Record<string, unknown>) };
              for (const field of EXCLUDED_IMAGE_FIELDS) {
                delete item[field];
              }
              return [tabId, item];
            }),
          );

          const fullPayload: FormDraftCachePayload = {
            ...payload,
            tabsData: sanitizedTabsData,
            version: CACHE_VERSION,
            savedAt: new Date().toISOString(),
          };
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(fullPayload));
        } catch {
          // sessionStorage pode falhar em modo privado ou com cota excedida — ignorar silenciosamente
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [enabled],
  );

  const clearDraft = useCallback((): void => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // ignorar
    }
  }, []);

  return { hasCachedDraft, loadCachedDraft, saveDraft, clearDraft };
}
