import { useModalStore } from '@/store/useModalStore';
import { useOrderStore } from '@/store/orderStore';
import { OrderDeleteModal } from './OrderDeleteModal';
import { OrderDuplicateModal } from './OrderDuplicateModal';
import { OrderReplacementModal } from './OrderReplacementModal';
import { OrderStatusConfirmModal } from './OrderStatusConfirmModal';
import { OrderViewModal } from '@/components/OrderViewModal';
import { OrderQuickEditDialog } from '@/components/OrderQuickEditDialog';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';

export function OrderModalsProvider() {
    const {
        viewModalOpen, selectedOrderForView, closeViewModal,
        editDialogOpen, editOrderId, closeEditModal,
        shortcutsModalOpen, closeShortcutsModal
    } = useModalStore();

    const updateOrder = useOrderStore(state => state.updateOrder);
    const setSelectedOrder = useOrderStore(state => state.setSelectedOrder);

    // Fallback handler for ShortcutsHelp: we assume ShortcutsHelp receives shortcuts array.
    // In OrderList it was a static layout, we'll redefine the minimum needed here or 
    // allow the user to check the original implementation in OrderList.tsx.
    // For now we'll pass an empty array, or the app might complain if it requires it.
    // Wait, ShortcutsHelp expects `shortcuts` prop. We can define the global shortcuts array here!

    const staticShortcuts = [
        { key: 'ArrowUp', description: 'Navegar entre pedidos', action: () => {} },
        { key: 'v', description: 'Visualizar pedido selecionado', action: () => {} },
        { key: 'e', description: 'Editar pedido selecionado', action: () => {} },
        { key: 'Delete', description: 'Deletar pedido selecionado', action: () => {} },
        { key: 'p', description: 'Imprimir pedido selecionado', action: () => {} },
        { key: '1', description: 'Alternar status (Fin/Conf/Sub/Cos/Exp)', action: () => {} },
        { key: 'Escape', description: 'Fechar modal / Limpar seleção', action: () => {} },
    ];

    return (
        <>
            <OrderDeleteModal />
            <OrderDuplicateModal />
            <OrderReplacementModal />
            <OrderStatusConfirmModal />

            <OrderViewModal
                isOpen={viewModalOpen}
                onClose={closeViewModal}
                order={selectedOrderForView}
                onOrderUpdate={(updatedOrder) => {
                    // Atualiza na store
                    useModalStore.setState({ selectedOrderForView: updatedOrder });
                    updateOrder(updatedOrder);
                }}
            />

            <OrderQuickEditDialog
                orderId={editOrderId}
                open={editDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditModal();
                    }
                }}
                onUpdated={(order) => {
                    updateOrder(order);
                    setSelectedOrder(order);
                    if (selectedOrderForView && selectedOrderForView.id === order.id) {
                        useModalStore.setState({ selectedOrderForView: order });
                    }
                }}
            />

            <ShortcutsHelp
                open={shortcutsModalOpen}
                onOpenChange={(open) => {
                    if (!open) closeShortcutsModal();
                }}
                shortcuts={staticShortcuts}
                title="Atalhos — Lista de pedidos"
            />
        </>
    );
}
