import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface NotificationSettings {
  /** Master switch: se false, silencia qualquer aviso visual/sonoro/popup */
  enabled: boolean;
  /** Pop-ups nativos do Windows / SO / Tauri */
  nativeDesktop: boolean;
  /** Toasts / balões flutuantes na tela do app */
  inAppToasts: boolean;
  /** Notificações relacionadas a pedidos (novos, status, exclusão) */
  orderEvents: boolean;
  /** Notificações relacionadas a artes prontas de designers */
  designerEvents: boolean;
}

interface NotificationSettingsState extends NotificationSettings {
  setEnabled: (enabled: boolean) => void;
  setNativeDesktop: (nativeDesktop: boolean) => void;
  setInAppToasts: (inAppToasts: boolean) => void;
  setOrderEvents: (orderEvents: boolean) => void;
  setDesignerEvents: (designerEvents: boolean) => void;
  toggleMaster: () => void;
  resetDefaults: () => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  nativeDesktop: true,
  inAppToasts: true,
  orderEvents: true,
  designerEvents: true,
};

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setEnabled: (enabled) => set({ enabled }),
      setNativeDesktop: (nativeDesktop) => set({ nativeDesktop }),
      setInAppToasts: (inAppToasts) => set({ inAppToasts }),
      setOrderEvents: (orderEvents) => set({ orderEvents }),
      setDesignerEvents: (designerEvents) => set({ designerEvents }),

      toggleMaster: () => set((state) => ({ enabled: !state.enabled })),

      resetDefaults: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'sgp_notification_settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

