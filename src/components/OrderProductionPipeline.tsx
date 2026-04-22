import { useMemo, useState, DragEvent } from 'react';
import { OrderWithItems } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Clock, MapPin, Package, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { EditingIndicator } from './EditingIndicator';

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
    isAdmin,
    loading = false,
}: OrderProductionPipelineProps) {

    const getOrderUrgency = (dataEntrega: string | null | undefined) => {
        if (!dataEntrega) return {
            type: 'no-date',
            color: 'border-l-slate-200',
            text: 'text-muted-foreground',
            bg: 'bg-slate-50',
            label: 'A combinar'
        };

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
            return {
                type: 'overdue',
                color: 'border-l-red-500',
                text: 'text-red-700',
                bg: 'bg-red-50',
                label: 'Atrasado'
            };
        } else if (diffDays === 0) {
            return {
                type: 'today',
                color: 'border-l-orange-500',
                text: 'text-orange-700',
                bg: 'bg-orange-50',
                label: 'Hoje'
            };
        } else if (diffDays === 1) {
            return {
                type: 'tomorrow',
                color: 'border-l-amber-500',
                text: 'text-amber-700',
                bg: 'bg-amber-50',
                label: 'Amanhã'
            };
        } else if (diffDays <= 3) {
            return {
                type: 'soon',
                color: 'border-l-blue-500',
                text: 'text-blue-700',
                bg: 'bg-blue-50',
                label: `Em ${diffDays} dias`
            };
        } else {
            return {
                type: 'ok',
                color: 'border-l-emerald-500',
                text: 'text-emerald-700',
                bg: 'bg-emerald-50',
                label: 'No prazo'
            };
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .filter(part => part.length > 0)
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const getAvatarColor = (name: string) => {
        if (!name) return 'bg-slate-400';
        const colors = [
            'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
            'bg-emerald-500', 'bg-rose-500', 'bg-indigo-500',
            'bg-cyan-500', 'bg-fuchsia-500'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
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
    const [draggingOrderId, setDraggingOrderId] = useState<number | null>(null);

    const handleDragStart = (e: DragEvent, orderId: number) => {
        console.log(`[DnD] Iniciando drag do pedido: ${orderId}`);
        e.dataTransfer.setData('orderId', orderId.toString());
        e.dataTransfer.effectAllowed = 'move';
        // setTimeout garante que o browser captura o ghost image ANTES de reduzir a opacidade
        setTimeout(() => setDraggingOrderId(orderId), 0);
    };

    const handleDragEnd = () => {
        console.log('[DnD] Drag finalizado');
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
        console.log('[DnD] Drag saindo da coluna');
        setDragOverStepId(null);
    };


    const handleDrop = (e: DragEvent, stepId: string) => {
        e.preventDefault();
        const orderId = parseInt(e.dataTransfer.getData('orderId'));
        console.log(`[DnD] Drop detectado na etapa: ${stepId}, Pedido: ${orderId}`);
        setDragOverStepId(null);
        setDraggingOrderId(null);
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

    if (loading && orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-background/50 backdrop-blur-sm gap-4">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 text-primary animate-spin-slow" />
                    </div>
                </div>
                <div className="text-muted-foreground font-semibold animate-pulse tracking-wide uppercase text-xs">
                    Sincronizando fluxo de produção...
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-row h-full w-full overflow-x-auto overflow-y-hidden pb-4 gap-0 border-t border-border/40 select-none">
            {PIPELINE_STEPS.map((step) => {
                const stepOrders = ordersByStep[step.id] || [];

                return (
                    <div key={step.id} className="flex flex-col h-full min-w-[280px] max-w-[320px] flex-1 border-r border-border/40 last:border-r-0 bg-slate-50/30">
                        {/* Step Header */}
                        <div
                            className={cn(
                                "px-4 py-4 shrink-0 border-t-4 bg-background relative transition-all duration-300 shadow-sm z-10",
                                step.activeColor.replace('bg-', 'border-')
                            )}
                            onDragOver={(e) => handleDragOver(e, step.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, step.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", step.activeColor)} />
                                    <h3 className="text-xs font-bold text-foreground tracking-tight uppercase">
                                        {step.label}
                                    </h3>
                                </div>
                                <Badge variant="secondary" className="h-5 px-2 text-[10px] font-black bg-muted/60 text-muted-foreground border-none rounded-full">
                                    {stepOrders.length}
                                </Badge>
                            </div>

                            {/* Barra de Loading sutil por coluna */}
                            {loading && (
                                <div className="absolute bottom-0 left-0 h-[2px] bg-primary/10 w-full overflow-hidden">
                                    <div className="h-full bg-primary/40 w-1/3 animate-loading-bar" />
                                </div>
                            )}
                        </div>

                        {/* Orders List */}
                        <div
                            className={cn(
                                "flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar transition-all duration-300",
                                dragOverStepId === step.id ? 'bg-primary/[0.04] ring-2 ring-primary/20 ring-inset' : '',
                                loading ? 'opacity-70 grayscale-[0.2]' : ''
                            )}
                            onDragOver={(e) => handleDragOver(e, step.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, step.id)}
                        >
                            {stepOrders.map((order) => {
                                const urgency = getOrderUrgency(order.data_entrega);
                                const firstVendedor = order.items?.[0]?.vendedor || order.vendedor;
                                const itemCount = order.items?.length || 0;
                                const isDragging = draggingOrderId === order.id;

                                return (
                                    <Card
                                        key={order.id}
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, order.id)}
                                        onDragEnd={handleDragEnd}
                                        className={cn(
                                            "group border-border/50 hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md bg-background relative border-l-4 overflow-hidden",
                                            urgency.color,
                                            isDragging ? 'opacity-20 saturate-0 scale-95 shadow-none' : ''
                                        )}
                                        onClick={() => onViewOrder(order)}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex flex-col gap-3">
                                                {/* Linha Superior: ID e Data/Urgência */}
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-[9px] font-black text-white bg-slate-800 px-1.5 py-0.5 rounded leading-none uppercase tracking-tighter shadow-sm">
                                                        #{order.numero || order.id}
                                                    </span>

                                                    <div className="flex items-center gap-1.5">
                                                        <EditingIndicator orderId={order.id} />
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "h-5 px-2 text-[9px] font-bold uppercase tracking-tight border-none shadow-sm",
                                                                urgency.bg, urgency.text
                                                            )}
                                                        >
                                                            <Clock className="h-2.5 w-2.5 mr-1" />
                                                            {urgency.label}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Nome do Cliente - Centralizado e Elegante */}
                                                <div>
                                                    <h4 className="text-[14px] font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                        {order.cliente || order.customer_name || 'Sem nome'}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                                        {order.cidade_cliente && (
                                                            <div className="flex items-center gap-1 text-muted-foreground/60 text-[10px] font-medium uppercase italic">
                                                                <MapPin className="h-2.5 w-2.5" />
                                                                {order.cidade_cliente}
                                                            </div>
                                                        )}

                                                        {/* Chips de Tipos de Produção */}
                                                        {(() => {
                                                            const productionTypes = Array.from(new Set(order.items?.map(i => i.tipo_producao).filter(Boolean))) as string[];
                                                            if (productionTypes.length === 0) return null;

                                                            return (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {productionTypes.slice(0, 2).map((type) => (
                                                                        <Badge
                                                                            key={type}
                                                                            variant="secondary"
                                                                            className={cn(
                                                                                "h-3.5 px-1.5 text-[8px] font-black uppercase tracking-wider border-none text-white shadow-sm",
                                                                                getAvatarColor(type)
                                                                            )}
                                                                        >
                                                                            {type}
                                                                        </Badge>
                                                                    ))}
                                                                    {productionTypes.length > 2 && (
                                                                        <Badge variant="outline" className="h-3.5 px-1 text-[8px] font-bold border-slate-200 text-slate-400">
                                                                            +{productionTypes.length - 2}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Divider sutil */}
                                                <div className="h-[1px] bg-slate-100" />

                                                {/* Info e Ações */}
                                                <div className="flex items-center justify-between">
                                                    {/* Vendedor e Items */}
                                                    <div className="flex items-center gap-2">
                                                        {firstVendedor ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-white", getAvatarColor(firstVendedor))}>
                                                                    {getInitials(firstVendedor)}
                                                                </div>
                                                                <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[80px]">
                                                                    {firstVendedor.split(' ')[0]}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 opacity-40">
                                                                <div className="h-6 w-6 rounded-full bg-slate-200" />
                                                                <span className="text-[10px] font-medium">---</span>
                                                            </div>
                                                        )}

                                                        <div className="w-px h-3 bg-slate-200" />

                                                        <div className="flex items-center gap-1 text-slate-500 font-bold text-[10px]">
                                                            <Package className="h-3 w-3" />
                                                            <span>{itemCount}</span>
                                                        </div>
                                                    </div>

                                                    {/* Ações - Aparecem no Hover */}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(order); }}
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>

                                                        {isAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-full hover:text-destructive hover:bg-destructive/10"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(order.id); }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Indicador de Entrega Hoje ou Atrasado com Pulse sutil */}
                                            {(urgency.type === 'today' || urgency.type === 'overdue') && (
                                                <div className={cn("absolute top-0 right-0 w-8 h-8 opacity-10 pointer-events-none", urgency.bg)}>
                                                    <div className={cn("absolute inset-0 animate-ping opacity-75", urgency.bg)} />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {/* Placeholder visual ao arrastar sobre a coluna */}
                            {dragOverStepId === step.id && draggingOrderId !== null && (
                                <div className="h-28 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 animate-in zoom-in-95 duration-200 flex flex-col items-center justify-center gap-2">
                                    <ChevronRight className="h-6 w-6 text-primary/40 animate-pulse rotate-90" />
                                    <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Soltar aqui</span>
                                </div>
                            )}

                            {stepOrders.length === 0 && !dragOverStepId && (
                                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200/50 rounded-xl">
                                    <div className="bg-slate-100 rounded-full p-2 mb-2">
                                        <Package className="h-5 w-5 text-slate-300" />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Coluna vazia</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
