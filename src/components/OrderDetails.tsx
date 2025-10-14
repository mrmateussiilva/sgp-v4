import { useOrderStore } from '../store/orderStore';
import { OrderStatus } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface OrderDetailsProps {
  open: boolean;
  onClose: () => void;
}

export default function OrderDetails({ open, onClose }: OrderDetailsProps) {
  const selectedOrder = useOrderStore((state) => state.selectedOrder);

  if (!selectedOrder) return null;

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

  const formatValue = (value: number | { toString: () => string }) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value.toString());
    return numValue.toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Detalhes do Pedido #{selectedOrder.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={getStatusVariant(selectedOrder.status)} className="mt-1">
                {selectedOrder.status}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Data de Criação</p>
              <p className="text-sm">
                {new Date(selectedOrder.created_at).toLocaleString('pt-BR', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações do Cliente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p className="text-sm">{selectedOrder.customer_name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                <p className="text-sm">{selectedOrder.address}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Itens do Pedido</h3>

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
                      <TableCell className="text-right">R$ {formatValue(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {formatValue(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pt-4">
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  R$ {formatValue(selectedOrder.total_value)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
