import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useModalStore } from '@/store/useModalStore';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { logger } from '@/utils/logger';

export function OrderDuplicateModal() {
    const { duplicateDialogOpen, orderToDuplicate, closeDuplicateModal } = useModalStore();
    const { toast } = useToast();

    const [duplicateDataEntrada, setDuplicateDataEntrada] = useState('');
    const [duplicateDataEntrega, setDuplicateDataEntrega] = useState('');
    const [duplicateDateError, setDuplicateDateError] = useState<string | null>(null);

    // Inicializa os dados e reseta sempre que dialog abrir baseado numa nova order
    useEffect(() => {
        if (duplicateDialogOpen && orderToDuplicate) {
            const hoje = new Date().toISOString().split('T')[0];
            const dataEntrega = orderToDuplicate.data_entrega || '';
            setDuplicateDataEntrada(hoje);
            setDuplicateDataEntrega(dataEntrega);
            setDuplicateDateError(validateDuplicateDates(hoje, dataEntrega));
        }
    }, [duplicateDialogOpen, orderToDuplicate]);

    const validateDuplicateDates = (dataEntrada: string, dataEntrega: string): string | null => {
        if (!dataEntrada) return null; // Data de entrada é obrigatória mas validação será feita no submit
        if (!dataEntrega) return null; // Data de entrega é opcional

        const entrada = new Date(dataEntrada);
        const saida = new Date(dataEntrega);

        if (entrada > saida) {
            return 'Data de entrada não pode ser maior que data de entrega';
        }

        return null;
    };

    const handleDuplicateDateChange = (field: 'entrada' | 'entrega', value: string) => {
        if (field === 'entrada') {
            setDuplicateDataEntrada(value);
            if (duplicateDataEntrega) {
                setDuplicateDateError(validateDuplicateDates(value, duplicateDataEntrega));
            }
        } else {
            setDuplicateDataEntrega(value);
            if (duplicateDataEntrada) {
                setDuplicateDateError(validateDuplicateDates(duplicateDataEntrada, value));
            }
        }
    };

    const handleDuplicateConfirm = async () => {
        if (!orderToDuplicate) return;

        // Validar datas antes de confirmar
        if (duplicateDataEntrada && duplicateDataEntrega) {
            const dateError = validateDuplicateDates(duplicateDataEntrada, duplicateDataEntrega);
            if (dateError) {
                toast({
                    title: 'Erro de Validação',
                    description: dateError,
                    variant: 'destructive',
                });
                return;
            }
        }

        // Validar que data de entrada foi preenchida
        if (!duplicateDataEntrada) {
            toast({
                title: 'Erro de Validação',
                description: 'Data de entrada é obrigatória',
                variant: 'destructive',
            });
            return;
        }

        try {
            closeDuplicateModal();

            toast({
                title: 'Duplicando pedido...',
                description: 'Aguarde enquanto o pedido está sendo duplicado.',
            });

            const newOrder = await api.duplicateOrder(orderToDuplicate.id, {
                data_entrada: duplicateDataEntrada || undefined,
                data_entrega: duplicateDataEntrega || undefined,
            });

            toast({
                title: 'Sucesso',
                description: `Pedido duplicado com sucesso! Novo pedido #${newOrder.numero || newOrder.id}`,
            });

        } catch (error) {
            logger.error('Erro ao duplicar pedido:', error);
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro ao duplicar pedido',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={duplicateDialogOpen} onOpenChange={closeDuplicateModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Duplicar Pedido</DialogTitle>
                    <DialogDescription>
                        Configure as datas para o novo pedido duplicado do pedido #{orderToDuplicate?.numero || orderToDuplicate?.id}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="duplicate-data-entrada">Data de Entrada *</Label>
                        <Input
                            id="duplicate-data-entrada"
                            type="date"
                            value={duplicateDataEntrada}
                            onChange={(e) => handleDuplicateDateChange('entrada', e.target.value)}
                            className={duplicateDateError ? 'border-destructive' : ''}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="duplicate-data-entrega">Data de Entrega (Opcional)</Label>
                        <Input
                            id="duplicate-data-entrega"
                            type="date"
                            value={duplicateDataEntrega}
                            onChange={(e) => handleDuplicateDateChange('entrega', e.target.value)}
                            className={duplicateDateError ? 'border-destructive' : ''}
                        />
                        {duplicateDateError && (
                            <p className="text-sm text-destructive mt-1">{duplicateDateError}</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDuplicateModal}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDuplicateConfirm}
                        disabled={!!duplicateDateError || !duplicateDataEntrada}
                    >
                        Duplicar Pedido
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
