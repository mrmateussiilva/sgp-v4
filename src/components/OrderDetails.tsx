import { useEffect, useMemo, useState } from 'react';
import { useOrderStore } from '../store/orderStore';
import { OrderAuditLogEntry, OrderItem, OrderStatus } from '../types';
import { api } from '@/services/api';
import { ordersSocket, OrderEventMessage } from '@/lib/realtimeOrders';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const FIELD_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  cidade_cliente: 'Cidade',
  estado_cliente: 'Estado',
  telefone_cliente: 'Telefone',
  data_entrega: 'Data de entrega',
  prioridade: 'Prioridade',
  forma_envio: 'Forma de envio',
  forma_pagamento_id: 'Forma de pagamento',
  observacao: 'Observação',
  valor_frete: 'Valor do frete',
  status: 'Status',
};

interface OrderDetailsProps {
  open: boolean;
  onClose: () => void;
}

export default function OrderDetails({ open, onClose }: OrderDetailsProps) {
  const selectedOrder = useOrderStore((state) => state.selectedOrder);
  const [history, setHistory] = useState<OrderAuditLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !selectedOrder) {
      setHistory([]);
      setHistoryError(null);
      return;
    }

    let isMounted = true;
    setHistoryLoading(true);

    api
      .getOrderHistory(selectedOrder.id)
      .then((entries) => {
        if (!isMounted) return;
        setHistory(entries);
        setHistoryError(null);
      })
      .catch((error) => {
        console.error('Erro ao buscar histórico do pedido:', error);
        if (!isMounted) return;
        setHistory([]);
        setHistoryError('Não foi possível carregar o histórico de alterações.');
      })
      .finally(() => {
        if (isMounted) {
          setHistoryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, selectedOrder?.id]);

  // Integração com eventos de pedidos em tempo real
  // Quando o pedido sendo visualizado é atualizado, recarregar dados
  useEffect(() => {
    if (!open || !selectedOrder) {
      return;
    }

    let isMounted = true;

    const { updateOrder: updateOrderInStore } = useOrderStore.getState();

    const handleMessage = async (message: OrderEventMessage) => {
      if (!isMounted) return;

      const orderId = message.order_id || (message as any).pedido_id;
      if (!orderId || orderId !== selectedOrder.id) return;

      // Mapear tipos de eventos
      const type = message.type;
      const isUpdate = type === 'order_updated' || type === 'order_status_updated' || type === 'pedido_atualizado';
      const isCancel = type === 'order_deleted' || type === 'order_canceled' || type === 'pedido_cancelado';

      if (isUpdate || isCancel) {
        try {
          const updatedOrder = await api.getOrderById(orderId);
          if (updatedOrder && isMounted) {
            updateOrderInStore(updatedOrder);
            // Recarregar histórico se for update
            if (isUpdate) {
              const entries = await api.getOrderHistory(orderId);
              if (isMounted) setHistory(entries);
            }
          }
        } catch (error) {
          console.error('Erro ao recarregar pedido após evento:', error);
        }
      }
    };

    const unsubscribe = ordersSocket.subscribe(handleMessage);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [open, selectedOrder?.id]);

  const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Pendente:
        return 'warning';
      case OrderStatus.EmProcessamento:
        return 'info';
      case OrderStatus.Concluido:
        return 'success';
      case OrderStatus.Cancelado:
        return 'destructive';
      default:
        return 'default';
    }
  };

  const numeroDisplay = selectedOrder?.numero ?? selectedOrder?.id.toString() ?? '';
  const cliente = selectedOrder?.cliente ?? selectedOrder?.customer_name ?? 'Não informado';
  const telefone = selectedOrder?.telefone_cliente ?? 'Não informado';
  const cidade = selectedOrder?.cidade_cliente ?? 'Não informado';
  const estado = selectedOrder?.estado_cliente ?? '';
  const prioridade = selectedOrder?.prioridade ?? 'NORMAL';
  const formaEnvio = selectedOrder?.forma_envio ?? 'Não informado';
  const formaPagamento = selectedOrder?.forma_pagamento_id
    ? `ID ${selectedOrder.forma_pagamento_id}`
    : 'Não informado';
  const observacao = selectedOrder?.observacao ?? 'Sem observações registradas.';
  const dataEntrega = formatDate(selectedOrder?.data_entrega);
  const dataCriacao = formatDateTime(selectedOrder?.created_at);
  const createdByStatusBadge = selectedOrder ? getStatusVariant(selectedOrder.status) : 'default';
  const valorFrete = formatCurrency(selectedOrder?.valor_frete);
  const valorTotal = formatCurrency(selectedOrder?.total_value);

  const formatBooleanTag = (label: string, value: unknown) => {
    if (typeof value === 'boolean') {
      if (!value) return null;
      return label;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'sim', 'yes'].includes(normalized)) {
        return label;
      }
    }
    if (typeof value === 'number') {
      if (value === 1) return label;
    }
    return null;
  };

  const buildItemExtraDetails = (item: OrderItem) => {
    const extras: string[] = [];
    const tipo = item.tipo_producao?.toLowerCase() || '';

    const pushIf = (label: string, value: unknown) => {
      const formatted = formatBooleanTag(label, value);
      if (formatted) extras.push(formatted);
    };

    if (tipo === 'painel' || tipo === 'generica') {
      pushIf('Overloque', item.overloque);
      pushIf('Elástico', item.elastico);

      if (item.tipo_acabamento && item.tipo_acabamento !== 'nenhum') {
        extras.push(`Acabamento: ${item.tipo_acabamento}`);
      }
      if (item.quantidade_ilhos) extras.push(`Ilhós: ${item.quantidade_ilhos}`);
      if (item.quantidade_cordinha) extras.push(`Cordinha: ${item.quantidade_cordinha}`);
      if (item.emenda && item.emenda !== 'sem-emenda') {
        extras.push(`Emenda: ${item.emenda}${item.emenda_qtd ? ` (${item.emenda_qtd})` : ''}`);
      }

      if (tipo === 'generica') {
        pushIf('Zíper', item.ziper);
        pushIf('Cordinha extra', item.cordinha_extra);
        pushIf('Alcinha', item.alcinha);
        pushIf('Toalha pronta', item.toalha_pronta);
      }
    }

    if (tipo === 'lona') {
      pushIf('Terceirizado', item.terceirizado);
      if (item.acabamento_lona) extras.push(`Acabamento lona: ${item.acabamento_lona}`);
    }

    if (tipo === 'totem') {
      if (item.acabamento_totem) extras.push(`Acabamento totem: ${item.acabamento_totem}`);
      if ((item as any).acabamento_totem_outro) {
        extras.push(`Acabamento extra: ${(item as any).acabamento_totem_outro}`);
      }
    }

    if (tipo === 'adesivo') {
      if (item.tipo_adesivo) extras.push(`Tipo adesivo: ${item.tipo_adesivo}`);
    }

    if (extras.length === 0) {
      extras.push('Sem detalhes adicionais.');
    }

    return extras;
  };

  const historyRows = useMemo(() => {
    return history.map((entry) => {
      const rawChanges = entry.changes as Record<
        string,
        { before?: unknown; after?: unknown }
      >;
      const parsedChanges = Object.entries(rawChanges ?? {}) as Array<
        [string, { before?: unknown; after?: unknown }]
      >;
      return {
        ...entry,
        parsedChanges,
      };
    });
  }, [history]);

  if (!selectedOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Detalhes do Pedido {numeroDisplay ? `#${numeroDisplay}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={createdByStatusBadge} className="mt-1">
                {selectedOrder.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Data de criação</p>
              <p className="text-sm">{dataCriacao}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Data de entrega</p>
              <p className="text-sm">{dataEntrega}</p>
            </div>
          </section>

          <Separator />

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Cliente</p>
              <p className="text-sm">{cliente}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Telefone</p>
              <p className="text-sm">{telefone}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Local</p>
              <p className="text-sm">
                {cidade}
                {estado ? ` / ${estado}` : ''}
              </p>
            </div>
          </section>

          <Separator />

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Prioridade</p>
              <p className="text-sm">{prioridade}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Forma de envio</p>
              <p className="text-sm">{formaEnvio}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Forma de pagamento</p>
              <p className="text-sm">{formaPagamento}</p>
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Observações</p>
            <p className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-muted/50">
              {observacao}
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Itens do pedido</h3>
                <p className="text-sm text-muted-foreground">
                  Lista completa dos itens registrados para este pedido.
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Valor do frete</p>
                <p className="text-base font-medium">R$ {valorFrete}</p>
                <p className="text-sm text-muted-foreground pt-1">Total</p>
                <p className="text-2xl font-bold">R$ {valorTotal}</p>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-right">Preço Unitário</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">R$ {formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {formatCurrency(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={`details-${item.id}`} className="rounded-md border border-dashed border-muted px-3 py-2">
                  <p className="text-sm font-semibold text-muted-foreground mb-1">
                    Detalhes {item.tipo_producao ? `(${item.tipo_producao.toUpperCase()})` : ''}
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {buildItemExtraDetails(item).map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Histórico de alterações</h3>
              <p className="text-sm text-muted-foreground">
                Últimas mudanças realizadas neste pedido. Todas as edições feitas na tela de edição rápida ficam registradas aqui.
              </p>
            </div>
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            ) : historyError ? (
              <p className="text-sm text-destructive">{historyError}</p>
            ) : historyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma alteração registrada até o momento.</p>
            ) : (
              <div className="space-y-4">
                {historyRows.map((entry) => (
                  <div key={entry.id} className="border rounded-md p-4 bg-muted/30">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {entry.changed_by_name ?? 'Usuário desconhecido'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline">Alterações: {entry.parsedChanges.length}</Badge>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm">
                      {entry.parsedChanges.map(([field, change]) => (
                        <li key={field} className="flex flex-col">
                          <span className="font-medium text-muted-foreground">
                            {FIELD_LABELS[field] ?? field}
                          </span>
                          <span>
                            {formatChangeValue(change.before)} →{' '}
                            <span className="font-semibold">{formatChangeValue(change.after)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) {
    return '0,00';
  }
  if (typeof value === 'number') {
    return value.toFixed(2).replace('.', ',');
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      return value;
    }
    return parsed.toFixed(2).replace('.', ',');
  }
  if (typeof value === 'object' && value !== null) {
    const decimalObject = value as Record<string, unknown> & { toString?: () => string };

    if (typeof decimalObject.$numberDecimal === 'string') {
      return formatCurrency(decimalObject.$numberDecimal);
    }

    if (typeof decimalObject.value === 'string' || typeof decimalObject.value === 'number') {
      return formatCurrency(decimalObject.value);
    }

    const maybeString = decimalObject.toString?.();
    if (maybeString && maybeString !== '[object Object]') {
      return formatCurrency(maybeString);
    }
  }
  return String(value);
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Não informado';
  }

  // Se é formato YYYY-MM-DD, formatar diretamente sem Date (evita deslocamento de fuso)
  if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }

  // Se tem timestamp, extrair apenas a parte da data
  if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    const dateOnly = value.split('T')[0];
    const [y, m, d] = dateOnly.split('-');
    return `${d}/${m}/${y}`;
  }

  // Tentar extrair data do início
  const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    return `${d}/${m}/${y}`;
  }

  return value;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Não informado';
  }

  try {
    // Se tem timestamp ISO, extrair data e hora separadamente
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      const [datePart, timePart] = value.split('T');
      const [y, m, d] = datePart.split('-');
      const time = timePart.split('.')[0]; // Remove milissegundos se houver
      const [h, min, s] = time.split(':');

      // Formatar data como DD/MM/YYYY HH:mm:ss
      return `${d}/${m}/${y} ${h}:${min}${s ? ':' + s : ''}`;
    }

    // Se é apenas data YYYY-MM-DD, formatar como data
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = value.split('-');
      return `${d}/${m}/${y}`;
    }

    // Fallback: tentar parsear como data local
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    const decimalObject = value as Record<string, unknown> & { toString?: () => string };
    if (
      typeof decimalObject.$numberDecimal === 'string' ||
      typeof decimalObject.value === 'string' ||
      typeof decimalObject.value === 'number'
    ) {
      return formatCurrency(decimalObject);
    }
    if (value && 'toString' in value) {
      const str = decimalObject.toString?.();
      if (str !== '[object Object]') {
        return str || '';
      }
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return String(value);
}
