import { describe, it, expect, beforeEach } from 'vitest';
import { useModalStore } from '../../store/useModalStore';

describe('useModalStore (Modal Decoupling)', () => {
    // Setup: Reset the store before each test
    beforeEach(() => {
        useModalStore.setState({
            deleteDialogOpen: false,
            orderToDelete: null,
            duplicateDialogOpen: false,
            orderToDuplicate: null,
            replacementDialogOpen: false,
            orderToReplace: null,
            statusConfirmModalOpen: false,
            statusConfirmPayload: null,
            viewModalOpen: false,
            selectedOrderForView: null,
            editDialogOpen: false,
            editOrderId: null,
            shortcutsModalOpen: false,
        });
    });

    it('should verify initial state is closed', () => {
        const state = useModalStore.getState();
        expect(state.isAnyModalOpen()).toBe(false);
        expect(state.deleteDialogOpen).toBe(false);
    });

    it('should open and close Delete Modal', () => {
        // Open
        useModalStore.getState().openDeleteModal(123);
        let state = useModalStore.getState();
        expect(state.deleteDialogOpen).toBe(true);
        expect(state.orderToDelete).toBe(123);
        expect(state.isAnyModalOpen()).toBe(true);

        // Close
        useModalStore.getState().closeDeleteModal();
        state = useModalStore.getState();
        expect(state.deleteDialogOpen).toBe(false);
        expect(state.orderToDelete).toBe(null);
    });

    it('should open and close Duplicate Modal', () => {
        const mockOrder = { id: 456, cliente: 'Test' } as any;

        useModalStore.getState().openDuplicateModal(mockOrder);
        let state = useModalStore.getState();
        expect(state.duplicateDialogOpen).toBe(true);
        expect(state.orderToDuplicate).toEqual(mockOrder);

        useModalStore.getState().closeDuplicateModal();
        state = useModalStore.getState();
        expect(state.duplicateDialogOpen).toBe(false);
        expect(state.orderToDuplicate).toBe(null);
    });

    it('should correctly report isAnyModalOpen', () => {
        expect(useModalStore.getState().isAnyModalOpen()).toBe(false);

        useModalStore.getState().openEditModal(999);
        expect(useModalStore.getState().isAnyModalOpen()).toBe(true);

        useModalStore.getState().closeEditModal();
        expect(useModalStore.getState().isAnyModalOpen()).toBe(false);
    });

    it('should close all modals at once', () => {
        const mockOrder = { id: 1 } as any;
        useModalStore.getState().openViewModal(mockOrder);
        useModalStore.getState().openEditModal(1);

        expect(useModalStore.getState().viewModalOpen).toBe(true);
        expect(useModalStore.getState().editDialogOpen).toBe(true);

        useModalStore.getState().closeAllModals();

        const state = useModalStore.getState();
        expect(state.viewModalOpen).toBe(false);
        expect(state.editDialogOpen).toBe(false);
        expect(state.isAnyModalOpen()).toBe(false);
    });
});
