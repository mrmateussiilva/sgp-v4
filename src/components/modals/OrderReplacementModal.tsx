import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/store/useModalStore';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { logger } from '@/utils/logger';
import { RefreshCw, History, ChevronRight, Zap, AlertCircle } from 'lucide-react';

export function OrderReplacementModal() {
    const { replacementDialogOpen, orderToReplace, closeReplacementModal } = useModalStore();
    const { toast } = useToast();

    const handleReplacementConfirm = async (zeroValues: boolean) => {
        if (!orderToReplace) return;

        try {
            closeReplacementModal();
            toast({
                title: 'Criando ficha de reposição...',
                description: 'Gerando nova via de produção.',
            });

            const newOrder = await api.createReplacementOrder(orderToReplace.id, { zeroValues });

            toast({
                title: 'Reposição Gerada',
                description: `Nova ficha #${newOrder.numero || newOrder.id} criada com sucesso!`,
            });

        } catch (error) {
            logger.error('Erro ao criar reposição:', error);
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro ao criar ficha de reposição',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={replacementDialogOpen} onOpenChange={closeReplacementModal}>
            <DialogContent className="sm:max-w-md border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
                    <DialogHeader className="mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2.5 rounded-xl">
                                <RefreshCw className="h-6 w-6 text-primary animate-spin-slow" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">Gerar Reposição</DialogTitle>
                                <DialogDescription className="text-sm font-medium mt-1 break-words">
                                    Pedido #{orderToReplace?.numero || orderToReplace?.id} •{' '}
                                    {orderToReplace?.cliente || orderToReplace?.customer_name}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 py-2">
                        <Button
                            variant="outline"
                            className="group relative flex items-center justify-start h-auto p-5 gap-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 rounded-2xl border-2 border-muted overflow-hidden whitespace-normal"
                            onClick={() => handleReplacementConfirm(false)}
                        >
                            <div className="bg-muted group-hover:bg-primary/10 p-3 rounded-2xl transition-colors duration-300 flex-shrink-0">
                                <History className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                            </div>
                            <div className="flex-1 flex flex-col gap-1 pr-2">
                                <span className="font-bold text-base leading-tight">Valores Originais</span>
                                <span className="text-xs text-muted-foreground font-normal leading-relaxed whitespace-normal">
                                    Copia integralmente os preços e frete do pedido original. Usar quando o
                                    cliente pagará pela nova peça.
                                </span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                        </Button>

                        <Button
                            variant="outline"
                            className="group relative flex items-center justify-start h-auto p-5 gap-4 text-left border-2 border-orange-100 hover:border-orange-400 hover:bg-orange-50/50 dark:border-orange-900/20 dark:hover:bg-orange-950/20 transition-all duration-300 rounded-2xl overflow-hidden whitespace-normal"
                            onClick={() => handleReplacementConfirm(true)}
                        >
                            <div className="absolute top-0 right-0">
                                <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                                    <Zap className="h-3 w-3 fill-current" />
                                    RECOMENDADO
                                </div>
                            </div>
                            <div className="bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 p-3 rounded-2xl transition-colors duration-300 flex-shrink-0">
                                <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400 transition-colors duration-300 fill-current" />
                            </div>
                            <div className="flex-1 flex flex-col gap-1 mt-1 pr-2">
                                <span className="font-bold text-base text-orange-700 dark:text-orange-400 leading-tight">
                                    Cortesia (Zero Vinte)
                                </span>
                                <span className="text-xs text-muted-foreground font-normal leading-relaxed whitespace-normal">
                                    Zera todos os preços unitários e o frete. Ideal para casos de erro interno,
                                    garantia ou cortesia.
                                </span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-orange-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                        </Button>
                    </div>

                    <div className="mt-6 flex items-start gap-2.5 p-3.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 rounded-xl">
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 leading-normal italic">
                            Independente da escolha, o status será resetado para <strong>Pendente</strong> e
                            uma nova ficha numerada será gerada.
                        </p>
                    </div>
                </div>

                <DialogFooter className="bg-muted/30 p-4 border-t border-muted">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={closeReplacementModal}
                        className="hover:bg-background/80"
                    >
                        Cancelar Operação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
