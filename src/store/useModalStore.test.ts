import { describe, it, expect, beforeEach } from 'vitest';
import { useModalStore } from './useModalStore';

// Note: Zustand uses a default singleton store. 
// For tests, we might want to clear it between tests if order matters, 
// but state changes are simple enough here.

describe('useModalStore', () => {
    beforeEach(() => {
        useModalStore.getState().closeAllModals();
    });

    it('opens and closes view modal properly', () => {
        expect(useModalStore.getState().viewModalOpen).toBe(false);
        const mockOrder = { id: 1 } as any;

        useModalStore.getState().openViewModal(mockOrder);

        expect(useModalStore.getState().viewModalOpen).toBe(true);
        expect(useModalStore.getState().selectedOrderForView).toBe(mockOrder);

        useModalStore.getState().closeViewModal();

        expect(useModalStore.getState().viewModalOpen).toBe(false);
        expect(useModalStore.getState().selectedOrderForView).toBe(null);
    });

    it('detects when any modal is open', () => {
        expect(useModalStore.getState().isAnyModalOpen()).toBe(false);

        useModalStore.getState().openEditModal(10);
        expect(useModalStore.getState().isAnyModalOpen()).toBe(true);

        useModalStore.getState().closeAllModals();
        expect(useModalStore.getState().isAnyModalOpen()).toBe(false);
    });

    it('closes all modals when closeAllModals is called', () => {
        useModalStore.getState().openEditModal(1);
        useModalStore.getState().openDeleteModal(1);
        useModalStore.getState().openShortcutsModal();

        expect(useModalStore.getState().editDialogOpen).toBe(true);
        expect(useModalStore.getState().deleteDialogOpen).toBe(true);
        expect(useModalStore.getState().shortcutsModalOpen).toBe(true);

        useModalStore.getState().closeAllModals();

        expect(useModalStore.getState().editDialogOpen).toBe(false);
        expect(useModalStore.getState().deleteDialogOpen).toBe(false);
        expect(useModalStore.getState().shortcutsModalOpen).toBe(false);
    });
});
