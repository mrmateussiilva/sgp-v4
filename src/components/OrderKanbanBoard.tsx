import { useState, useMemo } from 'react';
import { OrderWithItems } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, FileText, Trash2, Copy, AlertTriangle, Clock } from 'lucide-react';
import { formatDateForDisplay } from '@/utils/date';
import { EditingIndicator } from './EditingIndicator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OrderKanbanBoardProps {
  orders: OrderWithItems[];
  onStatusChange: (orderId: number, newStatus: string) => void;
  onEdit: (order: OrderWithItems) => void;
  onViewOrder: (order: OrderWithItems) => void;
  onDelete: (orderId: number) => void;
  onDuplicate?: (order: OrderWithItems) => void;
  isAdmin: boolean;
  loading?: boolean;
}

type StatusColumn = {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

const STATUS_COLUMNS: StatusColumn[] = [
  {
    id: 'financeiro',
    label: 'Financeiro',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50/40 dark:bg-slate-900/40',
    borderColor: 'border-slate-200/60 dark:border-slate-800/60',
  },
  {
    id: 'conferencia',
    label: 'Conferência',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50/40 dark:bg-amber-900/20',
    borderColor: 'border-amber-200/60 dark:border-amber-800/60',
  },
  {
    id: 'sublimacao',
    label: 'Sublimação',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50/40 dark:bg-orange-900/20',
    borderColor: 'border-orange-200/60 dark:border-orange-800/60',
  },
  {
    id: 'costura',
    label: 'Costura',
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgColor: 'bg-fuchsia-50/40 dark:bg-fuchsia-900/20',
    borderColor: 'border-fuchsia-200/60 dark:border-fuchsia-800/60',
  },
  {
    id: 'expedicao',
    label: 'Expedição',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50/40 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200/60 dark:border-indigo-800/60',
  },
  {
    id: 'pronto',
    label: 'Pronto',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50/40 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/60',
  },
];

export function OrderKanbanBoard({
  orders,
  onStatusChange,
  onEdit,
  onViewOrder,
  onDelete,
  onDuplicate,
  isAdmin,
  loading = false,
}: OrderKanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);

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

  // Determinar em qual coluna cada pedido deve aparecer
  const getOrderStatus = (order: OrderWithItems): string => {
    if (order.pronto) return 'pronto';
    if (order.expedicao) return 'expedicao';
    if (order.costura) return 'costura';
    if (order.sublimacao) return 'sublimacao';
    if (order.conferencia) return 'conferencia';
    if (order.financeiro) return 'financeiro';
    return 'financeiro'; // Default para pedidos sem status
  };

  // Agrupar pedidos por status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, OrderWithItems[]> = {};
    STATUS_COLUMNS.forEach((col) => {
      grouped[col.id] = [];
    });

    orders.forEach((order) => {
      const status = getOrderStatus(order);
      if (grouped[status]) {
        grouped[status].push(order);
      }
    });

    return grouped;
  }, [orders]);

  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', orderId.toString());
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedOrderId) return;

    const order = orders.find((o) => o.id === draggedOrderId);
    if (!order) return;

    const currentStatus = getOrderStatus(order);

    // Não fazer nada se soltar na mesma coluna
    if (currentStatus === targetColumnId) {
      setDraggedOrderId(null);
      return;
    }

    // Verificar se pode mover para a coluna (regras de negócio)
    if (targetColumnId === 'conferencia' && !order.financeiro) {
      setDraggedOrderId(null);
      return;
    }

    if (
      (targetColumnId === 'sublimacao' || targetColumnId === 'costura' || targetColumnId === 'expedicao') &&
      !order.financeiro
    ) {
      setDraggedOrderId(null);
      return;
    }

    // Atualizar status
    onStatusChange(draggedOrderId, targetColumnId);
    setDraggedOrderId(null);
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
    setDragOverColumn(null);
  };

  const getOrderCount = (columnId: string) => {
    return ordersByStatus[columnId]?.length || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando pedidos...</div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto overflow-y-hidden h-full pb-4 scrollbar-hide">
      {STATUS_COLUMNS.map((column) => {
        const columnOrders = ordersByStatus[column.id] || [];
        const isDraggingOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-[320px] flex flex-col h-full rounded-2xl border transition-all duration-200 ${column.bgColor
              } ${column.borderColor} ${isDraggingOver
                ? 'ring-2 ring-primary/30 bg-primary/5 scale-[1.01] border-primary/30 z-10 shadow-lg'
                : 'shadow-sm active:shadow-md'
              }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Header da Coluna */}
            <div className="p-4 flex items-center justify-between border-b border-border/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`h-2 w-2 rounded-full animate-pulse ${column.color.replace('text', 'bg')}`} />
                <h3 className={`text-sm font-bold tracking-tight uppercase ${column.color}`}>
                  {column.label}
                </h3>
              </div>
              <Badge
                variant="outline"
                className="bg-background/50 border-border/30 text-[10px] font-bold px-1.5 h-5 min-w-[20px] justify-center"
              >
                {getOrderCount(column.id)}
              </Badge>
            </div>

            {/* Lista de Cards com Scroll Interno */}
            <div
              className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
              style={{ minHeight: 0 }}
            >
              {columnOrders.map((order) => {
                const isDragging = draggedOrderId === order.id;

                return (
                  <Card
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    onDragEnd={handleDragEnd}
                    className={`group cursor-grab active:cursor-grabbing hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/40 overflow-hidden ring-primary/20 ${isDragging ? 'opacity-30 scale-95' : 'hover:-translate-y-1'
                      } ${order.prioridade === 'ALTA' && !order.pronto ? 'border-l-[6px] border-l-destructive shadow-sm shadow-destructive/10' : 'border-l-4 border-l-transparent'
                      } ${getOrderUrgency(order.data_entrega).type === 'overdue' && !order.pronto ? 'bg-destructive/5' : 'bg-card'
                      }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-tighter">
                              PED
                            </span>
                            <span className="font-mono font-black text-sm text-foreground/90">
                              #{order.numero || order.id}
                            </span>
                            <EditingIndicator orderId={order.id} />
                          </div>
                          <Badge
                            variant={order.prioridade === 'ALTA' ? 'destructive' : 'secondary'}
                            className="text-[9px] font-black uppercase tracking-wider px-1.5 h-4.5"
                          >
                            {order.prioridade || 'NORMAL'}
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="font-bold text-sm tracking-tight text-foreground/90 leading-snug line-clamp-2 min-h-[2.5rem]">
                            {order.cliente || order.customer_name}
                          </h4>

                          <div className="flex flex-col gap-1">
                            {order.data_entrega && (() => {
                              const urgency = getOrderUrgency(order.data_entrega);
                              return (
                                <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${urgency.type === 'overdue' ? 'text-destructive animate-pulse' :
                                    urgency.type === 'today' ? 'text-orange-500' :
                                      urgency.type === 'tomorrow' ? 'text-amber-500' :
                                        'text-muted-foreground'
                                  }`}>
                                  {urgency.type === 'overdue' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                  <span>{formatDateForDisplay(order.data_entrega, '-')}</span>
                                  {urgency.type === 'overdue' && (
                                    <span className="text-[9px] bg-destructive/10 px-1 rounded">-{urgency.days}d</span>
                                  )}
                                </div>
                              );
                            })()}

                            {order.cidade_cliente && (
                              <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1 leading-none">
                                <span className="text-primary/50 text-xs">📍</span>
                                <span className="truncate">{order.cidade_cliente}{order.estado_cliente && `/${order.estado_cliente}`}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-0.5 pt-3 border-t border-border/10 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                          <TooltipProvider>
                            {[
                              { icon: FileText, label: 'Ver', action: () => onViewOrder(order), color: 'hover:text-primary hover:bg-primary/10' },
                              { icon: Edit, label: 'Editar', action: () => onEdit(order), color: 'hover:text-amber-500 hover:bg-amber-500/10' },
                              ...(onDuplicate ? [{ icon: Copy, label: 'Duplicar', action: () => onDuplicate(order), color: 'hover:text-blue-500 hover:bg-blue-500/10' }] : []),
                              ...(isAdmin ? [{ icon: Trash2, label: 'Excluir', action: () => onDelete(order.id), color: 'hover:text-destructive hover:bg-destructive/10' }] : [])
                            ].map((btn, i) => (
                              <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-8 w-8 rounded-full transition-colors ${btn.color}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      btn.action();
                                    }}
                                  >
                                    <btn.icon className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-[10px] font-bold uppercase">{btn.label}</TooltipContent>
                              </Tooltip>
                            ))}
                          </TooltipProvider>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {columnOrders.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">
                  <div className="opacity-40">Nenhum pedido</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

