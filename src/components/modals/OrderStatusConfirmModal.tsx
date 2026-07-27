import { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useModalStore } from '@/store/useModalStore';
import { useOrderStore } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { logger } from '@/utils/logger';
import { buildStatusUpdatePayload } from '@/utils/orderStatusUtils';
import { OrderStatus } from '@/types';
import { Calendar, Clock } from 'lucide-react';

export function OrderStatusConfirmModal() {
    const { statusConfirmModalOpen, statusConfirmPayload, closeStatusConfirmModal } = useModalStore();
    const { orders, updateOrder } = useOrderStore();
    const isAdmin = useAuthStore(state => state.isAdmin);
    const { toast } = useToast();
    const statusConfirmButtonRef = useRef<HTMLButtonElement>(null);

    const getTodayString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getYesterdayString = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [completionDate, setCompletionDate] = useState<string>(getTodayString());

    useEffect(() => {
        if (statusConfirmModalOpen) {
            setCompletionDate(getTodayString());
        }
    }, [statusConfirmModalOpen]);

    const isCompletionStage = Boolean(
        statusConfirmPayload?.novoValor &&
        (statusConfirmPayload?.campo === 'expedicao' || statusConfirmPayload?.campo === 'pronto')
    );

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
        if (isCompletionStage && completionDate) {
            if (completionDate > getTodayString()) {
                toast({
                    title: 'Data inválida',
                    description: 'A data de conclusão não pode ser uma data futura.',
                    variant: 'destructive',
                });
                return;
            }
            payload.data_conclusao = completionDate;
        }

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
                        <div className="space-y-3">
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

                            {isCompletionStage && (
                                <div className="mt-3 p-3 bg-muted/60 dark:bg-muted/30 rounded-lg border text-left space-y-2">
                                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span>Data Real de Conclusão na Fábrica:</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={completionDate === getTodayString() ? "default" : "outline"}
                                            size="sm"
                                            className="h-7 text-xs flex-1 font-bold"
                                            onClick={() => setCompletionDate(getTodayString())}
                                        >
                                            <Clock className="h-3 w-3 mr-1" />
                                            Hoje
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={completionDate === getYesterdayString() ? "default" : "outline"}
                                            size="sm"
                                            className="h-7 text-xs flex-1 font-bold"
                                            onClick={() => setCompletionDate(getYesterdayString())}
                                        >
                                            Ontem
                                        </Button>
                                    </div>
                                    <div>
                                        <Input
                                            type="date"
                                            value={completionDate}
                                            onChange={(e) => setCompletionDate(e.target.value)}
                                            className="h-8 text-xs font-mono bg-background"
                                            max={getTodayString()}
                                        />
                                    </div>
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
