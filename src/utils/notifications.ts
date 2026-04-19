import { isTauri } from './isTauri';

export interface NativeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
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
 * Envia uma notificação nativa do sistema
 */
export async function sendNativeNotification(options: NativeNotificationOptions): Promise<void> {
  const { title, body } = options;

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

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png' // Ícone padrão
    });
  }
}
