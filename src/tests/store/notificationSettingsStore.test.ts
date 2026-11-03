import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';

describe('notificationSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useNotificationSettingsStore.getState().resetDefaults();
  });

  it('deve iniciar com valores padrões ativados', () => {
    const state = useNotificationSettingsStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.nativeDesktop).toBe(true);
    expect(state.inAppToasts).toBe(true);
    expect(state.orderEvents).toBe(true);
    expect(state.designerEvents).toBe(true);
  });

  it('deve alternar o master switch', () => {
    const store = useNotificationSettingsStore.getState();
    store.setEnabled(false);
    expect(useNotificationSettingsStore.getState().enabled).toBe(false);

    store.toggleMaster();
    expect(useNotificationSettingsStore.getState().enabled).toBe(true);
  });

  it('deve permitir desativar apenas notificações nativas do desktop', () => {
    const store = useNotificationSettingsStore.getState();
    store.setNativeDesktop(false);

    const state = useNotificationSettingsStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.nativeDesktop).toBe(false);
    expect(state.inAppToasts).toBe(true);
  });

  it('deve restaurar configurações padrão', () => {
    const store = useNotificationSettingsStore.getState();
    store.setEnabled(false);
    store.setNativeDesktop(false);
    store.setInAppToasts(false);

    store.resetDefaults();

    const state = useNotificationSettingsStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.nativeDesktop).toBe(true);
    expect(state.inAppToasts).toBe(true);
  });
});

