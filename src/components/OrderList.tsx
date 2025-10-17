import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, Download, FileText, Search } from 'lucide-react';
import { api } from '../services/api';
import { useOrderStore } from '../store/orderStore';
import { OrderStatus, OrderWithItems, UpdateOrderStatusRequest } from '../types';
import { useToast } from '@/hooks/use-toast';
import OrderDetails from './OrderDetails';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export default function OrderList() {
  const navigate = useNavigate();
  const { orders, setOrders, removeOrder, setSelectedOrder, updateOrder } = useOrderStore();
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    show: boolean;
    pedidoId: number;
    campo: string;
    novoValor: boolean;
    nomeSetor: string;
  }>({
    show: false,
    pedidoId: 0,
    campo: '',
    novoValor: false,
    nomeSetor: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive",
      });
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order: OrderWithItems) => {
    navigate(`/dashboard/orders/edit/${order.id}`);
  };

  const handleView = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleDeleteClick = (orderId: number) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      try {
        await api.deleteOrder(orderToDelete);
        removeOrder(orderToDelete);
        toast({
          title: "Sucesso",
          description: "Pedido excluído com sucesso!",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o pedido.",
          variant: "destructive",
        });
        console.error('Error deleting order:', error);
      }
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

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

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const clienteName = order.cliente || order.customer_name || '';
    const matchesSearch =
      searchTerm === '' ||
      clienteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const paginatedOrders = filteredOrders.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);

  const handleExportCSV = () => {
    exportToCSV(filteredOrders);
    toast({
      title: "Sucesso",
      description: "Relatório CSV exportado com sucesso!",
    });
  };

  const handleExportPDF = () => {
    exportToPDF(filteredOrders);
    toast({
      title: "Sucesso",
      description: "Relatório PDF exportado com sucesso!",
    });
  };

  const handleStatusClick = (pedidoId: number, campo: string, valorAtual: boolean, nomeSetor: string) => {
    setStatusConfirmModal({
      show: true,
      pedidoId,
      campo,
      novoValor: !valorAtual,
      nomeSetor,
    });
  };

  const handleConfirmStatusChange = async () => {
    const { pedidoId, campo, novoValor } = statusConfirmModal;
    const targetOrder = orders.find((order) => order.id === pedidoId);

    if (!targetOrder) {
      setStatusConfirmModal({ show: false, pedidoId: 0, campo: '', novoValor: false, nomeSetor: '' });
      return;
    }

    let payload: UpdateOrderStatusRequest = {
      id: pedidoId,
      financeiro: campo === 'financeiro' ? novoValor : targetOrder.financeiro === true,
      conferencia: campo === 'conferencia' ? novoValor : targetOrder.conferencia === true,
      sublimacao: campo === 'sublimacao' ? novoValor : targetOrder.sublimacao === true,
      costura: campo === 'costura' ? novoValor : targetOrder.costura === true,
      expedicao: campo === 'expedicao' ? novoValor : targetOrder.expedicao === true,
    };

    if (!payload.financeiro) {
      payload = {
        ...payload,
        conferencia: false,
        sublimacao: false,
        costura: false,
        expedicao: false,
      };
    }

    try {
      const updatedOrder = await api.updateOrderStatus(payload);
      updateOrder(updatedOrder);

      const mensagem =
        payload.financeiro === false && campo === 'financeiro'
          ? 'Financeiro desmarcado. Todos os status foram resetados.'
          : `${statusConfirmModal.nomeSetor} ${novoValor ? 'marcado' : 'desmarcado'} com sucesso!`;

      toast({
        title: "Status atualizado",
        description: mensagem,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      console.error('Error updating status:', error);
    } finally {
      setStatusConfirmModal({ show: false, pedidoId: 0, campo: '', novoValor: false, nomeSetor: '' });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Pedidos</h1>
          <p className="text-muted-foreground">Visualize e gerencie todos os pedidos do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busque e filtre os pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value={OrderStatus.Pendente}>Pendente</SelectItem>
                <SelectItem value={OrderStatus.EmProcessamento}>Em Processamento</SelectItem>
                <SelectItem value={OrderStatus.Concluido}>Concluído</SelectItem>
                <SelectItem value={OrderStatus.Cancelado}>Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
        <Table className="min-w-[800px]">
              <TableHeader>
            <TableRow>
                  <TableHead className="w-[80px]">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                  <TableHead className="hidden md:table-cell">Entrega</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Fin.</TableHead>
                  <TableHead className="text-center">Conf.</TableHead>
                  <TableHead className="text-center">Subl.</TableHead>
                  <TableHead className="text-center">Cost.</TableHead>
                  <TableHead className="text-center">Exp.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
              </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : paginatedOrders.length === 0 ? (
              <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                  Nenhum pedido encontrado
                </TableCell>
              </TableRow>
            ) : (
                  paginatedOrders.map((order: OrderWithItems) => {
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium">
                          #{order.numero || order.id}
                        </TableCell>
                        <TableCell>{order.cliente || order.customer_name}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {order.cidade_cliente || '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {order.data_entrega 
                            ? new Date(order.data_entrega).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {Number(order.valor_total || order.total_value || 0).toFixed(2)}
                        </TableCell>
                        
                        {/* Checkboxes de Status */}
                        {/* Financeiro - Sempre habilitado (é o primeiro) */}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={order.financeiro === true}
                            onCheckedChange={() => handleStatusClick(order.id, 'financeiro', !!order.financeiro, 'Financeiro')}
                          />
                        </TableCell>
                        
                        {/* Conferência - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={order.conferencia === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'conferencia', !!order.conferencia, 'Conferência')}
                          />
                        </TableCell>
                        
                        {/* Sublimação - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={order.sublimacao === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'sublimacao', !!order.sublimacao, 'Sublimação')}
                          />
                        </TableCell>
                        
                        {/* Costura - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={order.costura === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'costura', !!order.costura, 'Costura')}
                          />
                  </TableCell>
                        
                        {/* Expedição - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={order.expedicao === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'expedicao', !!order.expedicao, 'Expedição')}
                          />
                  </TableCell>
                      
                  <TableCell>
                        <Badge variant={getStatusVariant(order.status)}>
                          {order.status}
                        </Badge>
                  </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleView(order)}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(order)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                      onClick={() => handleDeleteClick(order.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                  </TableCell>
                </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
          </div>
        </CardContent>
      </Card>

      {filteredOrders.length > rowsPerPage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * rowsPerPage + 1} a {Math.min((page + 1) * rowsPerPage, filteredOrders.length)} de {filteredOrders.length} resultados
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Status */}
      <Dialog open={statusConfirmModal.show} onOpenChange={(open) => {
        if (!open) {
          setStatusConfirmModal({ show: false, pedidoId: 0, campo: '', novoValor: false, nomeSetor: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração de Status</DialogTitle>
            <DialogDescription className="space-y-2">
              {statusConfirmModal.novoValor ? (
                <div>
                  Deseja marcar <strong>{statusConfirmModal.nomeSetor}</strong> como concluído para o pedido #{statusConfirmModal.pedidoId}?
                </div>
              ) : (
                <div>
                  <div>
                    Deseja desmarcar <strong>{statusConfirmModal.nomeSetor}</strong> para o pedido #{statusConfirmModal.pedidoId}?
                  </div>
                  {statusConfirmModal.campo === 'financeiro' && (
                    <div className="mt-3 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                      ⚠️ <strong>Atenção:</strong> Ao desmarcar o Financeiro, todos os outros status (Conferência, Sublimação, Costura e Expedição) também serão desmarcados!
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setStatusConfirmModal({ show: false, pedidoId: 0, campo: '', novoValor: false, nomeSetor: '' })}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmStatusChange}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetails open={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
