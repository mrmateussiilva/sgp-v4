import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/store/useModalStore';
import { useOrderStore } from '@/store/orderStore';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { logger } from '@/utils/logger';

export function OrderDeleteModal() {
    const { deleteDialogOpen, orderToDelete, closeDeleteModal } = useModalStore();
    const removeOrder = useOrderStore((state) => state.removeOrder);
    const { toast } = useToast();

    const handleDeleteConfirm = async () => {
        if (orderToDelete) {
            try {
                await api.deleteOrder(orderToDelete);
                removeOrder(orderToDelete);
                toast({
                    title: 'Pedido excluído',
                    description: 'O pedido foi excluído com sucesso!',
                    variant: 'info',
                });
            } catch (error: any) {
                const errorMessage =
                    error?.response?.data?.detail || error?.message || 'Não foi possível excluir o pedido.';
                const isForbidden = error?.response?.status === 403;

                toast({
                    title: isForbidden ? 'Acesso negado' : 'Erro',
                    description: isForbidden
                        ? 'Somente administradores podem executar esta ação.'
                        : errorMessage,
                    variant: 'destructive',
                });
                logger.error('Error deleting order:', error);
            }
        }
        closeDeleteModal();
    };

    return (
        <Dialog open={deleteDialogOpen} onOpenChange={closeDeleteModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDeleteModal}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteConfirm}>
                        Excluir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
