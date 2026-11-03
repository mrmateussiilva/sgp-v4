import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Package,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesignerNotificationStore } from '@/store/designerNotificationStore';
import { designerNotificationService } from '@/services/designerNotificationService';
import { useAuthStore } from '@/store/authStore';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';
import { NotificationSettingsView } from '@/components/NotificationSettingsModal';
import type { DesignerNotificationItem } from '@/types/designerNotification';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
        'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors rounded-lg my-0.5',
        'hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:outline-none focus:bg-slate-100',
        !notification.read ? 'bg-blue-50/80 dark:bg-blue-950/40' : 'bg-transparent',
      )}
    >
      {/* Ícone */}
      <div
        className={cn(
          'mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
          notification.read
            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
        )}
      >
        <Package className="w-4 h-4" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-tight truncate',
            notification.read ? 'text-slate-600 dark:text-slate-400' : 'font-semibold text-slate-900 dark:text-slate-100',
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{notification.message}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{formatRelative(notification.created_at)}</p>
      </div>

      {/* Ponto azul de não lido */}
      {!notification.read && (
        <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-blue-600" />
      )}
    </button>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);

  const { notifications, unreadCount } = useDesignerNotificationStore();
  const { enabled, nativeDesktop } = useNotificationSettingsStore();

  // Escutar clique em notificação nativa (Windows/Linux)
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

  // Resetar visualização de configurações ao fechar o diálogo
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setShowSettings(false);
    }
  }, []);

  // Não renderizar para usuários não autenticados
  if (!userId) return null;

  const hasUnread = unreadCount > 0;
  const isSilenced = !enabled || !nativeDesktop;

  return (
    <>
      {/* Botão do sino */}
      <button
        id="notification-bell-button"
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring',
          open && 'bg-accent',
        )}
        aria-label={
          !enabled
            ? 'Notificações silenciadas (Não Perturbe)'
            : hasUnread
            ? `${unreadCount} notificações de artes não lidas`
            : 'Notificações de artes'
        }
        title={
          !enabled
            ? 'Modo "Não Perturbe" ativado (Silenciado)'
            : !nativeDesktop
            ? 'Pop-ups do Windows desativados'
            : hasUnread
            ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} de arte não lida${unreadCount > 1 ? 's' : ''}`
            : 'Notificações de artes'
        }
      >
        {!enabled ? (
          <BellOff className="w-5 h-5 text-amber-500" />
        ) : hasUnread ? (
          <BellRing className="w-5 h-5 text-blue-600 animate-[wiggle_0.5s_ease-in-out]" />
        ) : (
          <Bell className="w-5 h-5 text-muted-foreground" />
        )}

        {/* Badge de contagem */}
        {enabled && hasUnread && (
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

        {/* Indicador de modo silencioso quando não houver unread */}
        {isSilenced && (!hasUnread || !enabled) && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 w-2.5 h-2.5',
              'rounded-full ring-2 ring-background',
              !enabled ? 'bg-amber-500' : 'bg-slate-400'
            )}
            title={!enabled ? 'Não Perturbe Ativo' : 'Pop-ups silenciados'}
          />
        )}
      </button>

      {/* Modal Centralizado */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] p-0 overflow-hidden flex flex-col rounded-xl shadow-2xl border">
          {/* Cabeçalho */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                {showSettings && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(false)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground mr-1"
                    title="Voltar para notificações"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  {showSettings ? (
                    <>
                      <Settings className="w-5 h-5 text-primary" />
                      Preferências de Notificação
                    </>
                  ) : (
                    <>
                      {!enabled ? (
                        <BellOff className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Bell className="w-5 h-5 text-blue-600" />
                      )}
                      Notificações de Artes
                    </>
                  )}
                </DialogTitle>
              </div>

              <div className="flex items-center gap-1.5">
                {!showSettings && hasUnread && (
                  <Button
                    id="notification-bell-mark-all-read"
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-1.5 font-medium"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Marcar lidas
                  </Button>
                )}

                <Button
                  type="button"
                  variant={showSettings ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    showSettings && 'bg-accent text-accent-foreground'
                  )}
                  title={showSettings ? 'Ver notificações' : 'Configurar notificações e pop-ups'}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {showSettings
                ? 'Escolha quais avisos, pop-ups do Windows e balões de tela você deseja receber.'
                : 'Acompanhe novas artes atribuídas diretamente ao seu usuário em tempo real.'}
            </DialogDescription>
          </DialogHeader>

          {/* Conteúdo Dinâmico: Configurações ou Lista */}
          {showSettings ? (
            <NotificationSettingsView onBack={() => setShowSettings(false)} />
          ) : (
            <>
              {/* Aviso quando Não Perturbe estiver ativo */}
              {!enabled && (
                <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <BellOff className="w-3.5 h-3.5 text-amber-600" />
                    Modo "Não Perturbe" está ativo nesta máquina.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="underline hover:text-amber-900 dark:hover:text-amber-100 font-semibold"
                  >
                    Configurar
                  </button>
                </div>
              )}

              {/* Lista de Notificações */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-3">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Check className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium">Nenhuma notificação de arte por enquanto</p>
                    <p className="text-xs text-muted-foreground">Você não possui novas artes atribuídas pendentes!</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <NotificationItem key={n.notification_id} notification={n} onRead={handleRead} />
                  ))
                )}
              </div>

              {/* Rodapé */}
              {notifications.length > 0 && (
                <div className="border-t px-6 py-3 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
                  <span className="font-medium">{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</span>
                  <span>Exibindo as {notifications.length} notificações de artes mais recentes</span>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
