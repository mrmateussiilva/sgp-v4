import { useMemo } from 'react';
import { OrderWithItems } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, FileText, Trash2, Copy, Clock, ChevronRight } from 'lucide-react';
import { formatDateForDisplay } from '@/utils/date';
import { EditingIndicator } from './EditingIndicator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface OrderProductionPipelineProps {
    orders: OrderWithItems[];
    onEdit: (order: OrderWithItems) => void;
    onViewOrder: (order: OrderWithItems) => void;
    onStatusChange: (orderId: number, newStatus: string) => void;
    onDelete: (orderId: number) => void;
    onDuplicate?: (order: OrderWithItems) => void;
    isAdmin: boolean;
    loading?: boolean;
}

type Step = {
    id: string;
    label: string;
    color: string;
    borderColor: string;
    activeColor: string;
};

const PIPELINE_STEPS: Step[] = [
    {
        id: 'financeiro',
        label: 'Financeiro',
        color: 'text-slate-500',
        borderColor: 'border-slate-200',
        activeColor: 'bg-slate-500',
    },
    {
        id: 'conferencia',
        label: 'Conferência',
        color: 'text-amber-500',
        borderColor: 'border-amber-200',
        activeColor: 'bg-amber-500',
    },
    {
        id: 'sublimacao',
        label: 'Sublimação',
        color: 'text-orange-500',
        borderColor: 'border-orange-200',
        activeColor: 'bg-orange-500',
    },
    {
        id: 'costura',
        label: 'Costura',
        color: 'text-fuchsia-500',
        borderColor: 'border-fuchsia-200',
        activeColor: 'bg-fuchsia-500',
    },
    {
        id: 'expedicao',
        label: 'Expedição',
        color: 'text-indigo-500',
        borderColor: 'border-indigo-200',
        activeColor: 'bg-indigo-500',
    },
    {
        id: 'pronto',
        label: 'Pronto',
        color: 'text-emerald-500',
        borderColor: 'border-emerald-200',
        activeColor: 'bg-emerald-500',
    },
];

export function OrderProductionPipeline({
    orders,
    onEdit,
    onViewOrder,
    onDelete,
    onDuplicate,
    isAdmin,
    loading = false,
}: OrderProductionPipelineProps) {

    const getOrderUrgency = (dataEntrega: string | null | undefined) => {
        if (!dataEntrega) return { type: 'no-date', days: null };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deliveryDate = new Date(dataEntrega);
        deliveryDate.setHours(0, 0, 0, 0);

        const diffTime = deliveryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { type: 'overdue', days: Math.abs(diffDays) };
        } else if (diffDays === 0) {
            return { type: 'today', days: 0 };
        } else if (diffDays === 1) {
            return { type: 'tomorrow', days: 1 };
        } else if (diffDays <= 3) {
            return { type: 'soon', days: diffDays };
        } else {
            return { type: 'ok', days: diffDays };
        }
    };

    const getOrderStatus = (order: OrderWithItems): string => {
        if (order.pronto) return 'pronto';
        if (order.expedicao) return 'expedicao';
        if (order.costura) return 'costura';
        if (order.sublimacao) return 'sublimacao';
        if (order.conferencia) return 'conferencia';
        if (order.financeiro) return 'financeiro';
        return 'financeiro';
    };

    const ordersByStep = useMemo(() => {
        const grouped: Record<string, OrderWithItems[]> = {};
        PIPELINE_STEPS.forEach((step) => {
            grouped[step.id] = [];
        });

        orders.forEach((order) => {
            const stepId = getOrderStatus(order);
            if (grouped[stepId]) {
                grouped[stepId].push(order);
            }
        });

        return grouped;
    }, [orders]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground animate-pulse font-medium">Sincronizando fluxo de produção...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-row h-full w-full overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide gap-1">
            {PIPELINE_STEPS.map((step, index) => {
                const stepOrders = ordersByStep[step.id] || [];
                const isLast = index === PIPELINE_STEPS.length - 1;

                return (
                    <div key={step.id} className="flex flex-row h-full min-w-[280px] max-w-[320px] flex-1">
                        <div className="flex flex-col h-full w-full bg-slate-50/30 dark:bg-slate-900/10 border-x border-t border-border/40 first:rounded-tl-2xl last:rounded-tr-2xl last:border-r overflow-hidden shadow-sm">
                            {/* Step Header */}
                            <div className="px-4 py-4 border-b border-border/40 bg-background/50 backdrop-blur-sm shrink-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-white ${step.activeColor}`}>
                                            {index + 1}
                                        </span>
                                        <h3 className={`text-xs font-black uppercase tracking-widest ${step.color}`}>
                                            {step.label}
                                        </h3>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-bold bg-background/80 border-border/50">
                                        {stepOrders.length}
                                    </Badge>
                                </div>
                            </div>

                            {/* Orders List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                {stepOrders.map((order) => (
                                    <Card
                                        key={order.id}
                                        className="group border-border/40 hover:border-primary/30 transition-all duration-300 shadow-none hover:shadow-md hover:shadow-primary/5 bg-background/60"
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex flex-col gap-2">
                                                {/* ID and Priority */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <span className="font-mono text-[11px] font-black text-foreground/70 shrink-0">
                                                            #{order.numero || order.id}
                                                        </span>
                                                        <EditingIndicator orderId={order.id} />
                                                        <h4 className="text-[12px] font-bold truncate text-foreground/90 shrink">
                                                            {order.cliente || order.customer_name}
                                                        </h4>
                                                    </div>
                                                    {order.prioridade === 'ALTA' && (
                                                        <Badge className="bg-destructive/10 text-destructive border-none text-[8px] font-black uppercase h-4 px-1">
                                                            Alta
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Order Metadata */}
                                                <div className="flex flex-col gap-1">
                                                    {order.data_entrega && (() => {
                                                        const urgency = getOrderUrgency(order.data_entrega);
                                                        return (
                                                            <div className={`flex items-center gap-1 text-[10px] font-bold ${urgency.type === 'overdue' ? 'text-destructive' :
                                                                urgency.type === 'today' ? 'text-orange-500' :
                                                                    urgency.type === 'tomorrow' ? 'text-amber-500' :
                                                                        'text-muted-foreground'
                                                                }`}>
                                                                <Clock className="h-2.5 w-2.5" />
                                                                <span>{formatDateForDisplay(order.data_entrega, '-')}</span>
                                                                {urgency.type === 'overdue' && <span>({urgency.days}d)</span>}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Action Buttons on Hover */}
                                                <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary"
                                                                    onClick={() => onViewOrder(order)}
                                                                >
                                                                    <FileText className="h-3 w-3" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-[10px] uppercase font-bold">Ver</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 rounded-full hover:bg-amber-500/10 hover:text-amber-500"
                                                                    onClick={() => onEdit(order)}
                                                                >
                                                                    <Edit className="h-3 w-3" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-[10px] uppercase font-bold">Editar</TooltipContent>
                                                        </Tooltip>

                                                        {onDuplicate && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 rounded-full hover:bg-blue-500/10 hover:text-blue-500"
                                                                        onClick={() => onDuplicate(order)}
                                                                    >
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-[10px] uppercase font-bold">Duplicar</TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        {isAdmin && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                                                        onClick={() => onDelete(order.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-[10px] uppercase font-bold">Excluir</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {stepOrders.length === 0 && (
                                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/20 rounded-xl">
                                        <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-tighter">Sem fluxo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {!isLast && (
                            <div className="flex items-center justify-center w-6 shrink-0 z-10 -mx-3">
                                <div className="h-8 w-8 rounded-full bg-background border border-border/40 shadow-sm flex items-center justify-center">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
