import { create } from 'zustand';
import type { DesignerNotificationItem } from '@/types/designerNotification';

interface DesignerNotificationState {
  notifications: DesignerNotificationItem[];
  unreadCount: number;

  addNotification: (notification: DesignerNotificationItem) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  /** Substitui a lista completa (usado no fetch inicial pós-reconexão) */
  setNotifications: (notifications: DesignerNotificationItem[]) => void;
  setUnreadCount: (count: number) => void;
}

export const useDesignerNotificationStore = create<DesignerNotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const existing = get().notifications.find(
      (n) => n.notification_id === notification.notification_id,
    );
    if (existing) return; // deduplicação no store

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 100), // máx 100 na memória
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    }));
  },

  markAsRead: (notificationId) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.notification_id === notificationId ? { ...n, read: true } : n,
      );
      const unreadCount = updated.filter((n) => !n.read).length;
      return { notifications: updated, unreadCount };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  setUnreadCount: (count) => set({ unreadCount: count }),
}));
