import { useEffect, useMemo, useState } from 'react';
import { useOrderStore } from '../store/orderStore';
import { OrderAuditLogEntry, OrderStatus } from '../types';
import { api } from '@/services/api';
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
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Não informado';
  }
  try {
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
        return str;
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
