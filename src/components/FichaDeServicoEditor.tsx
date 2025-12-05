import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CurrencyInput } from './ui/currency-input';
import { api } from '../services/api';
import { OrderFicha, OrderItemFicha } from '../types';
import { useToast } from '@/hooks/use-toast';

interface FichaDeServicoEditorProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedFicha: OrderFicha) => void;
}

const FichaDeServicoEditor: React.FC<FichaDeServicoEditorProps> = ({
  orderId,
  isOpen,
  onClose,
  onSave,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fichaData, setFichaData] = useState<OrderFicha | null>(null);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && orderId) {
      loadFichaData();
      loadFormasPagamento();
    }
  }, [isOpen, orderId]);

  const loadFichaData = async () => {
    try {
      setLoading(true);
      const data = await api.getOrderFicha(orderId);
      setFichaData(data);
    } catch (error) {
      console.error('Erro ao carregar dados da ficha:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da ficha.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFormasPagamento = async () => {
    try {
      const formas = await api.getFormasPagamentoAtivas();
      setFormasPagamento(formas);
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
    }
  };

  const updateOrderField = (field: keyof OrderFicha, value: any) => {
    if (!fichaData) return;
    setFichaData({
      ...fichaData,
      [field]: value,
    });
  };

  const updateItemField = (itemIndex: number, field: keyof OrderItemFicha, value: any) => {
    if (!fichaData) return;
    const updatedItems = [...fichaData.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: value,
    };
    setFichaData({
      ...fichaData,
      items: updatedItems,
    });
  };

  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const handleSave = () => {
    if (!fichaData) return;
    setSaving(true);
    try {
      onSave(fichaData);
      toast({
        title: 'Sucesso',
        description: 'Dados da ficha salvos com sucesso!',
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar ficha:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os dados da ficha.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !fichaData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editando Ficha de Serviço</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dados da ficha...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ficha de Serviço - OS #{fichaData.numero || fichaData.id}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pedido" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pedido">Dados do Pedido</TabsTrigger>
            <TabsTrigger value="itens">Itens</TabsTrigger>
          </TabsList>

          <TabsContent value="pedido" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cliente">Cliente</Label>
                    <Input
                      id="cliente"
                      value={fichaData.cliente || ''}
                      onChange={(e) => updateOrderField('cliente', e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={fichaData.telefone_cliente || ''}
                      onChange={(e) => updateOrderField('telefone_cliente', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={fichaData.cidade_cliente || ''}
                      onChange={(e) => updateOrderField('cidade_cliente', e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={fichaData.estado_cliente || ''}
                      onChange={(e) => updateOrderField('estado_cliente', e.target.value.toUpperCase())}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Datas e Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_entrada">Data de Entrada</Label>
                    <Input
                      id="data_entrada"
                      type="date"
                      value={formatDateForInput(fichaData.data_entrada)}
                      onChange={(e) => updateOrderField('data_entrada', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_entrega">Data de Entrega</Label>
                    <Input
                      id="data_entrega"
                      type="date"
                      value={formatDateForInput(fichaData.data_entrega)}
                      onChange={(e) => updateOrderField('data_entrega', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagamento e Envio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="forma_envio">Forma de Envio</Label>
                    <Input
                      id="forma_envio"
                      value={fichaData.forma_envio || ''}
                      onChange={(e) => updateOrderField('forma_envio', e.target.value)}
                      placeholder="Forma de envio"
                    />
                  </div>
                  <div>
                    <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                    <Select
                      value={fichaData.forma_pagamento_id?.toString() || ''}
                      onValueChange={(value) =>
                        updateOrderField('forma_pagamento_id', value ? parseInt(value) : undefined)
                      }
                    >
                      <SelectTrigger id="forma_pagamento">
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
                </div>
                <div>
                  <Label htmlFor="valor_frete">Valor do Frete</Label>
                  <CurrencyInput
                    id="valor_frete"
                    value={fichaData.valor_frete || 0}
                    onValueChange={(value) => updateOrderField('valor_frete', value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={fichaData.observacao || ''}
                  onChange={(e) => updateOrderField('observacao', e.target.value)}
                  placeholder="Observações gerais sobre o pedido..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="itens" className="space-y-4 mt-4">
            {fichaData.items.map((item, itemIndex) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>Item {itemIndex + 1}: {item.item_name || 'Sem descrição'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`item_name_${itemIndex}`}>Descrição do Item</Label>
                      <Input
                        id={`item_name_${itemIndex}`}
                        value={item.item_name || ''}
                        onChange={(e) => updateItemField(itemIndex, 'item_name', e.target.value)}
                        placeholder="Descrição do item"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`quantity_${itemIndex}`}>Quantidade</Label>
                        <Input
                          id={`quantity_${itemIndex}`}
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) =>
                            updateItemField(itemIndex, 'quantity', parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`unit_price_${itemIndex}`}>Valor Unitário</Label>
                        <CurrencyInput
                          id={`unit_price_${itemIndex}`}
                          value={item.unit_price || 0}
                          onValueChange={(value) => {
                            updateItemField(itemIndex, 'unit_price', value);
                            // Recalcular subtotal
                            const newSubtotal = value * (item.quantity || 1);
                            updateItemField(itemIndex, 'subtotal', newSubtotal);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`largura_${itemIndex}`}>Largura</Label>
                      <Input
                        id={`largura_${itemIndex}`}
                        value={item.largura || ''}
                        onChange={(e) => updateItemField(itemIndex, 'largura', e.target.value)}
                        placeholder="Ex: 1,50m"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`altura_${itemIndex}`}>Altura</Label>
                      <Input
                        id={`altura_${itemIndex}`}
                        value={item.altura || ''}
                        onChange={(e) => updateItemField(itemIndex, 'altura', e.target.value)}
                        placeholder="Ex: 2,00m"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`metro_quadrado_${itemIndex}`}>Metro Quadrado</Label>
                      <Input
                        id={`metro_quadrado_${itemIndex}`}
                        value={item.metro_quadrado || ''}
                        onChange={(e) => updateItemField(itemIndex, 'metro_quadrado', e.target.value)}
                        placeholder="Ex: 3,00 m²"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`designer_${itemIndex}`}>Designer</Label>
                      <Input
                        id={`designer_${itemIndex}`}
                        value={item.designer || ''}
                        onChange={(e) => updateItemField(itemIndex, 'designer', e.target.value)}
                        placeholder="Nome do designer"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`vendedor_${itemIndex}`}>Vendedor</Label>
                      <Input
                        id={`vendedor_${itemIndex}`}
                        value={item.vendedor || ''}
                        onChange={(e) => updateItemField(itemIndex, 'vendedor', e.target.value)}
                        placeholder="Nome do vendedor"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`tecido_${itemIndex}`}>Tecido</Label>
                    <Input
                      id={`tecido_${itemIndex}`}
                      value={item.tecido || ''}
                      onChange={(e) => updateItemField(itemIndex, 'tecido', e.target.value)}
                      placeholder="Tipo de tecido"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`observacao_item_${itemIndex}`}>Observações do Item</Label>
                    <Textarea
                      id={`observacao_item_${itemIndex}`}
                      value={item.observacao || ''}
                      onChange={(e) => updateItemField(itemIndex, 'observacao', e.target.value)}
                      placeholder="Observações específicas deste item..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar e Visualizar Ficha'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FichaDeServicoEditor;

