import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Check, CheckCheck, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesignerNotificationStore } from '@/store/designerNotificationStore';
import { designerNotificationService } from '@/services/designerNotificationService';
import { useAuthStore } from '@/store/authStore';
import type { DesignerNotificationItem } from '@/types/designerNotification';
import { cn } from '@/lib/utils';

// ── Utilitários de data ──────────────────────────────────────────────────────

function formatRelative(isoDate: string): string {
  const date = new Date(isoDate);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

// ── Subcomponente: item individual ───────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
}: {
  notification: DesignerNotificationItem;
  onRead: (id: string, orderId: number) => void;
}) {
  return (
    <button
      type="button"
      id={`notification-item-${notification.notification_id}`}
      onClick={() => onRead(notification.notification_id, notification.order_id)}
      className={cn(
        'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
        'hover:bg-accent/50 focus:outline-none focus:bg-accent/50',
        !notification.read && 'bg-blue-50 dark:bg-blue-950/30',
      )}
    >
      {/* Ícone */}
      <div
        className={cn(
          'mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          notification.read
            ? 'bg-muted text-muted-foreground'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
        )}
      >
        <Package className="w-4 h-4" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug',
            notification.read ? 'text-muted-foreground' : 'font-semibold text-foreground',
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{notification.message}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{formatRelative(notification.created_at)}</p>
      </div>

      {/* Indicador de não lida */}
      {!notification.read && (
        <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" aria-label="Não lida" />
      )}
    </button>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);

  const { notifications, unreadCount } = useDesignerNotificationStore();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Escutar clique em notificação nativa (Windows)
  useEffect(() => {
    const handleNativeClick = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        order_id: number;
        notification_id: string;
      };
      designerNotificationService.markAsRead(detail.notification_id);
      navigate(`/dashboard?pedido=${detail.order_id}`);
    };

    window.addEventListener('designer-notification-native-click', handleNativeClick);
    return () => window.removeEventListener('designer-notification-native-click', handleNativeClick);
  }, [navigate]);

  const handleRead = useCallback(
    (notificationId: string, orderId: number) => {
      designerNotificationService.markAsRead(notificationId);
      setOpen(false);
      navigate(`/dashboard?pedido=${orderId}`);
    },
    [navigate],
  );

  const handleMarkAllRead = useCallback(() => {
    designerNotificationService.markAllAsRead();
  }, []);

  // Não renderizar para usuários sem notificações (que não são designers)
  if (!userId) return null;

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do sino */}
      <button
        id="notification-bell-button"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring',
          open && 'bg-accent',
        )}
        aria-label={hasUnread ? `${unreadCount} notificações não lidas` : 'Notificações'}
        title={hasUnread ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}` : 'Notificações'}
      >
        {hasUnread ? (
          <BellRing className="w-5 h-5 text-foreground animate-[wiggle_0.5s_ease-in-out]" />
        ) : (
          <Bell className="w-5 h-5 text-muted-foreground" />
        )}

        {/* Badge de contagem */}
        {hasUnread && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1',
              'flex items-center justify-center',
              'rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none',
              'ring-2 ring-background',
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          id="notification-bell-dropdown"
          className={cn(
            'absolute right-0 top-full mt-2 w-80 z-50',
            'rounded-xl border border-border bg-popover shadow-elevation-xl',
            'overflow-hidden',
          )}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notificações</span>
            {hasUnread && (
              <button
                id="notification-bell-mark-all-read"
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Check className="w-8 h-8 opacity-40" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.notification_id} notification={n} onRead={handleRead} />
              ))
            )}
          </div>

          {/* Rodapé */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5 bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Exibindo as {notifications.length} notificações mais recentes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
