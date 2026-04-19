import { isTauri } from './isTauri';

export interface NativeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

/**
 * Solicita permissão para enviar notificações do sistema
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
      let permission = await isPermissionGranted();
      if (!permission) {
        permission = (await requestPermission()) === 'granted';
      }
      return permission;
    } catch (err) {
      console.error('Erro ao solicitar permissão de notificação no Tauri:', err);
      return false;
    }
  }

  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações desktop');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Registra o Service Worker de notificações push se ainda não estiver ativo.
 * Retorna o ServiceWorkerRegistration ou null se não suportado/falhou.
 */
async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    // Verificar se já existe um SW registrado (pode ser o do vite-plugin-pwa)
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;

    // Registrar o SW de push customizado
    const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('[SGP Notifications] Erro ao obter/registrar service worker:', err);
    return null;
  }
}

/**
 * Envia uma notificação nativa do sistema.
 * Na Web/PWA: usa o Service Worker para exibir na barra de notificações
 * (funciona mesmo quando o app está fechado ou em segundo plano).
 * No Tauri: usa o plugin nativo de notificação.
 */
export async function sendNativeNotification(options: NativeNotificationOptions): Promise<void> {
  const { title, body, icon, tag } = options;

  if (isTauri()) {
    try {
      const { sendNotification } = await import('@tauri-apps/plugin-notification');
      sendNotification({ title, body });
      return;
    } catch (err) {
      console.error('Erro ao enviar notificação no Tauri:', err);
      // Fallback para Web API se o plugin falhar
    }
  }

  if (Notification.permission !== 'granted') return;

  // Tentar enviar via Service Worker primeiro (aparece na barra de notificações,
  // funciona mesmo com o app em segundo plano ou fechado)
  try {
    const swReg = await getSwRegistration();
    if (swReg?.active) {
      swReg.active.postMessage({
        type: 'SGP_NOTIFICATION',
        title,
        body,
        icon: icon || '/pwa-192x192.png',
        tag: tag || 'sgp-order-event',
      });
      return;
    }

    // Se o SW ainda não está ativo mas existe, usar showNotification diretamente
    if (swReg) {
      await swReg.showNotification(title, {
        body,
        icon: icon || '/pwa-192x192.png',
        tag: tag || 'sgp-order-event',
        renotify: true,
        vibrate: [200, 100, 200],
      } as NotificationOptions);
      return;
    }
  } catch (err) {
    console.warn('[SGP Notifications] Falha ao enviar via SW, usando Notification API:', err);
  }

  // Fallback: new Notification() (funciona só com app aberto, mas garante compatibilidade)
  new Notification(title, {
    body,
    icon: icon || '/pwa-192x192.png',
    tag: tag || 'sgp-order-event',
  });
}
