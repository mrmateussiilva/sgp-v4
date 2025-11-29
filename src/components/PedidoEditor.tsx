import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { useOrderStore } from '../store/orderStore';
import { OrderStatus, UpdateOrderRequest, UpdateOrderItemRequest, OrderItem } from '../types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from '@/components/ui/currency-input';

interface EditableOrderItem {
  id?: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

function parseCurrencyValue(value: string): number {
  if (!value || value.trim() === '') return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function formatCurrencyValue(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export default function PedidoEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateOrder } = useOrderStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Dados do pedido
  const [cliente, setCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [cidadeCliente, setCidadeCliente] = useState('');
  const [estadoCliente, setEstadoCliente] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [designer, setDesigner] = useState('');
  const [observacao, setObservacao] = useState('');
  const [valorFrete, setValorFrete] = useState('0,00');
  const [formaPagamentoId, setFormaPagamentoId] = useState<number | null>(null);
  const [status, setStatus] = useState<OrderStatus>(OrderStatus.Pendente);
  const [prioridade, setPrioridade] = useState('NORMAL');
  const [dataEntrega, setDataEntrega] = useState('');

  // Itens do pedido
  const [items, setItems] = useState<EditableOrderItem[]>([]);

  // Catálogos
  const [vendedores, setVendedores] = useState<Array<{ id: number; nome: string }>>([]);
  const [designers, setDesigners] = useState<Array<{ id: number; nome: string }>>([]);
  const [formasPagamento, setFormasPagamento] = useState<Array<{ id: number; nome: string }>>([]);

  // Carregar catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [vend, des, pag] = await Promise.all([
          api.getVendedoresAtivos(),
          api.getDesignersAtivos(),
          api.getFormasPagamentoAtivas(),
        ]);
        setVendedores(vend);
        setDesigners(des);
        setFormasPagamento(pag);
      } catch (error) {
        console.error('Erro ao carregar catálogos:', error);
      }
    };
    loadCatalogs();
  }, []);

  // Carregar pedido
  useEffect(() => {
    if (!id) {
      toast({
        title: 'Erro',
        description: 'ID do pedido não fornecido.',
        variant: 'destructive',
      });
      navigate('/dashboard/orders');
      return;
    }

    const loadOrder = async () => {
      try {
        setLoading(true);
        const order = await api.getOrderById(parseInt(id, 10));

        // Preencher campos do pedido
        setCliente(order.cliente || order.customer_name || '');
        setTelefoneCliente(order.telefone_cliente || '');
        setCidadeCliente(order.cidade_cliente || '');
        setEstadoCliente(order.estado_cliente || '');
        setObservacao(order.observacao || '');
        setStatus(order.status);
        setPrioridade(order.prioridade || 'NORMAL');
        setDataEntrega(order.data_entrega || '');

        // Valor do frete
        const freteValue = typeof order.valor_frete === 'number' 
          ? order.valor_frete 
          : parseCurrencyValue(String(order.valor_frete || '0'));
        setValorFrete(formatCurrencyValue(freteValue));

        // Forma de pagamento
        setFormaPagamentoId(order.forma_pagamento_id || null);

        // Extrair vendedor e designer do primeiro item (se existir)
        if (order.items && order.items.length > 0) {
          const firstItem = order.items[0];
          setVendedor(firstItem.vendedor || '');
          setDesigner(firstItem.designer || '');
        }

        // Converter itens para formato editável
        const editableItems: EditableOrderItem[] = order.items.map((item) => ({
          id: item.id,
          item_name: item.item_name || item.descricao || '',
          quantity: item.quantity || 1,
          unit_price: typeof item.unit_price === 'number' 
            ? item.unit_price 
            : parseCurrencyValue(String(item.unit_price || '0')),
          subtotal: (item.quantity || 1) * (typeof item.unit_price === 'number' 
            ? item.unit_price 
            : parseCurrencyValue(String(item.unit_price || '0'))),
        }));

        setItems(editableItems);

        // Verificar se está concluído (bloqueado)
        setIsLocked(order.status === OrderStatus.Concluido);
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o pedido.',
          variant: 'destructive',
        });
        navigate('/dashboard/orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id, navigate, toast]);

  // Recalcular subtotais e total
  const recalculateItem = (item: EditableOrderItem): EditableOrderItem => {
    return {
      ...item,
      subtotal: item.quantity * item.unit_price,
    };
  };

  const totalItens = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const totalPedido = useMemo(() => {
    const frete = parseCurrencyValue(valorFrete);
    return totalItens + frete;
  }, [totalItens, valorFrete]);

  // Handlers de mudança
  const handleItemChange = (
    index: number,
    field: keyof EditableOrderItem,
    value: string | number
  ) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'item_name') {
      item.item_name = String(value);
    } else if (field === 'quantity') {
      item.quantity = Math.max(1, Number(value) || 1);
    } else if (field === 'unit_price') {
      item.unit_price = Math.max(0, Number(value) || 0);
    }

    const recalculated = recalculateItem(item);
    newItems[index] = recalculated;
    setItems(newItems);
  };

  const handleItemPriceChange = (index: number, value: string) => {
    const numericValue = parseCurrencyValue(value);
    handleItemChange(index, 'unit_price', numericValue);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        item_name: '',
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      toast({
        title: 'Aviso',
        description: 'O pedido deve ter pelo menos um item.',
        variant: 'default',
      });
    }
  };

  const reopenOrder = () => {
    setStatus(OrderStatus.Pendente);
    setIsLocked(false);
    toast({
      title: 'Pedido Reaberto',
      description: 'O pedido foi reaberto e pode ser editado novamente.',
    });
  };

  const validateForm = (): string | null => {
    if (!cliente || cliente.trim() === '') {
      return 'O nome do cliente é obrigatório.';
    }

    if (items.length === 0) {
      return 'O pedido deve ter pelo menos um item.';
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.item_name || item.item_name.trim() === '') {
        return `O item ${i + 1} precisa ter uma descrição.`;
      }
      if (item.quantity <= 0) {
        return `O item ${i + 1} precisa ter quantidade maior que zero.`;
      }
      if (item.unit_price <= 0) {
        return `O item ${i + 1} precisa ter valor unitário maior que zero.`;
      }
    }

    const frete = parseCurrencyValue(valorFrete);
    if (frete < 0) {
      return 'O valor do frete não pode ser negativo.';
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Erro de Validação',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const freteValue = parseCurrencyValue(valorFrete);

      const updateItems: UpdateOrderItemRequest[] = items.map((item) => ({
        id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const updateRequest: UpdateOrderRequest = {
        id: parseInt(id!, 10),
        customer_name: cliente,
        cliente: cliente,
        address: cidadeCliente,
        cidade_cliente: cidadeCliente,
        estado_cliente: estadoCliente,
        telefone_cliente: telefoneCliente,
        status: status,
        prioridade: prioridade,
        forma_envio: '',
        forma_pagamento_id: formaPagamentoId,
        observacao: observacao,
        valor_frete: freteValue,
        data_entrega: dataEntrega || undefined,
        items: updateItems,
      };

      const updatedOrder = await api.updateOrder(updateRequest);
      updateOrder(updatedOrder);

      toast({
        title: 'Sucesso',
        description: 'Pedido atualizado com sucesso!',
      });

      navigate('/dashboard/orders');
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações do pedido.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/orders')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Editar Pedido #{id}
            </h1>
            <p className="text-muted-foreground">
              {isLocked ? 'Pedido concluído - Reabra para editar' : 'Atualize as informações do pedido'}
            </p>
          </div>
        </div>
        {isLocked && (
          <Button
            variant="outline"
            onClick={reopenOrder}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reabrir Pedido
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Dados do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
            <CardDescription>Informações básicas sobre o cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Nome do Cliente *</Label>
                <Input
                  id="cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  disabled={isLocked}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(e.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={cidadeCliente}
                  onChange={(e) => setCidadeCliente(e.target.value)}
                  placeholder="Cidade do cliente"
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={estadoCliente}
                  onChange={(e) => setEstadoCliente(e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                  disabled={isLocked}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Design e Vendedor */}
        <Card>
          <CardHeader>
            <CardTitle>Design e Vendedor</CardTitle>
            <CardDescription>Informações sobre design e vendedor responsável</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendedor">Vendedor</Label>
                <Input
                  id="vendedor"
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                  placeholder="Nome do vendedor"
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="designer">Designer</Label>
                <Input
                  id="designer"
                  value={designer}
                  onChange={(e) => setDesigner(e.target.value)}
                  placeholder="Nome do designer"
                  disabled={isLocked}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itens do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle>Itens do Pedido</CardTitle>
            <CardDescription>Gerencie os itens do pedido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[120px]">Quantidade</TableHead>
                    <TableHead className="w-[140px]">Valor Unitário</TableHead>
                    <TableHead className="w-[120px]">Subtotal</TableHead>
                    <TableHead className="w-[80px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.item_name}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          placeholder="Descrição do item"
                          disabled={isLocked}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          min={1}
                          disabled={isLocked}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <CurrencyInput
                          value={formatCurrencyValue(item.unit_price)}
                          onValueChange={(value) => handleItemPriceChange(index, value)}
                          disabled={isLocked}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {formatCurrencyValue(item.subtotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          disabled={isLocked || items.length === 1}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={isLocked}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>

            <Separator />

            <div className="flex justify-end">
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Subtotal dos Itens</p>
                <p className="text-xl font-semibold">R$ {formatCurrencyValue(totalItens)}</p>
                <p className="text-sm text-muted-foreground">Frete</p>
                <p className="text-lg">R$ {valorFrete}</p>
                <Separator className="my-2" />
                <p className="text-sm text-muted-foreground">Total do Pedido</p>
                <p className="text-2xl font-bold">R$ {formatCurrencyValue(totalPedido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagamento e Frete */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamento e Frete</CardTitle>
            <CardDescription>Informações sobre pagamento e envio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forma-pagamento">Forma de Pagamento</Label>
                <Select
                  value={formaPagamentoId?.toString() || ''}
                  onValueChange={(value) => setFormaPagamentoId(value ? parseInt(value, 10) : null)}
                  disabled={isLocked}
                >
                  <SelectTrigger id="forma-pagamento">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {formasPagamento.map((forma) => (
                      <SelectItem key={forma.id} value={forma.id.toString()}>
                        {forma.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frete">Valor do Frete (R$)</Label>
                <CurrencyInput
                  value={valorFrete}
                  onValueChange={setValorFrete}
                  disabled={isLocked}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status e Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Status e Observações</CardTitle>
            <CardDescription>Status do pedido e observações adicionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as OrderStatus)}
                  disabled={isLocked}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OrderStatus.Pendente}>Pendente</SelectItem>
                    <SelectItem value={OrderStatus.EmProcessamento}>Em Processamento</SelectItem>
                    <SelectItem value={OrderStatus.Concluido}>Concluído</SelectItem>
                    <SelectItem value={OrderStatus.Cancelado}>Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={prioridade}
                  onValueChange={setPrioridade}
                  disabled={isLocked}
                >
                  <SelectTrigger id="prioridade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-entrega">Data de Entrega</Label>
                <Input
                  id="data-entrega"
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observações adicionais sobre o pedido"
                disabled={isLocked}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/orders')}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || isLocked}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}

