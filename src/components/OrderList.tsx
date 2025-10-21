import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, FileText, Printer, Search } from 'lucide-react';
import { api } from '../services/api';
import { useOrderStore } from '../store/orderStore';
import { OrderWithItems, UpdateOrderStatusRequest } from '../types';
import { useToast } from '@/hooks/use-toast';
import OrderDetails from './OrderDetails';
import { OrderViewModal } from './OrderViewModal';
import { printOrder } from '../utils/printOrder';
import { formatDateForDisplay } from '@/utils/date';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [productionStatusFilter, setProductionStatusFilter] = useState<'all' | 'pending' | 'ready'>('pending');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<OrderWithItems | null>(null);
  const [selectedOrderIdForPrint, setSelectedOrderIdForPrint] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  useEffect(() => {
    setPage(0);
  }, [searchTerm, productionStatusFilter, rowsPerPage]);

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

  const handleViewOrder = (order: OrderWithItems) => {
    setSelectedOrderForView(order);
    setViewModalOpen(true);
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

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const clienteName = order.cliente || order.customer_name || '';
    const matchesSearch =
      searchTerm === '' ||
      clienteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm);
    const matchesProductionStatus =
      productionStatusFilter === 'all' ||
      (productionStatusFilter === 'pending' ? order.pronto !== true : order.pronto === true);
    return matchesSearch && matchesProductionStatus;
  }), [orders, searchTerm, productionStatusFilter]);

  useEffect(() => {
    if (selectedOrderIdForPrint !== null) {
      const exists = filteredOrders.some((order) => order.id === selectedOrderIdForPrint);
      if (!exists) {
        setSelectedOrderIdForPrint(null);
      }
    }
  }, [filteredOrders, selectedOrderIdForPrint]);

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage) || 1;

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [totalPages, page]);

  const paginatedOrders = filteredOrders.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handlePrintSelected = () => {
    if (!selectedOrderIdForPrint) {
      return;
    }
    const orderToPrint = orders.find((order) => order.id === selectedOrderIdForPrint);
    if (!orderToPrint) {
      toast({
        title: "Aviso",
        description: "Não foi possível localizar o pedido selecionado.",
        variant: "destructive",
      });
      setSelectedOrderIdForPrint(null);
      return;
    }

    printOrder(orderToPrint);
    toast({
      title: "Impressão",
      description: `Abrindo visualização de impressão do pedido #${orderToPrint.numero || orderToPrint.id}.`,
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
            <Select
              value={productionStatusFilter}
              onValueChange={(value) =>
                setProductionStatusFilter(value as 'all' | 'pending' | 'ready')
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status de Produção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="ready">Prontos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!selectedOrderIdForPrint}
              onClick={handlePrintSelected}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
        <Table className="min-w-[1460px]">
              <TableHeader>
            <TableRow>
                  <TableHead className="w-[50px]" />
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Nome Cliente</TableHead>
                  <TableHead className="w-[120px]">Data Entrega</TableHead>
                  <TableHead className="w-[100px]">Prioridade</TableHead>
                  <TableHead className="w-[150px]">Cidade/UF</TableHead>
                  <TableHead className="text-center w-[60px]">Fin.</TableHead>
                  <TableHead className="text-center w-[60px]">Conf.</TableHead>
                  <TableHead className="text-center w-[60px]">Subl.</TableHead>
                  <TableHead className="text-center w-[60px]">Cost.</TableHead>
                  <TableHead className="text-center w-[60px]">Exp.</TableHead>
                  <TableHead className="text-center w-[60px]">Status</TableHead>
                  <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
              </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : paginatedOrders.length === 0 ? (
              <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                  Nenhum pedido encontrado
                </TableCell>
              </TableRow>
            ) : (
                  paginatedOrders.map((order: OrderWithItems) => {
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedOrderIdForPrint === order.id}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOrderIdForPrint(order.id);
                              } else if (selectedOrderIdForPrint === order.id) {
                                setSelectedOrderIdForPrint(null);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          #{order.numero || order.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.cliente || order.customer_name}
                        </TableCell>
                        <TableCell>
                          {formatDateForDisplay(order.data_entrega, '-')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={order.prioridade === 'ALTA' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {order.prioridade || 'NORMAL'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.cidade_cliente && order.estado_cliente 
                            ? `${order.cidade_cliente}/${order.estado_cliente}`
                            : order.cidade_cliente || '-'}
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
                        
                        {/* Status (Pronto / Em andamento) - Campo calculado automaticamente */}
                        <TableCell className="text-center">
                          <Badge 
                            variant={order.pronto ? 'success' : 'secondary'}
                            className="text-xs"
                          >
                            {order.pronto ? 'Pronto' : 'Em Andamento'}
                          </Badge>
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewOrder(order)}
                            className="h-8 w-8"
                            title="Visualizar Pedido"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleView(order)}
                            className="h-8 w-8"
                            title="Detalhes"
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

      {filteredOrders.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * rowsPerPage + 1} a {Math.min((page + 1) * rowsPerPage, filteredOrders.length)} de {filteredOrders.length} resultados
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => setRowsPerPage(Number(value))}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Itens por página" />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} por página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              {Array.from({ length: totalPages }).map((_, index) => (
                <Button
                  key={index}
                  variant={index === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(index)}
                >
                  {index + 1}
                </Button>
              ))}
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
            <DialogDescription asChild>
              <div className="space-y-2">
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
              </div>
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
      
      <OrderViewModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        order={selectedOrderForView}
      />
    </div>
  );
}
