import { useEffect, useRef } from 'react';
import { useUpdaterStore } from '@/store/updaterStore';
import { isTauri } from '@/utils/isTauri';

/**
 * Hook que verifica automaticamente atualizações usando o updater oficial do Tauri
 * Executa apenas uma vez por inicialização. Na web, não faz nada.
 */
export function useTauriUpdater() {
  const hasCheckedRef = useRef(false);
  const setUpdateAvailable = useUpdaterStore((state) => state.setUpdateAvailable);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    // Verificar apenas uma vez quando o componente monta
    if (hasCheckedRef.current) {
      return;
    }

    const checkForUpdates = async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');

        const update = await check({
          target: undefined, // Deixa o Tauri escolher automaticamente
        });

        if (!update) {

          setUpdateAvailable(false);
          hasCheckedRef.current = true;
          return;
        }


        // Atualizar store global para mostrar notificação no menu
        setUpdateAvailable(true, update.version);

        hasCheckedRef.current = true;

      } catch (error) {
        // Erros são silenciosos na inicialização para não perturbar o usuário

        hasCheckedRef.current = true;
      }
    };

    // Aguardar 3 segundos após a inicialização para não bloquear o startup
    const timeoutId = setTimeout(() => {
      checkForUpdates();
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [setUpdateAvailable]);
}
