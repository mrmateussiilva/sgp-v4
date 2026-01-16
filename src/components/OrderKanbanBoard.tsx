import { useState, useMemo } from 'react';
import { OrderWithItems } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, FileText, Trash2, Copy } from 'lucide-react';
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
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50/50 dark:bg-gray-900/50',
    borderColor: 'border-gray-200 dark:border-gray-800',
  },
  {
    id: 'conferencia',
    label: 'Conferência',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50/50 dark:bg-yellow-900/10',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  {
    id: 'sublimacao',
    label: 'Sublimação',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50/50 dark:bg-orange-900/10',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  {
    id: 'costura',
    label: 'Costura',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50/50 dark:bg-purple-900/10',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  {
    id: 'expedicao',
    label: 'Expedição',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'pronto',
    label: 'Pronto',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50/50 dark:bg-green-900/10',
    borderColor: 'border-green-200 dark:border-green-800',
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
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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
    <div className="flex gap-6 overflow-x-auto overflow-y-hidden h-full pb-6">
      {STATUS_COLUMNS.map((column) => {
        const columnOrders = ordersByStatus[column.id] || [];
        const isDraggingOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 ${column.bgColor} ${column.borderColor} border rounded-xl p-5 transition-all ${
              isDraggingOver ? 'ring-2 ring-primary ring-offset-2 scale-[1.02]' : 'hover:shadow-sm'
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="mb-5 pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h3 className={`${column.color} text-base font-semibold`}>
                  {column.label}
                </h3>
                <Badge variant="secondary" className="text-xs font-normal">
                  {getOrderCount(column.id)}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-240px)] pr-2" style={{ scrollbarWidth: 'thin' }}>
              {columnOrders.map((order) => {
                const isDragging = draggedOrderId === order.id;

                return (
                  <Card
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-move hover:shadow-md transition-all border-border/50 ${
                      isDragging ? 'opacity-50 scale-95' : 'hover:border-border'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-foreground">
                              #{order.numero || order.id}
                            </span>
                            <EditingIndicator orderId={order.id} />
                          </div>
                          <Badge
                            variant={order.prioridade === 'ALTA' ? 'destructive' : 'secondary'}
                            className="text-xs font-normal"
                          >
                            {order.prioridade || 'NORMAL'}
                          </Badge>
                        </div>

                        <div className="font-medium text-sm mb-2 text-foreground line-clamp-2">
                          {order.cliente || order.customer_name}
                        </div>

                        <div className="space-y-1 mb-3">
                          {order.data_entrega && (
                            <div className="text-xs text-muted-foreground">
                              📅 {formatDateForDisplay(order.data_entrega, '-')}
                            </div>
                          )}

                          {order.cidade_cliente && (
                            <div className="text-xs text-muted-foreground">
                              📍 {order.cidade_cliente}
                              {order.estado_cliente && `/${order.estado_cliente}`}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 pt-3 border-t border-border/50">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => onViewOrder(order)}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visualizar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => onEdit(order)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {onDuplicate && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => onDuplicate(order)}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicar pedido</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {isAdmin && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => onDelete(order.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
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

