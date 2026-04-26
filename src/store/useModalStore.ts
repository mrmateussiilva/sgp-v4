import { create } from 'zustand';
import { OrderWithItems } from '../types';

export type StatusConfirmPayload = {
    pedidoId: number;
    campo: string;
    novoValor: boolean;
    nomeSetor: string;
};

interface ModalState {
    // Configuração View Modal
    viewModalOpen: boolean;
    selectedOrderForView: OrderWithItems | null;
    openViewModal: (order: OrderWithItems) => void;
    closeViewModal: () => void;

    // Configuração Edit Modal
    editDialogOpen: boolean;
    editOrderId: number | null;
    openEditModal: (orderId: number) => void;
    closeEditModal: () => void;

    // Configuração Delete Modal
    deleteDialogOpen: boolean;
    orderToDelete: number | null;
    openDeleteModal: (orderId: number) => void;
    closeDeleteModal: () => void;

    // Configuração Duplicate Modal
    duplicateDialogOpen: boolean;
    orderToDuplicate: OrderWithItems | null;
    openDuplicateModal: (order: OrderWithItems) => void;
    closeDuplicateModal: () => void;

    // Configuração Replacement Modal
    replacementDialogOpen: boolean;
    orderToReplace: OrderWithItems | null;
    openReplacementModal: (order: OrderWithItems) => void;
    closeReplacementModal: () => void;

    // Configuração Status Confirm Modal
    statusConfirmModalOpen: boolean;
    statusConfirmPayload: StatusConfirmPayload | null;
    openStatusConfirmModal: (payload: StatusConfirmPayload) => void;
    closeStatusConfirmModal: () => void;

    // Configuração Shortcuts Modal
    shortcutsModalOpen: boolean;
    openShortcutsModal: () => void;
    closeShortcutsModal: () => void;

    // Helpers
    isAnyModalOpen: () => boolean;
    closeAllModals: () => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
    viewModalOpen: false,
    selectedOrderForView: null,
    openViewModal: (order) => set({ viewModalOpen: true, selectedOrderForView: order }),
    closeViewModal: () => set({ viewModalOpen: false, selectedOrderForView: null }),

    editDialogOpen: false,
    editOrderId: null,
    openEditModal: (orderId) => set({ editDialogOpen: true, editOrderId: orderId }),
    closeEditModal: () => set({ editDialogOpen: false, editOrderId: null }),

    deleteDialogOpen: false,
    orderToDelete: null,
    openDeleteModal: (orderId) => set({ deleteDialogOpen: true, orderToDelete: orderId }),
    closeDeleteModal: () => set({ deleteDialogOpen: false, orderToDelete: null }),

    duplicateDialogOpen: false,
    orderToDuplicate: null,
    openDuplicateModal: (order) => set({ duplicateDialogOpen: true, orderToDuplicate: order }),
    closeDuplicateModal: () => set({ duplicateDialogOpen: false, orderToDuplicate: null }),

    replacementDialogOpen: false,
    orderToReplace: null,
    openReplacementModal: (order) => set({ replacementDialogOpen: true, orderToReplace: order }),
    closeReplacementModal: () => set({ replacementDialogOpen: false, orderToReplace: null }),

    statusConfirmModalOpen: false,
    statusConfirmPayload: null,
    openStatusConfirmModal: (payload) => set({ statusConfirmModalOpen: true, statusConfirmPayload: payload }),
    closeStatusConfirmModal: () => set({ statusConfirmModalOpen: false, statusConfirmPayload: null }),

    shortcutsModalOpen: false,
    openShortcutsModal: () => set({ shortcutsModalOpen: true }),
    closeShortcutsModal: () => set({ shortcutsModalOpen: false }),

    isAnyModalOpen: () => {
        const s = get();
        return s.viewModalOpen ||
            s.editDialogOpen ||
            s.deleteDialogOpen ||
            s.duplicateDialogOpen ||
            s.replacementDialogOpen ||
            s.statusConfirmModalOpen ||
            s.shortcutsModalOpen;
    },
    closeAllModals: () => set({
        viewModalOpen: false,
        selectedOrderForView: null,
        editDialogOpen: false,
        editOrderId: null,
        deleteDialogOpen: false,
        orderToDelete: null,
        duplicateDialogOpen: false,
        orderToDuplicate: null,
        replacementDialogOpen: false,
        orderToReplace: null,
        statusConfirmModalOpen: false,
        statusConfirmPayload: null,
        shortcutsModalOpen: false,
    })
}));
