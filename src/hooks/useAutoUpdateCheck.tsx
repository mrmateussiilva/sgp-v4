import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { fetch } from '@tauri-apps/plugin-http';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

interface UpdateResponse {
  version: string;
  notes?: string;
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
        // Obter versão atual do app
        const appVersion = await invoke<string>('get_app_version');

        // Consultar API externa
        const response = await fetch('https://sgp.finderbit.com.br/update', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          connectTimeout: 10000, // 10 segundos de timeout
        });

        if (!response.ok) {
          // Silenciosamente falha se não conseguir verificar
          return;
        }

        const data: UpdateResponse = await response.json();

        // Validar resposta
        if (!data || !data.version) {
          return;
        }

        // Comparar versões
        if (compareVersions(appVersion, data.version) < 0) {
          // Há atualização disponível - mostrar notificação
          toast({
            title: '🔄 Nova versão disponível!',
            description: `Versão ${data.version} está disponível. Você está usando ${appVersion}.`,
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
        }
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

// Função para comparar versões (formato semver: X.Y.Z)
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

