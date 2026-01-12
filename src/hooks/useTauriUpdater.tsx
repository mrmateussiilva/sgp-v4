import { useEffect, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';

/**
 * Hook que verifica automaticamente atualizações usando o updater oficial do Tauri
 * Executa apenas uma vez por inicialização
 */
export function useTauriUpdater() {
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Verificar apenas uma vez quando o componente monta
    if (hasCheckedRef.current) {
      return;
    }

    const checkForUpdates = async () => {
      try {
        console.info('[Updater] Verificando atualizações...');
        
        const update = await check({
          target: undefined, // Deixa o Tauri escolher automaticamente
        });

        if (!update) {
          console.info('[Updater] Aplicação está atualizada');
          hasCheckedRef.current = true;
          return;
        }

        console.info(`[Updater] Nova versão disponível: ${update.version}`);
        console.info(`[Updater] Versão atual: ${update.currentVersion}`);
        console.info(`[Updater] Notas: ${update.body || 'Sem notas disponíveis'}`);
        
        // O diálogo do Tauri será exibido automaticamente se dialog: true no tauri.conf.json
        // Se o usuário aceitar, o download e instalação acontecem automaticamente
        
        hasCheckedRef.current = true;
        
      } catch (error) {
        // Erros são silenciosos na inicialização para não perturbar o usuário
        console.error('[Updater] Erro ao verificar atualizações:', error);
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
  }, []);
}
