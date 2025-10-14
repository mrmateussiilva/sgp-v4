import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useOrderStore } from '../store/orderStore';
import { OrderStatus, CreateOrderItemRequest, UpdateOrderItemRequest } from '../types';
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

interface OrderItemForm {
  id?: number;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export default function OrderForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addOrder, updateOrder } = useOrderStore();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<OrderStatus>(OrderStatus.Pendente);
  const [items, setItems] = useState<OrderItemForm[]>([
    { item_name: '', quantity: 1, unit_price: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder(parseInt(id));
    }
  }, [id]);

  const loadOrder = async (orderId: number) => {
    try {
      const order = await api.getOrderById(orderId);
      setCustomerName(order.customer_name);
      setAddress(order.address);
      setStatus(order.status);
      setItems(
        order.items.map((item) => ({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: typeof item.unit_price === 'number' 
            ? item.unit_price 
            : parseFloat(item.unit_price.toString()),
        }))
      );
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o pedido.",
        variant: "destructive",
      });
      console.error('Error loading order:', error);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { item_name: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof OrderItemForm,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !address) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (items.some((item) => !item.item_name || item.quantity <= 0 || item.unit_price < 0)) {
      toast({
        title: "Erro",
        description: "Verifique os itens do pedido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (id) {
        // Atualizar pedido existente
        const updateItems: UpdateOrderItemRequest[] = items.map((item) => ({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const updatedOrder = await api.updateOrder({
          id: parseInt(id),
          customer_name: customerName,
          address,
          status,
          items: updateItems,
        });

        updateOrder(updatedOrder);
        toast({
          title: "Sucesso",
          description: "Pedido atualizado com sucesso!",
        });
      } else {
        // Criar novo pedido
        const createItems: CreateOrderItemRequest[] = items.map((item) => ({
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const newOrder = await api.createOrder({
          customer_name: customerName,
          address,
          status,
          items: createItems,
        });

        addOrder(newOrder);
        toast({
          title: "Sucesso",
          description: "Pedido criado com sucesso!",
        });
      }

      navigate('/dashboard/orders');
    } catch (error) {
      toast({
        title: "Erro",
        description: id ? "Não foi possível atualizar o pedido." : "Não foi possível criar o pedido.",
        variant: "destructive",
      });
      console.error('Error saving order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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
            {id ? 'Editar Pedido' : 'Novo Pedido'}
          </h1>
          <p className="text-muted-foreground">
            {id ? 'Atualize as informações do pedido' : 'Preencha os dados do novo pedido'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
            <CardDescription>Informações básicas sobre o cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Nome do Cliente *</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço *</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Digite o endereço completo"
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OrderStatus.Pendente}>Pendente</SelectItem>
                  <SelectItem value={OrderStatus.EmProcessamento}>Em Processamento</SelectItem>
                  <SelectItem value={OrderStatus.Concluido}>Concluído</SelectItem>
                  <SelectItem value={OrderStatus.Cancelado}>Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Itens do Pedido</CardTitle>
            <CardDescription>Adicione os produtos ou serviços deste pedido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[120px]">Quantidade</TableHead>
                    <TableHead className="w-[140px]">Preço Unitário</TableHead>
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
                          placeholder="Nome do item"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)
                          }
                          min={1}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          min={0}
                          step={0.01}
                          required
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {(item.quantity * item.unit_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
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
              onClick={handleAddItem}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>

            <Separator />

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {calculateTotal().toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/orders')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : id ? 'Atualizar Pedido' : 'Criar Pedido'}
          </Button>
        </div>
      </form>
    </div>
  );
}
