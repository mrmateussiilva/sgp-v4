import { useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/store/useModalStore';
import { useOrderStore } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { logger } from '@/utils/logger';
import { buildStatusUpdatePayload } from '@/utils/orderStatusUtils';
import { OrderStatus } from '@/types';

export function OrderStatusConfirmModal() {
    const { statusConfirmModalOpen, statusConfirmPayload, closeStatusConfirmModal } = useModalStore();
    const { orders, updateOrder } = useOrderStore();
    const isAdmin = useAuthStore(state => state.isAdmin);
    const { toast } = useToast();
    const statusConfirmButtonRef = useRef<HTMLButtonElement>(null);

    const handleConfirmStatusChange = async () => {
        if (!statusConfirmPayload) return;
        const { pedidoId, campo, novoValor, nomeSetor } = statusConfirmPayload;

        if (campo === 'financeiro' && !isAdmin) {
            toast({
                title: 'Acesso negado',
                description: 'Somente administradores podem alterar o status financeiro.',
                variant: 'destructive',
            });
            closeStatusConfirmModal();
            return;
        }

        const targetOrder = orders.find((order) => order.id === pedidoId);
        if (!targetOrder) {
            closeStatusConfirmModal();
            return;
        }

        const payload = buildStatusUpdatePayload(targetOrder, campo, novoValor);

        if (campo !== 'financeiro' && 'financeiro' in payload) {
            logger.warn('⚠️ Campo financeiro está no payload mesmo não sendo alterado!', payload);
        }

        try {
            const updatedOrder = await api.updateOrderStatus(payload);
            updateOrder(updatedOrder);

            const mensagensTodosSetores =
                payload.pronto && payload.status === OrderStatus.Concluido && novoValor;

            const mensagem = mensagensTodosSetores
                ? 'Todos os setores foram marcados. Pedido concluído!'
                : payload.financeiro === false && campo === 'financeiro'
                    ? 'Financeiro desmarcado. Todos os status foram resetados.'
                    : `${nomeSetor} ${novoValor ? 'marcado' : 'desmarcado'} com sucesso!`;

            toast({
                title: 'Status atualizado',
                description: mensagem,
                variant: 'success',
            });
            closeStatusConfirmModal();
        } catch (error: unknown) {
            const err = error as any;
            const errorMessage = err?.response?.data?.detail || err?.message || 'Não foi possível atualizar o status.';
            const isForbidden = err?.response?.status === 403;
            const isFinanceiro = campo === 'financeiro';

            if (isForbidden) {
                if (isFinanceiro) {
                    toast({
                        title: 'Acesso negado',
                        description: 'Somente administradores podem atualizar o status financeiro.',
                        variant: 'destructive',
                    });
                } else {
                    toast({
                        title: '⚠️ Problema de permissão no servidor',
                        description: `O servidor está bloqueando a atualização de "${nomeSetor || campo}" exigindo permissão de administrador, mas esse campo NÃO deveria precisar de admin. Apenas o campo "Financeiro" deveria exigir essa permissão. Entre em contato com o administrador do sistema para corrigir as permissões no backend.`,
                        variant: 'destructive',
                    });
                }
            } else {
                toast({
                    title: 'Erro',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }

            if (import.meta.env.DEV) {
                logger.error('Error updating status:', error);
            }
            closeStatusConfirmModal();
        }
    };

    return (
        <Dialog
            open={statusConfirmModalOpen}
            onOpenChange={(open) => {
                if (!open) closeStatusConfirmModal();
            }}
        >
            <DialogContent
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    statusConfirmButtonRef.current?.focus();
                }}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    handleConfirmStatusChange();
                }}
            >
                <DialogHeader>
                    <DialogTitle>Confirmar Alteração de Status</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-2">
                            {statusConfirmPayload?.novoValor ? (
                                <div>
                                    Deseja marcar <strong>{statusConfirmPayload.nomeSetor}</strong> como concluído
                                    para o pedido #{statusConfirmPayload.pedidoId}?
                                </div>
                            ) : (
                                <div>
                                    <div>
                                        Deseja desmarcar <strong>{statusConfirmPayload?.nomeSetor}</strong> para o
                                        pedido #{statusConfirmPayload?.pedidoId}?
                                    </div>
                                    {statusConfirmPayload?.campo === 'financeiro' && (
                                        <div className="mt-3 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                                            ⚠️ <strong>Atenção:</strong> Ao desmarcar o Financeiro, todos os outros
                                            status (Conferência, Impressão, Costura e Expedição) também serão
                                            desmarcados!
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={closeStatusConfirmModal} type="button">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirmStatusChange}
                        ref={statusConfirmButtonRef}
                        type="button"
                    >
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
