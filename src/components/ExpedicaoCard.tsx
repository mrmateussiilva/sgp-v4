import { OrderWithItems } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Eye, MapPin, Clock, AlertTriangle, Undo2 } from 'lucide-react';
import { formatDateForDisplay } from '@/utils/date';

interface ExpedicaoCardProps {
  order: OrderWithItems;
  onOpenDetails: (order: OrderWithItems) => void;
  onToggleExpedition: (orderId: number, currentStatus: boolean) => Promise<void>;
  isUpdating: boolean;
}

export default function ExpedicaoCard({
  order,
  onOpenDetails,
  onToggleExpedition,
  isUpdating,
}: ExpedicaoCardProps) {
  const isAtrasado = () => {
    if (order.expedicao) return false;
    if (!order.data_entrega) return false;
    const entregaDate = new Date(order.data_entrega.split('T')[0]);
    const hojeDate = new Date();
    hojeDate.setHours(0, 0, 0, 0);
    return entregaDate < hojeDate;
  };

  const getPriorityBadgeColor = () => {
    if (order.prioridade === 'ALTA') return 'bg-rose-500 hover:bg-rose-600 text-white';
    return 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  const getStatusBadge = (completed: boolean | undefined, label: string) => {
    return (
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
          completed
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'
        }`}
      >
        {label} {completed && <Check className="h-2.5 w-2.5 inline" />}
      </span>
    );
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 border hover:shadow-md flex flex-col h-full ${
        order.expedicao
          ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 opacity-80'
          : isAtrasado()
          ? 'border-rose-400 bg-rose-50/10'
          : 'border-border bg-card'
      }`}
    >
      {/* Top indicator stripe */}
      <div
        className={`h-1.5 w-full shrink-0 ${
          order.expedicao
            ? 'bg-emerald-500'
            : isAtrasado()
            ? 'bg-rose-500'
            : order.prioridade === 'ALTA'
            ? 'bg-amber-500'
            : 'bg-slate-300 dark:bg-slate-700'
        }`}
      />

      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
        {/* Header: Pedido # & Badges & Ações Rápidas */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 pr-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Pedido #{order.numero || order.id}
            </span>
            <h4 className="font-bold text-base text-foreground leading-tight line-clamp-1">
              {order.cliente || order.customer_name}
            </h4>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Badges */}
            <div className="flex items-center gap-1.5">
              {order.prioridade === 'ALTA' && (
                <Badge className={getPriorityBadgeColor()}>Urgente</Badge>
              )}
              {isAtrasado() && (
                <Badge variant="destructive" className="animate-pulse">
                  Atrasado
                </Badge>
              )}
              {order.expedicao ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Expedido</Badge>
              ) : null}
            </div>
            
            {/* Ações Secundárias (Ficha e Detalhes) */}
            <div className="flex items-center gap-1">

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenDetails(order)}
                className="h-8 w-8 text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                title="Ver Detalhes"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Localização & Info Extra */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 items-center">
          {order.cidade_cliente && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {order.cidade_cliente}/{order.estado_cliente || ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            Entrega: {formatDateForDisplay(order.data_entrega ?? null, '-')}
          </span>
        </div>

        {/* Lista de itens compacta */}
        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 border-t border-border/60 pt-2.5 space-y-1.5">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <span className="truncate leading-tight flex-1">
                <span className="font-bold">{item.quantity}x</span> {item.item_name}
              </span>
              {item.tipo_producao && (
                <span className="text-[9px] uppercase font-bold text-slate-400 shrink-0">
                  {item.tipo_producao}
                </span>
              )}
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="text-[10px] text-muted-foreground pt-1 font-bold">
              + {order.items.length - 3} itens no pedido
            </div>
          )}
        </div>

        {/* Observação visível diretamente no card */}
        {order.observacao && (
          <div className="text-[11px] bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 p-2 rounded-md border border-amber-200/50 dark:border-amber-900/30 font-medium flex items-start gap-1.5 line-clamp-3">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap leading-tight">{order.observacao}</span>
          </div>
        )}

        {/* Status de produção linear */}
        <div className="flex flex-wrap gap-1 items-center pt-2 mt-auto pb-2">
          {getStatusBadge(order.financeiro, 'Fin')}
          {getStatusBadge(order.conferencia, 'Conf')}
          {getStatusBadge(order.sublimacao, 'Sub')}
          {getStatusBadge(order.costura, 'Cost')}
          {getStatusBadge(order.expedicao, 'Exp')}
          {getStatusBadge(order.pronto, 'Pronto')}
        </div>

        {/* Ação Principal: Expedir ou Desfazer */}
        <div className="pt-2 border-t border-border/40">
          {order.expedicao ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => onToggleExpedition(order.id, true)}
              className="w-full h-10 font-semibold gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <Undo2 className="h-4 w-4" />
              Desfazer Expedição
            </Button>
          ) : (
            <Button
              size="lg"
              disabled={isUpdating}
              onClick={() => onToggleExpedition(order.id, false)}
              className="w-full h-14 font-bold text-lg gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-[0.98]"
            >
              <Check className="h-6 w-6" />
              EXPEDIR PEDIDO
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
