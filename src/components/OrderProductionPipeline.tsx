import { useMemo, useState, DragEvent } from 'react';
import { OrderWithItems } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, FileText, Trash2, Copy, Clock, ChevronRight, User, MapPin, Truck, Package } from 'lucide-react';
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

    const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);

    const handleDragStart = (e: DragEvent, orderId: number) => {
        e.dataTransfer.setData('orderId', orderId.toString());
        e.dataTransfer.effectAllowed = 'move';

        // Estilo visual no ghost image se necessário
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: DragEvent, stepId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverStepId !== stepId) {
            setDragOverStepId(stepId);
        }
    };

    const handleDragLeave = () => {
        setDragOverStepId(null);
    };

    const handleDrop = (e: DragEvent, stepId: string) => {
        e.preventDefault();
        setDragOverStepId(null);
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
        <div className="flex flex-row h-full w-full overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide gap-1">
            {PIPELINE_STEPS.map((step, index) => {
                const stepOrders = ordersByStep[step.id] || [];
                const isLast = index === PIPELINE_STEPS.length - 1;

                return (
                    <div key={step.id} className="flex flex-row h-full min-w-[280px] max-w-[320px] flex-1">
                        <div
                            className={`flex flex-col h-full w-full bg-slate-50/30 dark:bg-slate-900/10 border-x border-t border-border/40 first:rounded-tl-2xl last:rounded-tr-2xl last:border-r overflow-hidden shadow-sm transition-all duration-200 ${dragOverStepId === step.id ? 'bg-primary/5 ring-2 ring-primary/20 ring-inset' : ''
                                }`}
                            onDragOver={(e) => handleDragOver(e, step.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, step.id)}
                        >
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
                                {stepOrders.map((order) => {
                                    const urgency = getOrderUrgency(order.data_entrega);
                                    const firstVendedor = order.items?.[0]?.vendedor;
                                    const itemCount = order.items?.length || 0;

                                    return (
                                        <Card
                                            key={order.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, order.id)}
                                            onDragEnd={handleDragEnd}
                                            className="group border-border/40 hover:border-primary/40 transition-all duration-300 shadow-none hover:shadow-xl hover:shadow-primary/5 bg-background/70 overflow-hidden relative cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                                        >
                                            {order.prioridade === 'ALTA' && (
                                                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none z-10">
                                                    <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[8px] font-black uppercase tracking-tighter py-0.5 w-24 text-center transform rotate-45 translate-x-8 translate-y-2.5 shadow-sm">
                                                        Alta
                                                    </div>
                                                </div>
                                            )}

                                            <CardContent className="p-3.5 pt-4">
                                                <div className="flex flex-col gap-3">
                                                    {/* Top Section: ID and Title */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 opacity-60">
                                                            <span className="font-mono text-[10px] font-bold tracking-tight uppercase bg-muted px-1 rounded">
                                                                PED #{order.numero || order.id}
                                                            </span>
                                                            <EditingIndicator orderId={order.id} />
                                                        </div>
                                                        <h4 className="text-[13px] font-black tracking-tight text-foreground leading-tight line-clamp-2">
                                                            {order.cliente || order.customer_name}
                                                        </h4>
                                                    </div>

                                                    {/* Info Grid */}
                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 pt-1">
                                                        {/* Entrega */}
                                                        <div className={`flex flex-col gap-0.5 ${urgency.type === 'overdue' ? 'text-destructive' :
                                                            urgency.type === 'today' ? 'text-orange-500' :
                                                                urgency.type === 'tomorrow' ? 'text-amber-500' :
                                                                    'text-foreground'
                                                            }`}>
                                                            <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">Entrega</span>
                                                            <div className="flex items-center gap-1 text-[10px] font-bold">
                                                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                                                <span className="whitespace-nowrap">
                                                                    {order.data_entrega ? formatDateForDisplay(order.data_entrega, '-') : 'A combinar'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Itens */}
                                                        <div className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400">
                                                            <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">Volume</span>
                                                            <div className="flex items-center gap-1 text-[10px] font-bold">
                                                                <Package className="h-2.5 w-2.5 shrink-0" />
                                                                <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Vendedor */}
                                                        {firstVendedor && (
                                                            <div className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400 overflow-hidden">
                                                                <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">Responsável</span>
                                                                <div className="flex items-center gap-1 text-[10px] font-bold truncate">
                                                                    <User className="h-2.5 w-2.5 shrink-0" />
                                                                    <span className="truncate uppercase">{firstVendedor}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Cidade/Estado */}
                                                        {order.cidade_cliente && (
                                                            <div className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400 overflow-hidden">
                                                                <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">Destino</span>
                                                                <div className="flex items-center gap-1 text-[10px] font-bold truncate">
                                                                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                                                                    <span className="truncate uppercase">
                                                                        {order.cidade_cliente}{order.estado_cliente ? `/${order.estado_cliente}` : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Envio */}
                                                        {order.forma_envio && (
                                                            <div className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400 overflow-hidden col-span-2">
                                                                <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">Envio</span>
                                                                <div className="flex items-center gap-1 text-[10px] font-bold truncate">
                                                                    <Truck className="h-2.5 w-2.5 shrink-0" />
                                                                    <span className="truncate uppercase">{order.forma_envio}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons on Hover */}
                                                    <div className="flex items-center justify-end gap-1 pt-3 border-t border-border/10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); onViewOrder(order); }}>
                                                                        <FileText className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-[10px] uppercase font-bold">Ver</TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-amber-500/10 hover:text-amber-500" onClick={(e) => { e.stopPropagation(); onEdit(order); }}>
                                                                        <Edit className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-[10px] uppercase font-bold">Editar</TooltipContent>
                                                            </Tooltip>

                                                            {onDuplicate && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-blue-500/10 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); onDuplicate(order); }}>
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
                                                                            onClick={(e) => { e.stopPropagation(); onDelete(order.id); }}
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
                                    );
                                })}
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
