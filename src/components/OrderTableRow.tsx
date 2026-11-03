import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditingIndicator } from './EditingIndicator';
import { OrderWithItems } from '../types';
import { formatTimeHHmm, formatDateForDisplay } from '@/utils/date';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  Trash2,
  RefreshCw,
  FileText,
  Printer,
  MoreHorizontal,
} from 'lucide-react';

interface OrderTableRowProps {
  order: OrderWithItems;
  index: number;
  isSelected: boolean;
  selectedOrderIdsForPrint: number[];
  setSelectedOrderIdsForPrint: React.Dispatch<React.SetStateAction<number[]>>;
  printedOrderIds: Set<number>;

  isAdmin: boolean;
  isImpressaoUser: boolean;
  canToggleConferencia: boolean;
  canToggleImpressao: boolean;
  formatOrderNumber: (num: string | null, id: number) => string;
  isReplacementOrder: (order: OrderWithItems) => boolean;
  getOrderUrgency: (date: string | null) => any;
  handleViewOrder: (order: OrderWithItems) => void;
  handleEdit: (order: OrderWithItems) => void;
  handleDuplicateClick: (order: OrderWithItems) => void;
  handleCreateReplacementClick: (order: OrderWithItems) => void;
  handleDeleteClick: (orderId: number) => void;
  handleStatusClick: (pedidoId: number, campo: string, valorAtual: boolean, nomeSetor: string) => void;
  handleQuickShare?: (order: OrderWithItems) => void;
  setSelectedOrder: (order: OrderWithItems) => void;
  setSelectedOrderIndex: (index: number) => void;
}

const OrderTableRowComponent = (props: OrderTableRowProps) => {
  const {
    order,
    index,
    isSelected,
    selectedOrderIdsForPrint,
    setSelectedOrderIdsForPrint,
    printedOrderIds,

    isAdmin,
    isImpressaoUser,

    canToggleConferencia,
    canToggleImpressao,
    formatOrderNumber,
    isReplacementOrder,
    getOrderUrgency,
    handleViewOrder,
    handleEdit,
    handleDuplicateClick,
    handleCreateReplacementClick,
    handleDeleteClick,
    handleStatusClick,

    setSelectedOrder,
    setSelectedOrderIndex
  } = props;




  const urgency = getOrderUrgency(order.data_entrega ?? null);
  const isOverdue = urgency.type === 'overdue';
  const isUrgent =
    urgency.type === 'today' || urgency.type === 'tomorrow';
  const isHighPriority = order.prioridade === 'ALTA';
  const isDelayed = isOverdue && !order.pronto;

  


  // Classe base da linha com destaque visual e listras zebra consistentes
  const rowClassName = cn(
    "group transition-all duration-200 cursor-pointer border-b border-slate-200/90 dark:border-border/60 relative overflow-hidden",
    isSelected
      ? 'bg-primary/[0.08] dark:bg-primary/[0.15] ring-inset ring-1 ring-primary/30 z-20 shadow-sm'
      : 'even:bg-slate-50/90 odd:bg-white dark:even:bg-muted/[0.15] dark:odd:bg-transparent hover:bg-slate-100/80 dark:hover:bg-muted/40 hover:z-10',
    isDelayed
      ? 'bg-red-50/40 dark:bg-red-950/10 border-l-[6px] border-l-red-500 shadow-l-xl'
      : isUrgent && !order.pronto
        ? 'bg-amber-50/30 dark:bg-amber-950/10 border-l-[6px] border-l-amber-500'
        : isHighPriority && !order.pronto
          ? 'bg-blue-50/30 dark:bg-blue-950/10 border-l-[4px] border-l-blue-400'
          : 'border-l-[4px] border-l-transparent'
  );

  return (
    <TableRow
      key={order.id}
      className={cn(rowClassName, "group/row")}
      data-overdue={isDelayed}
      data-urgent={isUrgent}
      data-priority={order.prioridade}
      title="Duplo clique para visualizar os detalhes do pedido"
      onClick={() => {
        setSelectedOrder(order);
        setSelectedOrderIndex(index);
      }}
      onDoubleClick={() => {
        handleViewOrder(order);
      }}
    >
      <TableCell className={cn(
        "text-center sticky left-0 z-20 border-r border-slate-200/80 dark:border-border px-1 lg:px-2 py-2 lg:py-2.5 transition-colors",
        isSelected ? "bg-blue-50 dark:bg-neutral-900" : "bg-white group-even/row:bg-slate-50 dark:bg-background dark:group-even/row:bg-muted/20 group-hover/row:bg-slate-100 dark:group-hover/row:bg-muted/40"
      )}>
        <Checkbox
          checked={selectedOrderIdsForPrint.includes(order.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedOrderIdsForPrint([
                ...selectedOrderIdsForPrint,
                order.id,
              ]);
            } else {
              setSelectedOrderIdsForPrint(
                selectedOrderIdsForPrint.filter((id) => id !== order.id)
              );
            }
          }}
          className="translate-y-[2px]"
        />
      </TableCell>
      <TableCell className={cn(
        "font-mono font-medium whitespace-nowrap sticky left-[35px] lg:left-[40px] xl:left-[45px] hd:left-[45px] z-20 border-r border-slate-200/80 dark:border-border w-[50px] min-w-[50px] lg:w-[65px] lg:min-w-[65px] xl:w-[75px] xl:min-w-[75px] hd:w-[90px] hd:min-w-[90px] px-1 lg:px-2 py-2 lg:py-2.5 text-[10px] sm:text-xs lg:text-sm xl:text-base transition-colors",
        isSelected ? "bg-blue-50 dark:bg-neutral-900" : "bg-white group-even/row:bg-slate-50 dark:bg-background dark:group-even/row:bg-muted/20 group-hover/row:bg-slate-100 dark:group-hover/row:bg-muted/40"
      )}>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 lg:gap-2">
            <span className={cn(
              "font-bold text-sm lg:text-base",
              isSelected ? "text-primary" : "text-slate-900 dark:text-slate-100"
            )}>
              #{formatOrderNumber(order.numero ?? null, order.id)}
            </span>
            <EditingIndicator orderId={order.id} />
            {printedOrderIds.has(order.id) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="h-4 p-0 px-1 text-[8px] lg:text-[9px] bg-green-100/80 text-green-700 border-green-200 shadow-none font-black"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5" />
                      VISTO
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Este pedido já possui registro de impressão no histórico.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {isImpressaoUser && order.items?.some(i => i.data_impressao) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="default"
                      className="h-4 px-1 text-[8px] lg:text-[9px] bg-green-600 hover:bg-green-600 text-white border-none shadow-sm font-bold flex items-center gap-0.5 w-fit"
                    >
                      <Printer className="h-2.5 w-2.5 mr-0.5" />
                      IMPRESSO
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ficha de produção já impressa em: {
                      (() => {
                        const date = order.items?.find(i => i.data_impressao)?.data_impressao;
                        return date ? formatDateForDisplay(date) : 'Data não disponível';
                      })()
                    }</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {order.rascunho && (
              <Badge
                variant="outline"
                className="text-[8px] lg:text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-800 border-amber-300 w-fit font-bold"
              >
                RASCUNHO
              </Badge>
            )}
            {isReplacementOrder(order) && (
              <Badge
                variant="outline"
                className="text-[8px] lg:text-[9px] px-1 py-0 h-4 bg-orange-50 text-orange-700 border-orange-300 w-fit"
              >
                REPOSIÇÃO
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell
        className={`
          font-medium min-w-[140px] max-w-[240px] lg:min-w-[180px] lg:max-w-[320px] xl:min-w-[220px] xl:max-w-[380px] truncate px-2 lg:px-3 py-2 lg:py-2.5 text-xs sm:text-sm lg:text-[15px]
          ${isDelayed ? 'font-bold text-red-700 dark:text-red-400' : ''}
          ${isUrgent && !order.pronto ? 'font-bold text-orange-700 dark:text-orange-400' : ''}
          text-foreground/90
        `}
      >
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "truncate tracking-normal text-slate-900 dark:text-slate-100 cursor-default",
                    isSelected ? "font-bold" : "font-semibold"
                  )}
                >
                  {order.cliente || order.customer_name}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs space-y-1.5 p-2.5">
                <div className="font-bold text-xs border-b border-border/60 pb-1">
                  {order.cliente || order.customer_name}
                </div>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                      Itens do pedido ({order.items.length})
                    </div>
                    {order.items.slice(0, 5).map((item, idx) => (
                      <div key={item.id ?? idx} className="text-xs flex items-center justify-between gap-2">
                        <span className="truncate font-medium">
                          {idx + 1}. {item.descricao || item.tipo_producao || 'Item'}
                        </span>
                        {(item.largura && item.altura) && (
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {item.largura}x{item.altura}m
                          </span>
                        )}
                      </div>
                    ))}
                    {order.items.length > 5 && (
                      <div className="text-[10px] text-muted-foreground italic">
                        + {order.items.length - 5} outro(s) item(ns)...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">
                    Dê duplo clique na linha para abrir os detalhes
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {order.items && order.items.length > 0 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shrink-0"
              title={`${order.items.length} item(ns) neste pedido`}
            >
              {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell whitespace-nowrap min-w-[90px] max-w-[110px] lg:min-w-[100px] lg:max-w-[120px] px-2 lg:px-3 py-2 lg:py-2.5 text-xs lg:text-sm">
        <div className="flex items-center gap-1.5 tabular-nums">
          {urgency.type === 'overdue' && !order.pronto ? (
            <AlertTriangle
              className="h-3.5 w-3.5 text-red-600 dark:text-red-500 flex-shrink-0"
              aria-hidden="true"
            />
          ) : (
            <Clock
              className={cn(
                "h-3.5 w-3.5 flex-shrink-0",
                (urgency.type === 'today' || urgency.type === 'tomorrow') && !order.pronto
                  ? "text-orange-500 dark:text-orange-400"
                  : "text-slate-400 dark:text-slate-500"
              )}
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              "font-medium tabular-nums",
              urgency.type === 'overdue' && !order.pronto && "text-red-700 dark:text-red-400 font-bold",
              (urgency.type === 'today' || urgency.type === 'tomorrow') && !order.pronto && "text-orange-600 dark:text-orange-400 font-bold",
              urgency.type === 'soon' && !order.pronto && "text-slate-700 dark:text-slate-300 font-medium"
            )}
          >
            {formatDateForDisplay(order.data_entrega, '-')}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden hd:table-cell whitespace-nowrap min-w-[70px] max-w-[85px] lg:min-w-[90px] lg:max-w-[110px] xl:min-w-[100px] xl:max-w-[120px] px-1 lg:px-2 xl:px-3 py-2 lg:py-2.5">
        {order.prioridade === 'ALTA' ? (
          <Badge
            variant="destructive"
            className={cn(
              "text-[10px] lg:text-xs px-2 py-0.5 font-bold animate-pulse",
              isDelayed && "ring-2 ring-red-400 ring-offset-1"
            )}
          >
            ALTA
          </Badge>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] lg:text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 dark:text-slate-300 dark:bg-slate-800/80 dark:border-slate-700">
            Normal
          </span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell whitespace-nowrap min-w-[90px] max-w-[140px] lg:min-w-[110px] lg:max-w-[160px] truncate px-2 lg:px-3 py-2 lg:py-2.5 text-xs lg:text-sm text-slate-700 dark:text-slate-300">
        <span title={order.cidade_cliente && order.estado_cliente ? `${order.cidade_cliente} (${order.estado_cliente})` : order.cidade_cliente || '-'}>
          {order.cidade_cliente && order.estado_cliente
            ? `${order.cidade_cliente} (${order.estado_cliente})`
            : order.cidade_cliente || '-'}
        </span>
      </TableCell>

      {/* Checkboxes de Status */}
      {/* Financeiro - Apenas admins podem alterar em pedidos ativos */}
      <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-2 lg:py-2.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Checkbox
                  checked={order.financeiro === true}
                  disabled={order.rascunho || !isAdmin}
                  onCheckedChange={() =>
                    handleStatusClick(
                      order.id,
                      'financeiro',
                      !!order.financeiro,
                      'Financeiro'
                    )
                  }
                  className={cn(
                    "transition-all duration-300 h-5 w-5 rounded-full border-2",
                    (!isAdmin || order.rascunho) ? "opacity-55 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                    order.financeiro
                      ? "bg-emerald-600 border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 text-white shadow-[0_0_8px_rgba(5,150,105,0.35)]"
                      : "bg-slate-50 border-slate-400 dark:bg-transparent dark:border-slate-600"
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">Financeiro</p>
              {order.rascunho ? (
                <p className="text-xs text-amber-600 font-medium">Rascunhos não entram no fluxo de produção.</p>
              ) : !isAdmin ? (
                <p className="text-xs mt-0.5 opacity-80">
                  Somente administradores.
                </p>
              ) : null}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Hr. liberação - persistido no backend */}
      <TableCell className="hidden sm:table-cell text-center whitespace-nowrap min-w-[55px] max-w-[75px] lg:min-w-[60px] lg:max-w-[80px] xl:min-w-[65px] xl:max-w-[85px] px-0 lg:px-1 xl:px-2 py-2 lg:py-2.5 border-x border-slate-200/70 dark:border-border/20 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
        {formatTimeHHmm(order.financeiro_liberado_em)}
      </TableCell>

      {/* Conferência - Só habilitado se ativo e Financeiro marcado */}
      <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-2 lg:py-2.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Checkbox
                  checked={order.conferencia === true}
                  disabled={order.rascunho || !order.financeiro || !canToggleConferencia}
                  onCheckedChange={() =>
                    handleStatusClick(
                      order.id,
                      'conferencia',
                      !!order.conferencia,
                      'Conferência'
                    )
                  }
                  className={cn(
                    "transition-all duration-300 h-5 w-5 rounded-full border-2",
                    (order.rascunho || !order.financeiro || !canToggleConferencia) ? "opacity-55 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                    order.conferencia
                      ? "bg-orange-500 border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 text-white shadow-[0_0_8px_rgba(249,115,22,0.35)]"
                      : "bg-slate-50 border-slate-400 dark:bg-transparent dark:border-slate-600"
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">Conferência</p>
              {order.rascunho && <p className="text-xs text-amber-600 font-medium">Rascunhos não entram no fluxo de produção.</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Impressão - Só habilitado se ativo e Financeiro marcado */}
      <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-2 lg:py-2.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Checkbox
                  checked={order.sublimacao === true}
                  disabled={order.rascunho || !order.financeiro || !canToggleImpressao}
                  onCheckedChange={() =>
                    handleStatusClick(
                      order.id,
                      'sublimacao',
                      !!order.sublimacao,
                      'Impressão'
                    )
                  }
                  className={cn(
                    "transition-all duration-300 h-5 w-5 rounded-full border-2",
                    (order.rascunho || !order.financeiro || !canToggleImpressao) ? "opacity-55 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                    order.sublimacao
                      ? "bg-purple-600 border-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 text-white shadow-[0_0_8px_rgba(147,51,234,0.35)]"
                      : "bg-slate-50 border-slate-400 dark:bg-transparent dark:border-slate-600"
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">Impressão</p>
              {order.rascunho && <p className="text-xs text-amber-600 font-medium">Rascunhos não entram no fluxo de produção.</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {order.sublimacao &&
          (order.sublimacao_maquina ||
            order.sublimacao_data_impressao) && (
            <div className="mt-0.5 lg:mt-1 text-[8px] lg:text-[9px] xl:text-[10px] text-muted-foreground leading-tight text-center">
              {order.sublimacao_maquina && (
                <div className="truncate">
                  {order.sublimacao_maquina}
                </div>
              )}
              {order.sublimacao_data_impressao && (
                <div>
                  {formatDateForDisplay(
                    order.sublimacao_data_impressao,
                    '-'
                  )}
                </div>
              )}
            </div>
          )}
      </TableCell>

      {/* Costura - Só habilitado se ativo e Financeiro marcado */}
      <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-2 lg:py-2.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Checkbox
                  checked={order.costura === true}
                  disabled={order.rascunho || !order.financeiro}
                  onCheckedChange={() =>
                    handleStatusClick(
                      order.id,
                      'costura',
                      !!order.costura,
                      'Costura'
                    )
                  }
                  className={cn(
                    "transition-all duration-300 h-5 w-5 rounded-full border-2",
                    (order.rascunho || !order.financeiro) ? "opacity-55 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                    order.costura
                      ? "bg-blue-600 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.35)]"
                      : "bg-slate-50 border-slate-400 dark:bg-transparent dark:border-slate-600"
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">Costura</p>
              {order.rascunho && <p className="text-xs text-amber-600 font-medium">Rascunhos não entram no fluxo de produção.</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Expedição - Só habilitado se ativo e Financeiro marcado */}
      <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-2 lg:py-2.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Checkbox
                  checked={order.expedicao === true}
                  disabled={order.rascunho || !order.financeiro}
                  onCheckedChange={() =>
                    handleStatusClick(
                      order.id,
                      'expedicao',
                      !!order.expedicao,
                      'Expedição'
                    )
                  }
                  className={cn(
                    "transition-all duration-300 h-5 w-5 rounded-full border-2",
                    (order.rascunho || !order.financeiro) ? "opacity-55 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                    order.expedicao
                      ? "bg-amber-600 border-amber-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 text-white shadow-[0_0_8px_rgba(217,119,6,0.35)]"
                      : "bg-slate-50 border-slate-400 dark:bg-transparent dark:border-slate-600"
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">Expedição</p>
              {order.rascunho && <p className="text-xs text-amber-600 font-medium">Rascunhos não entram no fluxo de produção.</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Status (Pronto / Em andamento / Rascunho) - Campo calculado automaticamente */}
      <TableCell className="hidden sm:table-cell text-center whitespace-nowrap min-w-[80px] max-w-[100px] lg:min-w-[90px] lg:max-w-[110px] xl:min-w-[100px] xl:max-w-[120px] hd:min-w-[120px] px-1 lg:px-2 xl:px-3 py-2 lg:py-2.5 border-l border-slate-200/70 dark:border-border/20">
        <div className="flex items-center justify-center gap-1.5">
          {order.rascunho ? (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none shadow-[0_0_8px_rgba(245,158,11,0.3)] h-6 px-2.5 uppercase text-[10px] font-bold tracking-wider">
              RASCUNHO
            </Badge>
          ) : order.pronto ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-[0_0_8px_rgba(5,150,105,0.3)] h-6 px-2.5 uppercase text-[10px] font-bold tracking-wider">
              PRONTO
            </Badge>
          ) : isDelayed ? (
            <Badge variant="destructive" className="animate-pulse h-6 px-2.5 uppercase text-[10px] font-bold tracking-wider ring-1 ring-red-400 ring-offset-1">
              ATRASADO
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-bold tracking-wide bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
              Em curso
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={cn(
        "text-right whitespace-nowrap border-l border-slate-200/80 dark:border-border min-w-[90px] w-[100px] lg:min-w-[100px] lg:w-[110px] px-1 lg:px-2 py-2 lg:py-2.5 transition-colors",
        isSelected ? "bg-blue-50 dark:bg-neutral-900" : "bg-white group-even/row:bg-slate-50 dark:bg-background dark:group-even/row:bg-muted/20 group-hover/row:bg-slate-100 dark:group-hover/row:bg-muted/40"
      )}>
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleViewOrder(order)}
                  className="h-8 w-8 rounded-lg text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95"
                  title="Visualizar Pedido"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Visualizar pedido</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(order)}
                  className="h-8 w-8 rounded-lg text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 active:scale-95"
                  title="Editar Pedido"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Editar pedido</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-200/70 dark:hover:bg-muted transition-colors"
                aria-label="Mais ações do pedido"
                title="Mais ações"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleDuplicateClick(order)}
                className="gap-2 cursor-pointer text-xs font-medium"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                Duplicar pedido
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCreateReplacementClick(order)}
                className="gap-2 cursor-pointer text-xs font-medium"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                Criar ficha de reposição
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(order.id)}
                    className="gap-2 cursor-pointer text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir pedido
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );

};
OrderTableRowComponent.displayName = 'OrderTableRow';

export const OrderTableRow = React.memo(OrderTableRowComponent, (prevProps, nextProps) => {
  // Verificação profunda para evitar que os re-renders da tabela (OrderList) afetem linhas que não mudaram
  // Ignoramos props de funções (handleEdit, etc) pois elas são injetadas contextualmente
  return (
    prevProps.order === nextProps.order &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.index === nextProps.index &&

    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.canToggleConferencia === nextProps.canToggleConferencia &&
    prevProps.canToggleImpressao === nextProps.canToggleImpressao &&
    prevProps.selectedOrderIdsForPrint.includes(prevProps.order.id) === nextProps.selectedOrderIdsForPrint.includes(nextProps.order.id) &&
    prevProps.printedOrderIds.has(prevProps.order.id) === nextProps.printedOrderIds.has(nextProps.order.id)
  );
});
