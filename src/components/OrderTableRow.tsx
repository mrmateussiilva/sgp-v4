import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  Camera,
  FileText
} from 'lucide-react';

interface OrderTableRowProps {
  order: OrderWithItems;
  index: number;
  isSelected: boolean;
  selectedOrderIdsForPrint: number[];
  setSelectedOrderIdsForPrint: React.Dispatch<React.SetStateAction<number[]>>;
  printedOrderIds: Set<number>;
  isPwa: boolean;
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
  handleQuickShare: (order: OrderWithItems) => void;
  setStatusConfirmModal: (modal: any) => void;
  setSelectedOrder: (order: OrderWithItems) => void;
  setSelectedOrderIndex: (index: number) => void;
}

export const OrderTableRow = React.memo((props: OrderTableRowProps) => {
  const {
    order,
    index,
    isSelected,
    selectedOrderIdsForPrint,
    setSelectedOrderIdsForPrint,
    printedOrderIds,
    
    isAdmin,
    
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
    handleQuickShare,
    
    setSelectedOrder,
    setSelectedOrderIndex
  } = props;

  

                              const urgency = getOrderUrgency(order.data_entrega ?? null);
                              const isOverdue = urgency.type === 'overdue';
                              const isUrgent =
                                urgency.type === 'today' || urgency.type === 'tomorrow';
                              const isHighPriority = order.prioridade === 'ALTA';
                              const isDelayed = isOverdue && !order.pronto;

                              const completionCount = [
                                order.financeiro,
                                order.conferencia,
                                order.sublimacao,
                                order.costura,
                                order.expedicao,
                              ].filter(Boolean).length;
                              const progressPercentage = (completionCount / 5) * 100;

                              

                              // Classe base da linha com destaque visual e listras zebra
                              const rowClassName = cn(
                                "group transition-all duration-300 cursor-pointer border-b border-border/40 relative overflow-hidden",
                                isSelected
                                  ? 'bg-primary/[0.08] dark:bg-primary/[0.15] ring-inset ring-1 ring-primary/30 z-20 shadow-sm'
                                  : 'even:bg-muted/[0.15] odd:bg-transparent hover:bg-muted/40 hover:shadow-md hover:z-10',
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
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setSelectedOrderIndex(index);
                                  }}
                                >
                                  <TableCell className={cn(
                                    "text-center sticky left-0 z-20 border-r px-1 lg:px-2 py-3 lg:py-4 transition-colors",
                                    isSelected ? "bg-primary/20" : "bg-background group-even/row:bg-muted"
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
                                    "font-mono font-medium whitespace-nowrap sticky left-[35px] lg:left-[40px] xl:left-[45px] hd:left-[45px] z-20 border-r w-[50px] min-w-[50px] lg:w-[65px] lg:min-w-[65px] xl:w-[75px] xl:min-w-[75px] hd:w-[90px] hd:min-w-[90px] px-1 lg:px-2 py-3 lg:py-4 text-[10px] sm:text-xs lg:text-sm xl:text-base transition-colors",
                                    isSelected ? "bg-primary/20" : "bg-background group-even/row:bg-muted"
                                  )}>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1 lg:gap-2">
                                        <span className={cn(
                                          "font-black text-base lg:text-lg tracking-tighter",
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
                                      {isReplacementOrder(order) && (
                                        <Badge
                                          variant="outline"
                                          className="text-[8px] lg:text-[9px] px-1 py-0 h-4 bg-orange-50 text-orange-700 border-orange-300 w-fit"
                                        >
                                          REPOSIÇÃO
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell
                                    className={`
                                      font-medium min-w-[80px] max-w-[150px] lg:min-w-[120px] lg:max-w-[200px] xl:min-w-[140px] xl:max-w-[220px] hd:min-w-[160px] truncate px-2 lg:px-3 xl:px-4 py-3 lg:py-4 text-[10px] sm:text-sm lg:text-base xl:text-lg
                                      ${isDelayed ? 'font-bold text-red-700 dark:text-red-400' : ''}
                                      ${isUrgent && !order.pronto ? 'font-bold text-orange-700 dark:text-orange-400' : ''}
                                      text-foreground/90
                                    `}
                                  >
                                    <div className="flex flex-col gap-1.5">
                                      <span className={cn(
                                        "truncate tracking-tight",
                                        isSelected ? "font-black" : "font-semibold"
                                      )}>
                                        {order.cliente || order.customer_name}
                                      </span>
                                      <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-[3px] mt-0.5 overflow-hidden hidden sm:block relative">
                                        <div
                                          className={cn(
                                            "h-full transition-all duration-1000 ease-in-out relative",
                                            progressPercentage === 100
                                              ? "bg-gradient-to-r from-green-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                              : "bg-gradient-to-r from-primary/40 to-primary"
                                          )}
                                          style={{ width: `${progressPercentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell whitespace-nowrap min-w-[85px] max-w-[100px] lg:min-w-[110px] lg:max-w-[130px] xl:min-w-[120px] xl:max-w-[140px] px-1 lg:px-2 xl:px-3 py-3 lg:py-4 text-[10px] sm:text-xs lg:text-sm xl:text-base">
                                    <div className="flex items-center gap-1.5">
                                      {urgency.type === 'overdue' && !order.pronto && (
                                        <AlertTriangle
                                          className="h-3.5 w-3.5 text-red-500 flex-shrink-0"
                                          aria-hidden="true"
                                        />
                                      )}
                                      {urgency.type === 'today' && !order.pronto && (
                                        <Clock
                                          className="h-3.5 w-3.5 text-orange-500 flex-shrink-0"
                                          aria-hidden="true"
                                        />
                                      )}
                                      {urgency.type === 'tomorrow' && !order.pronto && (
                                        <Clock
                                          className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0"
                                          aria-hidden="true"
                                        />
                                      )}
                                      <span
                                        className={`
                               font-medium
                               ${urgency.type === 'overdue' && !order.pronto ? 'text-red-600 dark:text-red-400' : ''}
                               ${urgency.type === 'today' && !order.pronto ? 'text-orange-600 dark:text-orange-400' : ''}
                               ${urgency.type === 'tomorrow' && !order.pronto ? 'text-yellow-600 dark:text-yellow-500' : ''}
                               ${urgency.type === 'soon' && !order.pronto ? 'text-amber-600 dark:text-amber-400' : ''}
                             `}
                                      >
                                        {formatDateForDisplay(order.data_entrega, '-')}
                                      </span>
                                      {urgency.type === 'overdue' && !order.pronto && (
                                        <span
                                          className="text-[9px] lg:text-[10px] font-semibold text-red-600 dark:text-red-400"
                                          title={`Atrasado há ${urgency.days} dia(s)`}
                                        >
                                          ({urgency.days}d)
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden hd:table-cell whitespace-nowrap min-w-[70px] max-w-[85px] lg:min-w-[90px] lg:max-w-[110px] xl:min-w-[100px] xl:max-w-[120px] px-1 lg:px-2 xl:px-3 py-3 lg:py-4">
                                    <Badge
                                      variant={
                                        order.prioridade === 'ALTA' ? 'destructive' : 'secondary'
                                      }
                                      className={`
                              text-[10px] lg:text-xs xl:text-sm px-1.5 py-0 lg:px-2 lg:py-0.5 font-semibold
                              ${order.prioridade === 'ALTA' ? 'animate-pulse' : ''}
                              ${order.prioridade === 'ALTA' && isDelayed ? 'ring-2 ring-red-400 ring-offset-1' : ''}
                            `}
                                    >
                                      {order.prioridade || 'NORMAL'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden 2xl:table-cell min-w-[100px] max-w-[130px] lg:min-w-[130px] lg:max-w-[160px] xl:min-w-[150px] xl:max-w-[180px] truncate px-1 lg:px-2 xl:px-3 py-3 lg:py-4 text-[10px] sm:text-xs lg:text-sm xl:text-base">
                                    {order.cidade_cliente && order.estado_cliente
                                      ? `${order.cidade_cliente}/${order.estado_cliente}`
                                      : order.cidade_cliente || '-'}
                                  </TableCell>

                                  {/* Checkboxes de Status */}
                                  {/* Financeiro - Apenas admins podem alterar */}
                                  <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-3 lg:py-4">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <Checkbox
                                              checked={order.financeiro === true}
                                              disabled={!isAdmin}
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
                                                !isAdmin ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                                                order.financeiro
                                                  ? "bg-orange-500 border-orange-500 text-white shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                                                  : "bg-transparent border-slate-300"
                                              )}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-bold">Financeiro</p>
                                          {!isAdmin && (
                                            <p className="text-xs mt-0.5 opacity-80">
                                              Somente administradores.
                                            </p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>

                                  {/* Hr. liberação - persistido no backend */}
                                  <TableCell className="hidden sm:table-cell text-center whitespace-nowrap min-w-[55px] max-w-[75px] lg:min-w-[60px] lg:max-w-[80px] xl:min-w-[65px] xl:max-w-[85px] px-0 lg:px-1 xl:px-2 py-3 lg:py-4 border-x border-border/10">
                                    {formatTimeHHmm(order.financeiro_liberado_em)}
                                  </TableCell>

                                  {/* Conferência - Só habilitado se Financeiro estiver marcado */}
                                  <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-3 lg:py-4">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <Checkbox
                                              checked={order.conferencia === true}
                                              disabled={!order.financeiro || !canToggleConferencia}
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
                                                (!order.financeiro || !canToggleConferencia) ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                                                order.conferencia
                                                  ? "bg-amber-600 border-amber-600 text-white shadow-[0_0_8px_rgba(217,119,6,0.4)]"
                                                  : "bg-transparent border-slate-300"
                                              )}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Conferência</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>

                                  {/* Impressão - Só habilitado se Financeiro estiver marcado */}
                                  <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-3 lg:py-4">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <Checkbox
                                              checked={order.sublimacao === true}
                                              disabled={!order.financeiro || !canToggleImpressao}
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
                                                (!order.financeiro || !canToggleImpressao) ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                                                order.sublimacao
                                                  ? "bg-purple-600 border-purple-600 text-white shadow-[0_0_8px_rgba(147,51,234,0.4)]"
                                                  : "bg-transparent border-slate-300"
                                              )}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Impressão</TooltipContent>
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

                                  {/* Costura - Só habilitado se Financeiro estiver marcado */}
                                  <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-3 lg:py-4">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <Checkbox
                                              checked={order.costura === true}
                                              disabled={!order.financeiro}
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
                                                !order.financeiro ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                                                order.costura
                                                  ? "bg-blue-600 border-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                                                  : "bg-transparent border-slate-300"
                                              )}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Costura</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>

                                  {/* Expedição - Só habilitado se Financeiro estiver marcado */}
                                  <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2 py-3 lg:py-4">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <Checkbox
                                              checked={order.expedicao === true}
                                              disabled={!order.financeiro}
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
                                                !order.financeiro ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-110",
                                                order.expedicao
                                                  ? "bg-green-600 border-green-600 text-white shadow-[0_0_8px_rgba(22,163,74,0.4)]"
                                                  : "bg-transparent border-slate-300"
                                              )}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Expedição</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>

                                  {/* Status (Pronto / Em andamento) - Campo calculado automaticamente */}
                                  <TableCell className="hidden sm:table-cell text-center whitespace-nowrap min-w-[80px] max-w-[100px] lg:min-w-[90px] lg:max-w-[110px] xl:min-w-[100px] xl:max-w-[120px] hd:min-w-[120px] px-1 lg:px-2 xl:px-3 py-3 lg:py-4 border-l border-border/10">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {order.pronto ? (
                                        <Badge className="bg-green-600 hover:bg-green-700 text-white border-none shadow-[0_0_8px_rgba(22,163,74,0.3)] h-6 px-3 uppercase text-[10px] font-black tracking-widest">
                                          PRONTO
                                        </Badge>
                                      ) : isDelayed ? (
                                        <Badge variant="destructive" className="animate-pulse h-6 px-3 uppercase text-[10px] font-black tracking-widest ring-1 ring-red-400 ring-offset-1">
                                          ATRASADO
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="h-6 px-3 uppercase text-[10px] font-black tracking-widest border-none bg-slate-100 text-slate-500 dark:bg-slate-800">
                                          EM CURSO
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right whitespace-nowrap sticky right-0 z-30 border-l min-w-[100px] max-w-[120px] lg:min-w-[110px] lg:max-w-[130px] xl:min-w-[120px] xl:max-w-[140px] hd:min-w-[160px] px-1 lg:px-2 xl:px-3 py-3 lg:py-4 transition-colors",
                                    isSelected ? "bg-primary/20" : "bg-background group-even/row:bg-muted"
                                  )}>
                                    <div className="flex justify-end gap-1 lg:gap-2">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => handleQuickShare(order)}
                                              className="h-8 w-8 lg:h-9 lg:w-9 transition-all duration-300 hover:scale-110 hover:bg-primary/10 hover:text-primary active:scale-95"
                                              title="Ação Rápida: Copiar itens para WhatsApp"
                                            >
                                              <Camera className="h-4 w-4 lg:h-5 lg:w-5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Copiar para WhatsApp</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => handleViewOrder(order)}
                                              className="h-8 w-8 lg:h-9 lg:w-9 transition-all duration-300 hover:scale-110 hover:bg-blue-500/10 hover:text-blue-600 active:scale-95"
                                              title="Visualizar Pedido"
                                            >
                                              <FileText className="h-4 w-4 lg:h-5 lg:w-5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Visualizar</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(order);
                                              }}
                                              className="h-8 w-8 lg:h-9 lg:w-9 transition-all duration-300 hover:scale-110 hover:bg-amber-500/10 hover:text-amber-600 active:scale-95"
                                            >
                                              <Edit className="h-4 w-4 lg:h-5 lg:w-5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Editar</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDuplicateClick(order);
                                              }}
                                              className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                                              title="Duplicar pedido"
                                            >
                                              <Copy className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Duplicar pedido</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCreateReplacementClick(order);
                                              }}
                                              className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                                              title="Criar ficha de reposição"
                                            >
                                              <RefreshCw className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Criar ficha de reposição</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      {isAdmin && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(order.id);
                                          }}
                                          className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );

});
OrderTableRow.displayName = 'OrderTableRow';
