import { useMemo, useState, DragEvent } from 'react';
import { OrderWithItems } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, FileText, Trash2, Copy, Clock, User, MapPin, Truck, Package } from 'lucide-react';
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
    onStatusChange,
    onDelete,
    onDuplicate,
    isAdmin,
    loading = false,
}: OrderProductionPipelineProps) {

    const getOrderUrgency = (dataEntrega: string | null | undefined) => {
        if (!dataEntrega) return { type: 'no-date', color: 'border-transparent', text: 'text-muted-foreground' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let deliveryDate: Date;
        const dateMatch = dataEntrega.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (dateMatch) {
            const [, y, m, d] = dateMatch.map(Number);
            deliveryDate = new Date(y, m - 1, d);
        } else {
            deliveryDate = new Date(dataEntrega);
        }

        deliveryDate.setHours(0, 0, 0, 0);

        const diffTime = deliveryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { type: 'overdue', color: 'border-l-destructive', text: 'text-destructive font-semibold' };
        } else if (diffDays === 0) {
            return { type: 'today', color: 'border-l-orange-500', text: 'text-orange-600 font-semibold' };
        } else if (diffDays === 1) {
            return { type: 'tomorrow', color: 'border-l-amber-500', text: 'text-amber-600 font-semibold' };
        } else if (diffDays <= 3) {
            return { type: 'soon', color: 'border-l-blue-400', text: 'text-blue-600 font-semibold' };
        } else {
            return { type: 'ok', color: 'border-transparent', text: 'text-muted-foreground' };
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

    const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
    const [hoveringButtonsOrderId, setHoveringButtonsOrderId] = useState<number | null>(null);
    const [draggingOrderId, setDraggingOrderId] = useState<number | null>(null);

    const handleDragStart = (e: DragEvent, orderId: number) => {
        e.dataTransfer.setData('orderId', orderId.toString());
        e.dataTransfer.effectAllowed = 'move';
        // setTimeout garante que o browser captura o ghost image ANTES de reduzir a opacidade
        setTimeout(() => setDraggingOrderId(orderId), 0);
    };

    const handleDragEnd = () => {
        setDraggingOrderId(null);
        setDragOverStepId(null);
    };

    const handleDragOver = (e: DragEvent, stepId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverStepId !== stepId) {
            setDragOverStepId(stepId);
        }
    };

    const handleDragLeave = (e: DragEvent) => {
        // Evitar que o dragLeave dispare ao entrar em elementos filhos do container
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget && e.currentTarget instanceof HTMLElement && e.currentTarget.contains(relatedTarget)) {
            return;
        }
        setDragOverStepId(null);
    };

    const handleDrop = (e: DragEvent, stepId: string) => {
        e.preventDefault();
        setDragOverStepId(null);
        setDraggingOrderId(null);
        const orderId = parseInt(e.dataTransfer.getData('orderId'));
        if (!isNaN(orderId)) {
            onStatusChange(orderId, stepId);
        }
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
        <TooltipProvider>
            <div className="flex flex-row h-full w-full overflow-x-auto overflow-y-hidden pb-2 gap-0 border-t border-border/60">
                {PIPELINE_STEPS.map((step) => {
                    const stepOrders = ordersByStep[step.id] || [];

                    return (
                        <div key={step.id} className="flex flex-col h-full min-w-[240px] max-w-[280px] flex-1 border-r border-border/60 last:border-r-0 bg-muted/10">
                            {/* Step Header */}
                            <div
                                className={`px-3 py-3 shrink-0 border-t-4 ${step.activeColor.replace('bg-', 'border-')} bg-background/80`}
                                onDragOver={(e) => handleDragOver(e, step.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, step.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-1.5 uppercase">
                                        {step.label}
                                    </h3>
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-muted/50 text-muted-foreground border-none">
                                        {stepOrders.length}
                                    </Badge>
                                </div>
                            </div>

                            {/* Orders List */}
                            <div
                                className={`flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar transition-all duration-300 ${dragOverStepId === step.id ? 'bg-primary/[0.04] ring-2 ring-primary/20 ring-inset' : ''}`}
                                onDragOver={(e) => handleDragOver(e, step.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, step.id)}
                            >
                                {stepOrders.map((order) => {
                                    const urgency = getOrderUrgency(order.data_entrega);
                                    const firstVendedor = order.items?.[0]?.vendedor;
                                    const itemCount = order.items?.length || 0;
                                    const isDragging = draggingOrderId === order.id;

                                    return (
                                        <Card
                                            key={order.id}
                                            draggable={hoveringButtonsOrderId !== order.id}
                                            onDragStart={(e) => handleDragStart(e, order.id)}
                                            onDragEnd={handleDragEnd}
                                            className={`group border-border/60 hover:border-primary/40 transition-all duration-150 shadow-none bg-background relative cursor-grab active:cursor-grabbing border-l-4 ${urgency.color} ${isDragging ? 'opacity-25 saturate-0 scale-95' : ''}`}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex flex-col gap-2.5">
                                                    {/* Top Row: ID + Priority Badge */}
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-[10px] font-medium text-muted-foreground bg-muted/40 px-1 rounded uppercase tracking-tighter">
                                                            #{order.numero || order.id}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <EditingIndicator orderId={order.id} />
                                                            {order.prioridade === 'ALTA' && (
                                                                <Badge variant="destructive" className="h-3.5 px-1 text-[8px] font-black uppercase leading-none rounded-sm">Alta</Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Cliente (Destaque Principal) */}
                                                    <h4 className="text-[13px] font-semibold text-foreground leading-tight line-clamp-2 uppercase">
                                                        {order.cliente || order.customer_name}
                                                    </h4>

                                                    <div className="h-px bg-border/40 my-0.5" />

                                                    {/* Info Blocks */}
                                                    <div className="flex flex-col gap-1.5">
                                                        {/* Prazo e Volume */}
                                                        <div className="flex items-center justify-between text-[11px]">
                                                            <div className={`flex items-center gap-1 ${urgency.text}`}>
                                                                <Clock className="h-3 w-3" />
                                                                <span>
                                                                    {order.data_entrega ? formatDateForDisplay(order.data_entrega, '-') : 'A combinar'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-muted-foreground/80 font-medium">
                                                                <Package className="h-3 w-3" />
                                                                <span>{itemCount} {itemCount === 1 ? 'it' : 'its'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Responsável e Destino */}
                                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                                                            {firstVendedor && (
                                                                <div className="flex items-center gap-1 max-w-[85px] truncate">
                                                                    <User className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate uppercase">{firstVendedor}</span>
                                                                </div>
                                                            )}
                                                            {order.cidade_cliente && (
                                                                <div className="flex items-center gap-1 max-w-[100px] truncate justify-end">
                                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate uppercase truncate">{order.cidade_cliente}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Canal de envio */}
                                                        {order.forma_envio && (
                                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 pt-0.5 border-t border-dashed border-border/30">
                                                                <Truck className="h-3 w-3 shrink-0" />
                                                                <span className="truncate uppercase">{order.forma_envio}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Overlay Actions on Hover */}
                                                    <div
                                                        className="absolute inset-0 bg-background/95 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseEnter={() => setHoveringButtonsOrderId(order.id)}
                                                        onMouseLeave={() => setHoveringButtonsOrderId(null)}
                                                    >
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded border-border/60 hover:bg-muted"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewOrder(order); }}
                                                                >
                                                                    <FileText className="h-4 w-4 text-foreground" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-[10px] font-bold">VER</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded border-border/60 hover:bg-muted"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(order); }}
                                                                >
                                                                    <Edit className="h-4 w-4 text-foreground" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-[10px] font-bold">EDITAR</TooltipContent>
                                                        </Tooltip>

                                                        {onDuplicate && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded border-border/60 hover:bg-muted"
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDuplicate(order); }}
                                                                    >
                                                                        <Copy className="h-4 w-4 text-foreground" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-[10px] font-bold">DUPLICAR</TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        {isAdmin && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded shadow-sm opacity-90 hover:opacity-100"
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(order.id); }}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-[10px] font-bold">EXCLUIR</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}

                                {/* Placeholder visual ao arrastar sobre a coluna */}
                                {dragOverStepId === step.id && draggingOrderId !== null && (
                                    <div className="h-24 border-2 border-dashed border-primary/20 rounded-lg bg-primary/5 animate-in slide-in-from-top-2 duration-300 flex items-center justify-center">
                                        <div className="h-1.5 w-12 rounded-full bg-primary/20" />
                                    </div>
                                )}

                                {stepOrders.length === 0 && !dragOverStepId && (
                                    <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-border/20 rounded-lg">
                                        <Package className="h-5 w-5 text-muted-foreground/10 mb-1.5" />
                                        <span className="text-[9px] uppercase font-bold text-muted-foreground/20 tracking-wider">Sem pedidos</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}
