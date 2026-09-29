import { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Utilitário para carregamento dinâmico resiliente com retry automático.
 * Resolve problemas de "Failed to fetch dynamically imported module" causados por:
 * 1. Atualização de versão em produção ou reinício do servidor de desenvolvimento.
 * 2. Oscilações momentâneas de rede ou falha de leitura em cache no WebView.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 2,
  interval = 800
): LazyExoticComponent<T> {
  return lazy(async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await componentImport();
      } catch (error: unknown) {
        const errMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
        const isDynamicImportError =
          errMessage.includes('failed to fetch dynamically imported module') ||
          errMessage.includes('error loading dynamically imported module') ||
          errMessage.includes('chunkloaderror') ||
          errMessage.includes('loading chunk');

        if (attempt < retries && isDynamicImportError) {
          await new Promise((resolve) => setTimeout(resolve, interval));
          continue;
        }

        // Se falhou todas as tentativas e é erro de módulo desatualizado/não encontrado,
        // força o recarregamento da página UMA única vez para evitar loop infinito.
        if (isDynamicImportError && typeof window !== 'undefined') {
          const sessionKey = `lazy_retry_reload_${window.location.pathname}`;
          const alreadyReloaded = window.sessionStorage.getItem(sessionKey);

          if (!alreadyReloaded) {
            window.sessionStorage.setItem(sessionKey, 'true');
            window.location.reload();
            // Retorna promessa pendente para evitar propagar erro enquanto o reload acontece
            return new Promise<{ default: T }>(() => {});
          }
        }

        throw error;
      }
    }
    return componentImport();
  });
}
