import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDesignerNotificationStore } from '@/store/designerNotificationStore';
import { designerNotificationService } from '@/services/designerNotificationService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

/**
 * Hook responsável por:
 *  1. Iniciar o serviço de escuta de WebSocket quando o usuário está autenticado
 *  2. Buscar notificações não lidas do backend ao abrir/reconectar o app
 *  3. Exibir um resumo discreto se houver muitas notificações perdidas
 *  4. Expor estado e ações do store para componentes
 */
export function useDesignerNotifications() {
  const { sessionToken, userId } = useAuthStore();
  const { toast } = useToast();
  const { notifications, unreadCount } = useDesignerNotificationStore();

  // Iniciar / parar serviço de WebSocket conforme autenticação
  useEffect(() => {
    if (sessionToken && userId) {
      designerNotificationService.start();
      logger.debug('[useDesignerNotifications] Serviço iniciado para user_id:', userId);
    } else {
      designerNotificationService.stop();
    }

    return () => {
      designerNotificationService.stop();
    };
  }, [sessionToken, userId]);

  // Buscar notificações não lidas ao autenticar (app pode ter estado fechado)
  useEffect(() => {
    if (!sessionToken || !userId) return;

    const loadUnread = async () => {
      try {
        const count = await designerNotificationService.fetchUnreadFromBackend();

        if (count > 1) {
          // Resumo: não spammar notificações nativas antigas
          toast({
            title: `${count} novas artes aguardando`,
            description: 'Você tem notificações de artes para trabalhar.',
            variant: 'info',
            duration: 6000,
          });
        }
        // Se count === 1, a notificação já está no store; o sino mostrará o badge
      } catch (err) {
        logger.warn('[useDesignerNotifications] Erro ao buscar notificações iniciais:', err);
      }
    };

    // Pequeno delay para garantir que o WebSocket já conectou
    const timer = setTimeout(loadUnread, 2000);
    return () => clearTimeout(timer);
  }, [sessionToken, userId, toast]);

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      designerNotificationService.markAsRead(notificationId);
    },
    [],
  );

  const handleMarkAllAsRead = useCallback(() => {
    designerNotificationService.markAllAsRead();
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  };
}
