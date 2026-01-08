import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderStatus, OrderWithItems, UpdateOrderMetadataRequest } from '@/types';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface OrderQuickEditDialogProps {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (order: OrderWithItems) => void;
}

interface FormState {
  cliente: string;
  telefone_cliente: string;
  cidade_cliente: string;
  estado_cliente: string;
  data_entrega: string;
  prioridade: string;
  forma_envio: string;
  portador_nome: string;
  forma_pagamento_id: string;
  valor_frete: string;
  observacao: string;
  status: OrderStatus;
}

const PRIORIDADES = ['NORMAL', 'URGENTE', 'BAIXA'];

const STATUS_OPTIONS = [
  OrderStatus.Pendente,
  OrderStatus.EmProcessamento,
  OrderStatus.Concluido,
  OrderStatus.Cancelado,
];

export function OrderQuickEditDialog({
  orderId,
  open,
  onOpenChange,
  onUpdated,
}: OrderQuickEditDialogProps) {
  const { toast } = useToast();
  const isPortadorFormaEnvio = (value: string) => /^portador\b/i.test((value || '').trim());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    cliente: '',
    telefone_cliente: '',
    cidade_cliente: '',
    estado_cliente: '',
    data_entrega: '',
    prioridade: 'NORMAL',
    forma_envio: '',
    portador_nome: '',
    forma_pagamento_id: '',
    valor_frete: '',
    observacao: '',
    status: OrderStatus.Pendente,
  });
  const [formasEnvio, setFormasEnvio] = useState<Array<{ id: number; nome: string; valor?: string | number }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: number; nome: string }>>([]);
  const [originalOrder, setOriginalOrder] = useState<OrderWithItems | null>(null);

  useEffect(() => {
    if (!open) {
      setOriginalOrder(null);
      return;
    }

    const loadData = async () => {
      if (!orderId) {
        return;
      }
      setLoading(true);
      try {
        const [order, envio, pagamento] = await Promise.all([
          api.getOrderById(orderId),
          api.getFormasEnvioAtivas(),
          api.getFormasPagamentoAtivas(),
        ]);

        setFormasEnvio(envio || []);
        setFormasPagamento(pagamento || []);
        setOriginalOrder(order);

        const rawFormaEnvio = (order.forma_envio ?? '').trim();
        const isPortador = /^portador\b/i.test(rawFormaEnvio);
        const portadorNome =
          isPortador
            ? rawFormaEnvio
                .replace(/^portador\b/i, '')
                .replace(/^(\s*[-:]\s*)/, '')
                .trim()
            : '';
        const formaEnvioBase = isPortador ? 'Portador' : (order.forma_envio ?? '');

        setForm({
          cliente: order.cliente ?? order.customer_name ?? '',
          telefone_cliente: order.telefone_cliente ?? '',
          cidade_cliente: order.cidade_cliente ?? '',
          estado_cliente: order.estado_cliente ?? '',
          data_entrega: order.data_entrega ? order.data_entrega.slice(0, 10) : '',
          prioridade: order.prioridade ?? 'NORMAL',
          forma_envio: formaEnvioBase,
          portador_nome: portadorNome,
          forma_pagamento_id: order.forma_pagamento_id ? order.forma_pagamento_id.toString() : '',
          valor_frete: normalizeValorFrete(order.valor_frete),
          observacao: order.observacao ?? '',
          status: order.status ?? OrderStatus.Pendente,
        });
      } catch (error) {
        console.error('Erro ao carregar dados para edição:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as informações do pedido para edição.',
          variant: 'destructive',
        });
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, orderId, toast, onOpenChange]);

  const disableSave = useMemo(() => {
    if (!originalOrder) {
      return true;
    }
    return !hasChanges(originalOrder, form);
  }, [originalOrder, form]);

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!orderId || !originalOrder) {
      return;
    }

    if (isPortadorFormaEnvio(form.forma_envio) && !form.portador_nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do portador para salvar.',
        variant: 'destructive',
      });
      return;
    }

    const payload = buildPayload(orderId, originalOrder, form);
    if (!payload) {
      toast({
        title: 'Sem alterações',
        description: 'Nenhuma mudança foi detectada para este pedido.',
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateOrderMetadata(payload);
      onUpdated(updated);
      toast({
        title: 'Pedido atualizado',
        description: `As informações do pedido ${updated.numero ?? updated.id} foram atualizadas.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar alterações do pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edição rápida do pedido</DialogTitle>
          <DialogDescription>
            Atualize os dados cadastrais do pedido. Todas as alterações ficam registradas no histórico.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Carregando informações do pedido...
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={form.cliente}
                  onChange={(e) => handleInputChange('cliente', e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone_cliente">Telefone</Label>
                <Input
                  id="telefone_cliente"
                  value={form.telefone_cliente}
                  onChange={(e) => handleInputChange('telefone_cliente', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade_cliente">Cidade</Label>
                <Input
                  id="cidade_cliente"
                  value={form.cidade_cliente}
                  onChange={(e) => handleInputChange('cidade_cliente', e.target.value)}
                  placeholder="Cidade do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado_cliente">Estado</Label>
                <Input
                  id="estado_cliente"
                  value={form.estado_cliente}
                  onChange={(e) => handleInputChange('estado_cliente', e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_entrega">Data de entrega</Label>
                <Input
                  id="data_entrega"
                  type="date"
                  value={form.data_entrega}
                  onChange={(e) => handleInputChange('data_entrega', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(value) => handleInputChange('prioridade', value)}
                >
                  <SelectTrigger id="prioridade">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: OrderStatus) => handleInputChange('status', value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_frete">Valor do frete (R$)</Label>
                <Input
                  id="valor_frete"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={form.valor_frete}
                  onChange={(e) => handleInputChange('valor_frete', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forma_envio">Forma de envio</Label>
                <Select
                  value={form.forma_envio}
                  onValueChange={(value) => {
                    const normalizedValue = isPortadorFormaEnvio(value) ? 'Portador' : value;
                    handleInputChange('forma_envio', normalizedValue);
                    if (!isPortadorFormaEnvio(value)) {
                      handleInputChange('portador_nome', '');
                    }
                  }}
                >
                  <SelectTrigger id="forma_envio">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {formasEnvio.map((forma) => (
                      <SelectItem key={forma.id} value={isPortadorFormaEnvio(String(forma.nome)) ? 'Portador' : forma.nome}>
                        {forma.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isPortadorFormaEnvio(form.forma_envio) && (
                <div className="space-y-2">
                  <Label htmlFor="portador_nome">Nome do portador *</Label>
                  <Input
                    id="portador_nome"
                    value={form.portador_nome}
                    onChange={(e) => handleInputChange('portador_nome', e.target.value)}
                    placeholder="Ex.: João"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="forma_pagamento">Forma de pagamento</Label>
                <Select
                  value={form.forma_pagamento_id}
                  onValueChange={(value) => handleInputChange('forma_pagamento_id', value)}
                >
                  <SelectTrigger id="forma_pagamento">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map((forma) => (
                      <SelectItem key={forma.id} value={forma.id.toString()}>
                        {forma.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={form.observacao}
                onChange={(e) => handleInputChange('observacao', e.target.value)}
                rows={4}
                placeholder="Detalhes adicionais sobre o pedido"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || disableSave}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeValorFrete(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return '';
  }
  if (typeof valor === 'number') {
    return valor.toFixed(2);
  }
  const parsed = parseFloat(valor.toString().replace(',', '.'));
  if (Number.isNaN(parsed)) {
    return '';
  }
  return parsed.toFixed(2);
}

function hasChanges(original: OrderWithItems, form: FormState): boolean {
  const originalCliente = original.cliente ?? original.customer_name ?? '';
  const originalTelefone = original.telefone_cliente ?? '';
  const originalCidade = original.cidade_cliente ?? '';
  const originalEstado = original.estado_cliente ?? '';
  const originalDataEntrega = original.data_entrega ? original.data_entrega.slice(0, 10) : '';
  const originalPrioridade = original.prioridade ?? 'NORMAL';
  const originalFormaEnvio = original.forma_envio ?? '';
  const originalFormaPagamento = original.forma_pagamento_id ? original.forma_pagamento_id.toString() : '';
  const originalValorFrete = normalizeValorFrete(original.valor_frete);
  const originalObservacao = original.observacao ?? '';
  const originalStatus = original.status ?? OrderStatus.Pendente;

  const finalFormaEnvio =
    /^portador\b/i.test((form.forma_envio || '').trim())
      ? `Portador${form.portador_nome.trim() ? ` - ${form.portador_nome.trim()}` : ''}`
      : form.forma_envio;

  return (
    form.cliente.trim() !== originalCliente ||
    form.telefone_cliente.trim() !== originalTelefone ||
    form.cidade_cliente.trim() !== originalCidade ||
    form.estado_cliente.trim() !== originalEstado ||
    form.data_entrega !== originalDataEntrega ||
    form.prioridade !== originalPrioridade ||
    finalFormaEnvio !== originalFormaEnvio ||
    form.forma_pagamento_id !== originalFormaPagamento ||
    normalizeValorFrete(form.valor_frete) !== originalValorFrete ||
    form.observacao.trim() !== originalObservacao ||
    form.status !== originalStatus
  );
}

function buildPayload(
  id: number,
  original: OrderWithItems,
  form: FormState
): UpdateOrderMetadataRequest | null {
  const payload: UpdateOrderMetadataRequest = { id };
  let changed = false;

  const originalCliente = original.cliente ?? original.customer_name ?? '';
  const trimmedCliente = form.cliente.trim();
  if (trimmedCliente && trimmedCliente !== originalCliente) {
    payload.cliente = trimmedCliente;
    changed = true;
  }

  const originalTelefone = original.telefone_cliente ?? '';
  const trimmedTelefone = form.telefone_cliente.trim();
  if (trimmedTelefone !== originalTelefone) {
    payload.telefone_cliente = trimmedTelefone;
    changed = true;
  }

  const originalCidade = original.cidade_cliente ?? '';
  const trimmedCidade = form.cidade_cliente.trim();
  if (trimmedCidade !== originalCidade) {
    payload.cidade_cliente = trimmedCidade;
    changed = true;
  }

  const originalEstado = original.estado_cliente ?? '';
  const trimmedEstado = form.estado_cliente.trim().toUpperCase();
  if (trimmedEstado !== originalEstado) {
    payload.estado_cliente = trimmedEstado;
    changed = true;
  }

  const originalDataEntrega = original.data_entrega ? original.data_entrega.slice(0, 10) : '';
  if (form.data_entrega !== originalDataEntrega) {
    payload.data_entrega = form.data_entrega;
    changed = true;
  }

  const originalPrioridade = original.prioridade ?? 'NORMAL';
  if (form.prioridade !== originalPrioridade) {
    payload.prioridade = form.prioridade;
    changed = true;
  }

  const originalFormaEnvio = original.forma_envio ?? '';
  const finalFormaEnvio =
    /^portador\b/i.test((form.forma_envio || '').trim())
      ? `Portador${form.portador_nome.trim() ? ` - ${form.portador_nome.trim()}` : ''}`
      : form.forma_envio;
  if (finalFormaEnvio !== originalFormaEnvio) {
    payload.forma_envio = finalFormaEnvio;
    changed = true;
  }

  const originalFormaPagamento = original.forma_pagamento_id
    ? original.forma_pagamento_id.toString()
    : '';
  if (form.forma_pagamento_id !== originalFormaPagamento && form.forma_pagamento_id) {
    payload.forma_pagamento_id = parseInt(form.forma_pagamento_id, 10);
    changed = true;
  }

  const originalValorFrete = normalizeValorFrete(original.valor_frete);
  const valorFreteAtual = normalizeValorFrete(form.valor_frete);
  if (valorFreteAtual !== originalValorFrete && valorFreteAtual !== '') {
    payload.valor_frete = parseFloat(valorFreteAtual);
    changed = true;
  }

  const originalObservacao = original.observacao ?? '';
  const trimmedObservacao = form.observacao.trim();
  if (trimmedObservacao !== originalObservacao) {
    payload.observacao = trimmedObservacao;
    changed = true;
  }

  const originalStatus = original.status ?? OrderStatus.Pendente;
  if (form.status !== originalStatus) {
    payload.status = form.status;
    changed = true;
  }

  return changed ? payload : null;
}
