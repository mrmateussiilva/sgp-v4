import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { DEFAULT_MANIFEST_URL } from '@/utils/manifestUrl';

interface ManualUpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  url?: string;
  notes?: string;
  date?: string;
  signature?: string;
}

/**
 * Hook que verifica automaticamente atualizações na inicialização
 * e mostra uma notificação quando há atualização disponível
 */
export function useAutoUpdateCheck() {
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Verificar apenas uma vez quando o componente monta
    if (hasCheckedRef.current) {
      return;
    }

    const checkForUpdates = async () => {
      try {
        const result = await invoke<ManualUpdateInfo>('check_update_manual', {
          manifestUrl: DEFAULT_MANIFEST_URL,
        });

        if (!result.available) {
          return;
        }

        toast({
          title: '🔄 Nova versão disponível!',
          description: `Versão ${result.latest_version} está disponível. Você está usando ${result.current_version}.`,
          variant: 'info',
          action: (
            <ToastAction
              altText="Ver detalhes da atualização"
              onClick={() => {
                // Navegar para a página de atualização
                window.location.hash = '#/update-status';
              }}
            >
              Ver Detalhes
            </ToastAction>
          ),
        });
      } catch (error) {
        // Silenciosamente falha se não conseguir verificar
        // Não queremos mostrar erro ao usuário na inicialização
        console.debug('Erro ao verificar atualizações automaticamente:', error);
      } finally {
        hasCheckedRef.current = true;
      }
    };

    // Aguardar um pouco antes de verificar para não bloquear a inicialização
    const timeoutId = setTimeout(() => {
      checkForUpdates();
    }, 2000); // 2 segundos após a inicialização

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
}

