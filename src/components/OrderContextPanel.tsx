import { useMemo } from 'react';
import { Edit, Trash2, Printer, X, Clock, AlertTriangle, CheckCircle2, MapPin, User, Calendar } from 'lucide-react';
import { OrderWithItems } from '@/types';
import { formatDateForDisplay } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OrderContextPanelProps {
  order: OrderWithItems | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (orderId: number) => void;
  onDelete: (orderId: number) => void;
  onPrint: (orderId: number) => void;
  onStatusChange?: (orderId: number, field: string, value: boolean) => void;
  isAdmin?: boolean;
}

export function OrderContextPanel({
  order,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPrint,
  onStatusChange,
  isAdmin = false,
}: OrderContextPanelProps) {
  const getOrderUrgency = useMemo(() => {
    if (!order?.data_entrega) return { isDelayed: false, isUrgent: false, isToday: false, isTomorrow: false, daysDelayed: 0 };
    const deliveryDate = new Date(order.data_entrega);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isDelayed = diffDays < 0;
    const isToday = diffDays === 0;
    const isTomorrow = diffDays === 1;
    const isUrgent = isToday || isTomorrow || (diffDays >= 2 && diffDays <= 3);
    const daysDelayed = isDelayed ? Math.abs(diffDays) : 0;
    return { isDelayed, isUrgent, isToday, isTomorrow, daysDelayed };
  }, [order?.data_entrega]);

  const progressPercentage = useMemo(() => {
    if (!order) return 0;
    const steps = [
      order.financeiro,
      order.conferencia,
      order.sublimacao,
      order.costura,
      order.expedicao,
    ];
    const completed = steps.filter(Boolean).length;
    return (completed / steps.length) * 100;
  }, [order?.financeiro, order?.conferencia, order?.sublimacao, order?.costura, order?.expedicao]);

  if (!isOpen || !order) return null;

  const statusSteps = [
    { label: 'Financeiro', completed: order.financeiro, field: 'financeiro' },
    { label: 'Conferência', completed: order.conferencia, field: 'conferencia' },
    { label: 'Sublimação', completed: order.sublimacao, field: 'sublimacao' },
    { label: 'Costura', completed: order.costura, field: 'costura' },
    { label: 'Expedição', completed: order.expedicao, field: 'expedicao' },
  ];

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full w-[400px] bg-card border-l border-border shadow-xl z-50',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="h-full flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Pedido #{order.id}</h2>
              <p className="text-sm text-muted-foreground">{order.customer_name}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Urgência */}
            {getOrderUrgency.isDelayed && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">
                      {getOrderUrgency.daysDelayed} {getOrderUrgency.daysDelayed === 1 ? 'dia atrasado' : 'dias atrasados'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {getOrderUrgency.isToday && !getOrderUrgency.isDelayed && (
              <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold">Entrega hoje</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {getOrderUrgency.isTomorrow && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold">Entrega amanhã</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progresso */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Progresso de Produção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        progressPercentage === 100 ? 'bg-green-500' : 'bg-primary'
                      )}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {statusSteps.map((step) => (
                      <div
                        key={step.field}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className={cn(
                          'flex items-center gap-2',
                          step.completed ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {step.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                          )}
                          {step.label}
                        </span>
                        {onStatusChange && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onStatusChange(order.id, step.field, !step.completed)}
                            disabled={step.field === 'financeiro' && !isAdmin}
                          >
                            {step.completed ? 'Desmarcar' : 'Marcar'}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações principais */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-sm font-medium">{order.customer_name}</p>
                  </div>
                </div>

                {(order.cidade_cliente || order.estado_cliente) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Localização</p>
                      <p className="text-sm font-medium">
                        {[order.cidade_cliente, order.estado_cliente].filter(Boolean).join(' / ') || '-'}
                      </p>
                    </div>
                  </div>
                )}

                {order.data_entrega && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Data de Entrega</p>
                      <p className={cn(
                        'text-sm font-medium',
                        getOrderUrgency.isDelayed && 'text-destructive',
                        getOrderUrgency.isUrgent && !getOrderUrgency.isDelayed && 'text-orange-600 dark:text-orange-400'
                      )}>
                        {formatDateForDisplay(order.data_entrega, '-')}
                      </p>
                    </div>
                  </div>
                )}

                {order.prioridade && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">Prioridade:</p>
                    <Badge
                      variant={order.prioridade === 'ALTA' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {order.prioridade || 'NORMAL'}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Status:</p>
                  <Badge
                    variant={order.pronto ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {order.pronto ? 'Pronto' : 'Em Andamento'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Itens do pedido (resumo) */}
            {order.items && order.items.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Itens ({order.items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-sm">
                        <p className="font-medium">{item.item_name || 'Item'}</p>
                        <p className="text-xs text-muted-foreground">
                          Qtd: {item.quantity} • Valor: R$ {typeof item.unit_price === 'number' 
                            ? item.unit_price.toFixed(2).replace('.', ',')
                            : String(item.unit_price)}
                        </p>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-muted-foreground pt-2">
                        + {order.items.length - 3} {order.items.length - 3 === 1 ? 'item' : 'itens'}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Observações */}
            {order.observacao && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.observacao}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer com ações */}
          <div className="sticky bottom-0 border-t border-border bg-card p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(order.id)}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrint(order.id)}
                className="w-full"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(order.id)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </Button>
            </div>
          </div>
        </div>
    </div>
  );
}

