/**
 * Serviço singleton de notificações de designers.
 *
 * Responsabilidades:
 *  1. Inscrever-se no ordersSocket para receber eventos `designer_art_ready`
 *  2. Validar se o evento é destinado ao usuário logado
 *  3. Deduplicar por `notification_id`
 *  4. Adicionar ao store Zustand
 *  5. Disparar notificação nativa via Tauri
 *  6. Emitir evento DOM customizado para navegação ao clicar
 *
 * Uso: inicializar uma única vez em App.tsx ou no hook useDesignerNotifications.
 */

import { ordersSocket, type OrderEventMessage } from '@/lib/realtimeOrders';
import { useDesignerNotificationStore } from '@/store/designerNotificationStore';
import { sendNativeNotification } from '@/utils/notifications';
import { logger } from '@/utils/logger';
import type {
  DesignerArtReadyEvent,
  DesignerNotificationItem,
  DesignerNotificationApiItem,
} from '@/types/designerNotification';
import { getApiUrl } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

// Chave de sessão para deduplicação persistida entre renders
const SEEN_KEY = 'sgp_designer_notif_seen';

function getSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markSeen(id: string): void {
  try {
    const seen = getSeenIds();
    seen.add(id);
    // Limitar a 500 IDs para não crescer indefinidamente
    const arr = Array.from(seen).slice(-500);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    // sessionStorage pode estar indisponível — ignorar silenciosamente
  }
}

function isDesignerArtReadyEvent(message: OrderEventMessage): message is OrderEventMessage & DesignerArtReadyEvent {
  return (
    message.type === 'designer_art_ready' &&
    typeof (message as Record<string, unknown>).notification_id === 'string' &&
    typeof (message as Record<string, unknown>).user_id === 'number'
  );
}

class DesignerNotificationService {
  private unsubscribe: (() => void) | null = null;

  /**
   * Inicializa a escuta de eventos. Seguro para chamar múltiplas vezes —
   * a assinatura anterior é cancelada antes de criar a nova.
   */
  start(): void {
    this.stop();
    this.unsubscribe = ordersSocket.subscribe(this.handleMessage);
    logger.debug('[DesignerNotif] Serviço iniciado — aguardando eventos designer_art_ready');
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private handleMessage = (message: OrderEventMessage): void => {
    if (!isDesignerArtReadyEvent(message)) return;

    const event = message as unknown as DesignerArtReadyEvent;
    const { userId } = useAuthStore.getState();

    // Validar destinatário
    if (event.user_id !== userId) {
      logger.debug('[DesignerNotif] Evento ignorado — destinatário diferente:', event.user_id, '!= atual', userId);
      return;
    }

    // Deduplicar
    const seen = getSeenIds();
    if (seen.has(event.notification_id)) {
      logger.debug('[DesignerNotif] Evento duplicado ignorado:', event.notification_id);
      return;
    }
    markSeen(event.notification_id);

    const notification: DesignerNotificationItem = { ...event, read: false };

    // Adicionar ao store
    useDesignerNotificationStore.getState().addNotification(notification);

    // Disparar notificação nativa
    this.sendNative(notification);

    logger.info('[DesignerNotif] Notificação recebida:', event.title, '| pedido:', event.order_id);
  };

  private sendNative(notification: DesignerNotificationItem): void {
    sendNativeNotification({
      title: notification.title,
      body: notification.message,
      tag: `designer-notif-${notification.notification_id}`,
    })
      .then(() => {
        // Registrar callback de clique via evento DOM customizado
        // O componente NotificationBell (ou handler global) escuta esse evento
        window.dispatchEvent(
          new CustomEvent('designer-notification-native-click', {
            detail: {
              order_id: notification.order_id,
              art_id: notification.art_id,
              notification_id: notification.notification_id,
            },
          }),
        );
      })
      .catch((err) => {
        logger.warn('[DesignerNotif] Falha ao exibir notificação nativa:', err);
      });
  }

  /**
   * Busca notificações não lidas do backend (cenário de app fechado / reconexão).
   * Adiciona ao store e retorna o total não lido.
   */
  async fetchUnreadFromBackend(): Promise<number> {
    const apiUrl = getApiUrl();
    const token = useAuthStore.getState().sessionToken;

    if (!apiUrl || !token) return 0;

    try {
      const response = await fetch(`${apiUrl}/api/notificacoes/designer?include_read=false&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        logger.warn('[DesignerNotif] Falha ao buscar notificações do backend:', response.status);
        return 0;
      }

      const data: DesignerNotificationApiItem[] = await response.json();

      // Converter para o formato interno
      const items: DesignerNotificationItem[] = data.map((item) => ({
        type: 'designer_art_ready',
        notification_id: item.notification_id,
        user_id: item.user_id,
        order_id: item.order_id,
        art_id: item.art_id ?? undefined,
        title: item.titulo,
        message: item.mensagem,
        created_at: item.created_at,
        read: item.visualizada,
      }));

      const store = useDesignerNotificationStore.getState();
      store.setNotifications(items);

      return items.filter((n) => !n.read).length;
    } catch (err) {
      logger.warn('[DesignerNotif] Erro ao buscar notificações do backend:', err);
      return 0;
    }
  }

  /**
   * Marca uma notificação como lida no backend e no store local.
   */
  async markAsRead(notificationId: string): Promise<void> {
    const apiUrl = getApiUrl();
    const token = useAuthStore.getState().sessionToken;

    // Otimista: atualizar store imediatamente
    useDesignerNotificationStore.getState().markAsRead(notificationId);

    if (!apiUrl || !token) return;

    try {
      await fetch(`${apiUrl}/api/notificacoes/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      logger.warn('[DesignerNotif] Erro ao marcar notificação como lida:', err);
    }
  }

  /**
   * Marca todas as notificações como lidas no backend e no store local.
   */
  async markAllAsRead(): Promise<void> {
    const apiUrl = getApiUrl();
    const token = useAuthStore.getState().sessionToken;

    // Otimista: atualizar store imediatamente
    useDesignerNotificationStore.getState().markAllAsRead();

    if (!apiUrl || !token) return;

    try {
      await fetch(`${apiUrl}/api/notificacoes/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      logger.warn('[DesignerNotif] Erro ao marcar todas notificações como lidas:', err);
    }
  }
}

export const designerNotificationService = new DesignerNotificationService();
