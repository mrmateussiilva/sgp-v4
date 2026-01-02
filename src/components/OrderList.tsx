import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, FileText, Printer, Search, ArrowUp, ArrowDown, X, Filter, CheckSquare, Inbox, LayoutGrid, Table2 } from 'lucide-react';
import { api } from '../services/api';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import { OrderWithItems, OrderItem, UpdateOrderStatusRequest, OrderStatus } from '../types';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import { useOrderAutoSync } from '../hooks/useOrderEvents';
import { subscribeToOrderEvents } from '../services/orderEvents';
import { SmoothTableWrapper } from './SmoothTableWrapper';
import OrderDetails from './OrderDetails';
import { OrderViewModal } from './OrderViewModal';
import { EditingIndicator } from './EditingIndicator';
import { OrderQuickEditDialog } from './OrderQuickEditDialog';
import { OrderKanbanBoard } from './OrderKanbanBoard';
import { formatDateForDisplay } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { printMultipleOrdersServiceForm } from '@/utils/printOrderServiceForm';

export default function OrderList() {
  const navigate = useNavigate();
  const { orders, setOrders, removeOrder, setSelectedOrder, updateOrder } = useOrderStore();
  const logout = useAuthStore((state) => state.logout);
  const { isAdmin } = useUser();
  
  // Configurar sincronização automática via eventos
  useOrderAutoSync({
    orders,
    setOrders,
    removeOrder,
  });
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productionStatusFilter, setProductionStatusFilter] = useState<'all' | 'pending' | 'ready'>('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Estados para ordenação
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Estados para filtros avançados
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [selectedDesigner, setSelectedDesigner] = useState<string>('');
  const [selectedCidade, setSelectedCidade] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Dados para filtros
  const [vendedores, setVendedores] = useState<Array<{ id: number; nome: string }>>([]);
  const [designers, setDesigners] = useState<Array<{ id: number; nome: string }>>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<OrderWithItems | null>(null);
  const [selectedOrderIdsForPrint, setSelectedOrderIdsForPrint] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  // Desativado temporariamente: botões de alternância entre tabela e kanban
  const [viewMode] = useState<'table' | 'kanban'>('table');
  // const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
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

  // Adicionar notificações toast para eventos de pedidos
  // IMPORTANTE: Este useEffect deve vir DEPOIS da declaração de toast
  useEffect(() => {
    const unsubscribe = subscribeToOrderEvents({
      onOrderCreated: async (orderId) => {
        // useOrderAutoSync já atualiza a lista, apenas logar
        console.log(`✅ Pedido #${orderId} criado - lista atualizada automaticamente`);
      },
      onOrderUpdated: async (orderId) => {
        // useOrderAutoSync já atualiza a lista, apenas logar
        console.log(`✅ Pedido #${orderId} atualizado - lista atualizada automaticamente`);
      },
      onOrderCanceled: async (orderId) => {
        // useOrderAutoSync já remove o pedido, apenas logar
        console.log(`✅ Pedido #${orderId} cancelado - removido da lista automaticamente`);
      },
    }, true, toast); // showToast = true, passar função toast
    
    return unsubscribe;
  }, [toast]);

  // Carregar dados para filtros (vendedores + designers)
  useEffect(() => {
    let isMounted = true;
    const loadFilterData = async () => {
      try {
        const [vendedoresData, designersData] = await Promise.all([
          api.getVendedoresAtivos(),
          api.getDesignersAtivos(),
        ]);
        if (!isMounted) {
          return;
        }
        setVendedores(vendedoresData);
        setDesigners(designersData);
      } catch (error) {
        if (isMounted) {
          console.error('Erro ao carregar dados para filtros:', error);
        }
      }
    };

    loadFilterData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const uniqueCidades = Array.from(
      new Set(
        orders
          .map((order) => order.cidade_cliente)
          .filter((cidade): cidade is string => Boolean(cidade)),
      ),
    ).sort();
    setCidades(uniqueCidades);
  }, [orders]);

  const extractErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
    }
    return '';
  };

  const isSessionError = (message: string) => {
    if (!message) {
      return false;
    }
    const normalized = message.toLowerCase();
    return normalized.includes('sessão inválida') || normalized.includes('sessão expirada');
  };

  const buildStatusUpdatePayload = (
    order: OrderWithItems,
    campo: string,
    novoValor: boolean,
  ): UpdateOrderStatusRequest => {
    // CRÍTICO: Não incluir campo financeiro no payload quando não está sendo alterado
    // Isso evita erro 403 quando usuários comuns atualizam expedição, produção, etc.
    // O campo financeiro só deve ser incluído quando está sendo explicitamente alterado
    
    // Usar valor atual do pedido para cálculos internos
    const financeiroAtual = order.financeiro === true;
    
    // Construir payload - NÃO incluir financeiro se não está sendo alterado
    const payload: UpdateOrderStatusRequest = {
      id: order.id,
      conferencia: campo === 'conferencia' ? novoValor : order.conferencia === true,
      sublimacao: campo === 'sublimacao' ? novoValor : order.sublimacao === true,
      costura: campo === 'costura' ? novoValor : order.costura === true,
      expedicao: campo === 'expedicao' ? novoValor : order.expedicao === true,
    };
    
    // Incluir financeiro APENAS se está sendo explicitamente alterado
    if (campo === 'financeiro') {
      payload.financeiro = novoValor;
      // Marcar flag para buildStatusPayload saber que pode incluir
      (payload as any)._isFinanceiroUpdate = true;
    } else {
      // NÃO incluir financeiro no payload quando não está sendo alterado
      // Usar valor atual apenas para cálculos internos
      (payload as any)._isFinanceiroUpdate = false;
    }

    // Manter valores existentes de máquina e data de impressão quando não está alterando sublimação
    // Quando desmarcar sublimação, limpar esses campos
    const existingMachine = order.sublimacao_maquina ?? null;
    const existingDate = order.sublimacao_data_impressao ?? null;

    if (campo === 'sublimacao') {
      if (!novoValor) {
        // Ao desmarcar, limpar máquina e data
        payload.sublimacao_maquina = null;
        payload.sublimacao_data_impressao = null;
      } else {
        // Ao marcar, manter valores existentes se houver, senão deixar null
        payload.sublimacao_maquina = existingMachine;
        payload.sublimacao_data_impressao = existingDate;
      }
    } else {
      // Para outros campos, manter valores existentes
      payload.sublimacao_maquina = existingMachine;
      payload.sublimacao_data_impressao = existingDate;
    }

    // Para cálculo de "pronto", usar valor atual do pedido se financeiro não está sendo alterado
    const financeiroParaCalculo = campo === 'financeiro' ? novoValor : financeiroAtual;
    const allComplete =
      financeiroParaCalculo && payload.conferencia && payload.sublimacao && payload.costura && payload.expedicao;

    payload.pronto = allComplete;
    if (allComplete) {
      payload.status = OrderStatus.Concluido;
    } else {
      payload.status =
        order.status === OrderStatus.Concluido ? OrderStatus.EmProcessamento : order.status;
    }

    // Se financeiro está sendo desmarcado, resetar todos os outros status
    if (campo === 'financeiro' && !novoValor) {
      payload.conferencia = false;
      payload.sublimacao = false;
      payload.costura = false;
      payload.expedicao = false;
      payload.sublimacao_maquina = null;
      payload.sublimacao_data_impressao = null;
      payload.pronto = false;
      if (payload.status === OrderStatus.Concluido) {
        payload.status = OrderStatus.EmProcessamento;
      }
    }

    return payload;
  };

  const loadRequestRef = useRef(0);

  const loadOrders = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    try {
      const currentPage = page;
      const currentPageSize = rowsPerPage;

      if (dateFrom || dateTo) {
        const filters = {
          status:
            productionStatusFilter === 'all'
              ? undefined
              : productionStatusFilter === 'pending'
                ? OrderStatus.Pendente
                : OrderStatus.Concluido,
          cliente: searchTerm || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page: currentPage + 1,
          page_size: currentPageSize,
        };

        const paginatedData = await api.getOrdersWithFilters(filters);
        if (loadRequestRef.current !== requestId) {
          return;
        }
        setOrders(paginatedData.orders);
        setTotalPages(paginatedData.total_pages);
        setTotalOrders(paginatedData.total);
      } else if (productionStatusFilter === 'pending') {
        const paginatedData = await api.getPendingOrdersPaginated(currentPage + 1, currentPageSize);
        if (loadRequestRef.current !== requestId) {
          return;
        }
        setOrders(paginatedData.orders);
        setTotalPages(paginatedData.total_pages);
        setTotalOrders(paginatedData.total);
      } else if (productionStatusFilter === 'ready') {
        const paginatedData = await api.getReadyOrdersPaginated(currentPage + 1, currentPageSize);
        if (loadRequestRef.current !== requestId) {
          return;
        }
        setOrders(paginatedData.orders);
        setTotalPages(paginatedData.total_pages);
        setTotalOrders(paginatedData.total);
      } else {
        const data = await api.getOrders();
        if (loadRequestRef.current !== requestId) {
          return;
        }
        setOrders(data);
        setTotalPages(Math.ceil(data.length / currentPageSize) || 1);
        setTotalOrders(data.length);
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      if (isSessionError(message)) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'destructive',
        });
        console.error('Session error while loading orders:', error);
        logout();
        navigate('/login', { replace: true });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os pedidos.',
          variant: 'destructive',
        });
        console.error('Error loading orders:', error);
      }
    } finally {
      if (loadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [dateFrom, dateTo, page, rowsPerPage, productionStatusFilter, searchTerm, toast, logout, navigate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setPage(0);
  }, [productionStatusFilter, dateFrom, dateTo, selectedStatuses, selectedVendedor, selectedDesigner, selectedCidade, searchTerm, rowsPerPage]);

  const handleEdit = (order: OrderWithItems) => {
    // Navegar para a página de edição completa usando a nova rota
    // Como o Dashboard está em /dashboard/*, precisamos incluir o prefixo
    navigate(`/dashboard/pedido/editar/${order.id}`);
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
          title: "Pedido excluído",
          description: "O pedido foi excluído com sucesso!",
          variant: "info",
        });
      } catch (error: any) {
        const errorMessage = error?.response?.data?.detail || error?.message || "Não foi possível excluir o pedido.";
        const isForbidden = error?.response?.status === 403;
        
        toast({
          title: isForbidden ? "Acesso negado" : "Erro",
          description: isForbidden 
            ? "Somente administradores podem executar esta ação."
            : errorMessage,
          variant: "destructive",
        });
        console.error('Error deleting order:', error);
      }
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  // Função para lidar com ordenação
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Função para obter ícone de ordenação
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return null;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedVendedor('');
    setSelectedDesigner('');
    setSelectedCidade('');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedVendedor) count++;
    if (selectedDesigner) count++;
    if (selectedCidade) count++;
    if (searchTerm) count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [selectedStatuses, selectedVendedor, selectedDesigner, selectedCidade, searchTerm, dateFrom, dateTo]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filtro de busca por cliente/ID
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const clienteName = order.cliente || order.customer_name || '';
        return (
          clienteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.toString().includes(searchTerm) ||
          (order.numero && order.numero.toString().includes(searchTerm))
        );
      });
    }

    // Filtro por status de produção (se não estiver usando filtros de data)
    if (!dateFrom && !dateTo) {
      if (productionStatusFilter === 'pending') {
        filtered = filtered.filter(order => !order.pronto);
      } else if (productionStatusFilter === 'ready') {
        filtered = filtered.filter(order => order.pronto);
      }
    }

    // Filtros avançados
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((order) => {
        const statusChecks = [];
        if (selectedStatuses.includes('financeiro')) statusChecks.push(order.financeiro === true);
        if (selectedStatuses.includes('conferencia')) statusChecks.push(order.conferencia === true);
        if (selectedStatuses.includes('sublimacao')) statusChecks.push(order.sublimacao === true);
        if (selectedStatuses.includes('costura')) statusChecks.push(order.costura === true);
        if (selectedStatuses.includes('expedicao')) statusChecks.push(order.expedicao === true);
        if (selectedStatuses.includes('pronto')) statusChecks.push(order.pronto === true);
        return statusChecks.some(check => check);
      });
    }

    // Filtro por vendedor
    if (selectedVendedor) {
      filtered = filtered.filter((order) => {
        return order.items.some(item => item.vendedor === selectedVendedor);
      });
    }

    // Filtro por designer
    if (selectedDesigner) {
      filtered = filtered.filter((order) => {
        return order.items.some(item => item.designer === selectedDesigner);
      });
    }

    // Filtro por cidade
    if (selectedCidade) {
      filtered = filtered.filter((order) => {
        return order.cidade_cliente === selectedCidade;
      });
    }

    // Ordenação
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'cliente':
            aValue = (a.cliente || a.customer_name || '').toLowerCase();
            bValue = (b.cliente || b.customer_name || '').toLowerCase();
            break;
          case 'data_entrega':
            aValue = a.data_entrega ? new Date(a.data_entrega).getTime() : 0;
            bValue = b.data_entrega ? new Date(b.data_entrega).getTime() : 0;
            break;
          case 'prioridade':
            aValue = a.prioridade === 'ALTA' ? 1 : 0;
            bValue = b.prioridade === 'ALTA' ? 1 : 0;
            break;
          case 'cidade':
            aValue = (a.cidade_cliente || '').toLowerCase();
            bValue = (b.cidade_cliente || '').toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [orders, searchTerm, productionStatusFilter, dateFrom, dateTo, selectedStatuses, selectedVendedor, selectedDesigner, selectedCidade, sortColumn, sortDirection]);

  // Calcular total de páginas baseado nos pedidos filtrados
  const totalPagesFiltered = useMemo(() => {
    return Math.ceil(filteredOrders.length / rowsPerPage) || 1;
  }, [filteredOrders.length, rowsPerPage]);

  useEffect(() => {
    if (selectedOrderIdsForPrint.length > 0) {
      const validIds = selectedOrderIdsForPrint.filter(id => 
        filteredOrders.some((order) => order.id === id)
      );
      if (validIds.length !== selectedOrderIdsForPrint.length) {
        setSelectedOrderIdsForPrint(validIds);
      }
    }
  }, [filteredOrders, selectedOrderIdsForPrint]);

  useEffect(() => {
    const maxPage = dateFrom || dateTo || productionStatusFilter === 'pending' || productionStatusFilter === 'ready'
      ? totalPages - 1
      : totalPagesFiltered - 1;
    if (page > maxPage) {
      setPage(Math.max(0, maxPage));
    }
  }, [totalPages, totalPagesFiltered, page, dateFrom, dateTo, productionStatusFilter]);

  // Para pedidos com filtros de data, pendentes e prontos com paginação, usar dados do backend
  // Para outros casos, usar paginação local dos pedidos filtrados
  const paginatedOrders = useMemo(() => {
    if (dateFrom || dateTo || productionStatusFilter === 'pending' || productionStatusFilter === 'ready') {
      // Quando usando paginação do backend, retornar os pedidos filtrados diretamente
      // (a paginação já foi feita no backend)
      return filteredOrders;
    } else {
      // Paginação local para filtro 'all' e outros casos
      const startIndex = page * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      return filteredOrders.slice(startIndex, endIndex);
    }
  }, [filteredOrders, page, rowsPerPage, dateFrom, dateTo, productionStatusFilter]);

  const handlePrintSelected = async () => {
    if (selectedOrderIdsForPrint.length === 0) {
      return;
    }
    
    const ordersToPrint = orders.filter((order) => 
      selectedOrderIdsForPrint.includes(order.id)
    );
    
    if (ordersToPrint.length === 0) {
      toast({
        title: "Aviso",
        description: "Não foi possível localizar os pedidos selecionados.",
        variant: "warning",
      });
      setSelectedOrderIdsForPrint([]);
      return;
    }

    await printSelectedOrders(ordersToPrint);
  };

  const printSelectedOrders = async (orders: OrderWithItems[]) => {
    try {
      // Mostrar loading enquanto processa
    toast({
      title: "Preparando impressão",
        description: "Gerando fichas usando templates da API...",
    });

      // Usar templates da API para impressão múltipla (template resumo para impressão em lote)
      const printContent = await printMultipleOrdersServiceForm(orders, 'resumo');
    
    // Usar a função universal de visualização
    const { openInViewer } = await import('../utils/exportUtils');
    await openInViewer({ 
      type: 'html', 
      html: printContent, 
        title: `Fichas de Serviço - ${orders.length} pedido(s)` 
      });
        } catch (error) {
      console.error('Erro ao imprimir múltiplos pedidos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao preparar impressão.';
      toast({
        title: "Erro ao imprimir",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleStatusClick = (pedidoId: number, campo: string, valorAtual: boolean, nomeSetor: string) => {
    // Verificar se é ação financeira e se o usuário não é admin
    if (campo === 'financeiro' && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Somente administradores podem executar esta ação.",
        variant: "destructive",
      });
      return;
    }

    const targetOrder = orders.find((order) => order.id === pedidoId);
    if (!targetOrder) {
      return;
    }

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
    
    // PROTEÇÃO CRÍTICA: Verificar se é tentativa de alterar financeiro sem permissão de admin
    // Esta é uma camada extra de segurança além da verificação no handleStatusClick
    if (campo === 'financeiro' && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Somente administradores podem alterar o status financeiro.",
        variant: "destructive",
      });
      setStatusConfirmModal({ show: false, pedidoId: 0, campo: '', novoValor: false, nomeSetor: '' });
      return;
    }
    
    const targetOrder = orders.find((order) => order.id === pedidoId);

    if (!targetOrder) {
      setStatusConfirmModal({ show: false, pedidoId: 0, campo: '', novoValor: false, nomeSetor: '' });
      return;
    }

    const payload = buildStatusUpdatePayload(targetOrder, campo, novoValor);

    // Debug: verificar se financeiro está no payload quando não deveria
    if (campo !== 'financeiro' && 'financeiro' in payload) {
      console.warn('⚠️ Campo financeiro está no payload mesmo não sendo alterado!', payload);
    }

    try {
      const updatedOrder = await api.updateOrderStatus(payload);
      updateOrder(updatedOrder);

      const mensagensTodosSetores =
        payload.pronto && payload.status === OrderStatus.Concluido && novoValor;

      const mensagem = mensagensTodosSetores
        ? 'Todos os setores foram marcados. Pedido concluído!'
        : payload.financeiro === false && campo === 'financeiro'
          ? 'Financeiro desmarcado. Todos os status foram resetados.'
          : `${statusConfirmModal.nomeSetor} ${novoValor ? 'marcado' : 'desmarcado'} com sucesso!`;

      toast({
        title: "Status atualizado",
        description: mensagem,
        variant: "success",
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Não foi possível atualizar o status.";
      const isForbidden = error?.response?.status === 403;
      const campo = statusConfirmModal.campo;
      const isFinanceiro = campo === 'financeiro';
      
      if (isForbidden) {
        if (isFinanceiro) {
          toast({
            title: "Acesso negado",
            description: "Somente administradores podem atualizar o status financeiro.",
            variant: "destructive",
          });
        } else {
          // Erro 403 para campos que não deveriam precisar de admin
          // Isso indica que o backend está exigindo admin para todos os campos
          const nomeCampo = statusConfirmModal.nomeSetor || campo;
          toast({
            title: "⚠️ Problema de permissão no servidor",
            description: `O servidor está bloqueando a atualização de "${nomeCampo}" exigindo permissão de administrador, mas esse campo NÃO deveria precisar de admin. Apenas o campo "Financeiro" deveria exigir essa permissão. Entre em contato com o administrador do sistema para corrigir as permissões no backend.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      // Log apenas em desenvolvimento para não poluir o console em produção
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating status:', error);
      }
    } finally {
      setStatusConfirmModal({ show: false, pedidoId: 0, campo: '', novoValor: false, nomeSetor: '' });
    }
  };

  const handleKanbanStatusChange = async (orderId: number, newStatus: string) => {
    const targetOrder = orders.find((order) => order.id === orderId);
    if (!targetOrder) return;

    // Mapear nomes de status para campos
    const statusLabels: Record<string, string> = {
      financeiro: 'Financeiro',
      conferencia: 'Conferência',
      sublimacao: 'Sublimação',
      costura: 'Costura',
      expedicao: 'Expedição',
      pronto: 'Pronto',
    };

    // Ordem dos status (do primeiro ao último)
    const statusOrder = ['financeiro', 'conferencia', 'sublimacao', 'costura', 'expedicao', 'pronto'];
    const newStatusIndex = statusOrder.indexOf(newStatus);

    // Se está movendo para uma coluna mais avançada, garantir que todos os status anteriores também sejam marcados
    // Construir payload baseado no status atual e novo status
    const payload = buildStatusUpdatePayload(
      targetOrder,
      newStatus,
      true // sempre marcar como true ao mover para a coluna
    );

    // Garantir que todos os status anteriores ao novo status também estejam marcados
    for (let i = 0; i < newStatusIndex; i++) {
      const prevStatus = statusOrder[i];
      if (prevStatus === 'financeiro') {
        payload.financeiro = true;
      } else if (prevStatus === 'conferencia') {
        payload.conferencia = true;
      } else if (prevStatus === 'sublimacao') {
        payload.sublimacao = true;
      } else if (prevStatus === 'costura') {
        payload.costura = true;
      } else if (prevStatus === 'expedicao') {
        payload.expedicao = true;
      }
    }

    try {
      const updatedOrder = await api.updateOrderStatus(payload);
      updateOrder(updatedOrder);
      toast({
        title: "Status atualizado",
        description: `Pedido movido para ${statusLabels[newStatus] || newStatus}`,
        variant: "success",
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Não foi possível atualizar o status.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Se estiver no modo kanban, renderizar layout full-screen limpo
  if (viewMode === 'kanban') {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
        {/* Header minimalista */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Arraste os cards entre as colunas para atualizar o status</p>
          </div>
          {/* Botões de alternância desativados temporariamente */}
          {/* <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Table2 className="h-4 w-4 mr-2" />
              Tabela
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
          </div> */}
        </div>

        {/* Área do Kanban - ocupa todo o espaço restante */}
        <div className="flex-1 overflow-hidden p-8">
          <OrderKanbanBoard
            orders={paginatedOrders}
            onStatusChange={handleKanbanStatusChange}
            onEdit={handleEdit}
            onView={handleView}
            onViewOrder={handleViewOrder}
            onDelete={handleDeleteClick}
            isAdmin={isAdmin}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  // Modo tabela - layout original
  return (
    <div className="flex flex-col h-full space-y-6 min-h-screen">
      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Busque e filtre os pedidos</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
          <div className="flex flex-col gap-4">
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
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Data inicial"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-[150px]"
              />
              <Input
                type="date"
                placeholder="Data final"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-[150px]"
              />
            </div>
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros Avançados
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Filtros Avançados</h4>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-7 text-xs"
                        >
                          Limpar todos
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Status de Produção</Label>
                      <div className="space-y-2">
                        {[
                          { value: 'financeiro', label: 'Financeiro' },
                          { value: 'conferencia', label: 'Conferência' },
                          { value: 'sublimacao', label: 'Sublimação' },
                          { value: 'costura', label: 'Costura' },
                          { value: 'expedicao', label: 'Expedição' },
                          { value: 'pronto', label: 'Pronto' },
                        ].map((status) => (
                          <div key={status.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status.value}`}
                              checked={selectedStatuses.includes(status.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStatuses([...selectedStatuses, status.value]);
                                } else {
                                  setSelectedStatuses(selectedStatuses.filter(s => s !== status.value));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`status-${status.value}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {status.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendedor-filter" className="text-sm font-medium">Vendedor</Label>
                      <Select 
                        value={selectedVendedor || "all"} 
                        onValueChange={(value) => setSelectedVendedor(value === "all" ? "" : value)}
                      >
                        <SelectTrigger id="vendedor-filter">
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {vendedores.filter(v => v.nome).map((v) => (
                            <SelectItem key={v.id} value={v.nome}>
                              {v.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="designer-filter" className="text-sm font-medium">Designer</Label>
                      <Select 
                        value={selectedDesigner || "all"} 
                        onValueChange={(value) => setSelectedDesigner(value === "all" ? "" : value)}
                      >
                        <SelectTrigger id="designer-filter">
                          <SelectValue placeholder="Selecione um designer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {designers.filter(d => d.nome).map((d) => (
                            <SelectItem key={d.id} value={d.nome}>
                              {d.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cidade-filter" className="text-sm font-medium">Cidade</Label>
                      <Select 
                        value={selectedCidade || "all"} 
                        onValueChange={(value) => setSelectedCidade(value === "all" ? "" : value)}
                      >
                        <SelectTrigger id="cidade-filter">
                          <SelectValue placeholder="Selecione uma cidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {cidades.filter(c => c && c.trim()).map((cidade) => (
                            <SelectItem key={cidade} value={cidade}>
                              {cidade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Botões de alternância desativados temporariamente */}
            {/* <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="h-4 w-4 mr-2" />
                Tabela
              </Button>
              <Button
                type="button"
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </Button>
            </div> */}
            
            {selectedOrderIdsForPrint.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedOrderIdsForPrint.length} pedido(s) selecionado(s)
                  </span>
                </div>
                <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrderIdsForPrint([])}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
              onClick={handlePrintSelected}
            >
                    <Printer className="h-4 w-4 mr-1" />
                    Imprimir Selecionados
            </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      <Card className="flex-1 flex flex-col min-h-0 flex-grow">
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          {viewMode === 'table' ? (
            <div className="overflow-y-auto flex-1 min-h-0 overflow-x-hidden">
              <SmoothTableWrapper>
                <Table className="w-full">
              <TableHeader>
            <TableRow>
                  <TableHead className="w-[35px] min-w-[35px] lg:w-[40px] lg:min-w-[40px] xl:w-[45px] xl:min-w-[45px] sticky left-0 z-10 bg-background border-r px-1 lg:px-2">
                    <Checkbox
                      checked={selectedOrderIdsForPrint.length > 0 && selectedOrderIdsForPrint.length === paginatedOrders.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOrderIdsForPrint(paginatedOrders.map(o => o.id));
                        } else {
                          setSelectedOrderIdsForPrint([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead 
                    className="w-[65px] min-w-[65px] lg:w-[80px] lg:min-w-[80px] xl:w-[90px] xl:min-w-[90px] sticky left-[35px] lg:left-[40px] xl:left-[45px] z-10 bg-background border-r cursor-pointer hover:bg-muted/50 transition-colors px-1 lg:px-2"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center text-[10px] sm:text-xs lg:text-sm xl:text-base">
                      ID
                      {getSortIcon('id')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="min-w-[130px] max-w-[200px] lg:min-w-[180px] lg:max-w-[250px] xl:min-w-[220px] xl:max-w-[300px] cursor-pointer hover:bg-muted/50 transition-colors px-2 lg:px-3 xl:px-4"
                    onClick={() => handleSort('cliente')}
                  >
                    <div className="flex items-center text-[10px] sm:text-xs lg:text-sm xl:text-base">
                      Nome Cliente
                      {getSortIcon('cliente')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="min-w-[85px] max-w-[100px] lg:min-w-[110px] lg:max-w-[130px] xl:min-w-[120px] xl:max-w-[140px] cursor-pointer hover:bg-muted/50 transition-colors px-1 lg:px-2 xl:px-3"
                    onClick={() => handleSort('data_entrega')}
                  >
                    <div className="flex items-center text-[10px] sm:text-xs lg:text-sm xl:text-base">
                      Data Entrega
                      {getSortIcon('data_entrega')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="min-w-[70px] max-w-[85px] lg:min-w-[90px] lg:max-w-[110px] xl:min-w-[100px] xl:max-w-[120px] cursor-pointer hover:bg-muted/50 transition-colors px-1 lg:px-2 xl:px-3"
                    onClick={() => handleSort('prioridade')}
                  >
                    <div className="flex items-center text-[10px] sm:text-xs lg:text-sm xl:text-base">
                      Prioridade
                      {getSortIcon('prioridade')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="min-w-[100px] max-w-[130px] lg:min-w-[130px] lg:max-w-[160px] xl:min-w-[150px] xl:max-w-[180px] cursor-pointer hover:bg-muted/50 transition-colors px-1 lg:px-2 xl:px-3"
                    onClick={() => handleSort('cidade')}
                  >
                    <div className="flex items-center text-[10px] sm:text-xs lg:text-sm xl:text-base">
                      Cidade/UF
                      {getSortIcon('cidade')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap min-w-[35px] w-[35px] lg:min-w-[45px] lg:w-[45px] xl:min-w-[50px] xl:w-[50px] px-0 lg:px-1 xl:px-2 text-[10px] sm:text-xs lg:text-sm xl:text-base">Fin.</TableHead>
                  <TableHead className="text-center whitespace-nowrap min-w-[35px] w-[35px] lg:min-w-[45px] lg:w-[45px] xl:min-w-[50px] xl:w-[50px] px-0 lg:px-1 xl:px-2 text-[10px] sm:text-xs lg:text-sm xl:text-base">Conf.</TableHead>
                  <TableHead className="text-center whitespace-nowrap min-w-[40px] w-[40px] lg:min-w-[50px] lg:w-[50px] xl:min-w-[55px] xl:w-[55px] px-0 lg:px-1 xl:px-2 text-[10px] sm:text-xs lg:text-sm xl:text-base">Subl.</TableHead>
                  <TableHead className="text-center whitespace-nowrap min-w-[35px] w-[35px] lg:min-w-[45px] lg:w-[45px] xl:min-w-[50px] xl:w-[50px] px-0 lg:px-1 xl:px-2 text-[10px] sm:text-xs lg:text-sm xl:text-base">Cost.</TableHead>
                  <TableHead className="text-center whitespace-nowrap min-w-[35px] w-[35px] lg:min-w-[45px] lg:w-[45px] xl:min-w-[50px] xl:w-[50px] px-0 lg:px-1 xl:px-2 text-[10px] sm:text-xs lg:text-sm xl:text-base">Exp.</TableHead>
                  <TableHead className="text-center whitespace-nowrap min-w-[75px] max-w-[90px] lg:min-w-[100px] lg:max-w-[120px] xl:min-w-[110px] xl:max-w-[130px] px-1 lg:px-2 xl:px-3 text-[10px] sm:text-xs lg:text-sm xl:text-base">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap sticky right-0 z-10 bg-background border-l min-w-[110px] max-w-[130px] lg:min-w-[140px] lg:max-w-[160px] xl:min-w-[160px] xl:max-w-[180px] px-1 lg:px-2 xl:px-3 text-[10px] sm:text-xs lg:text-sm xl:text-base">Ações</TableHead>
            </TableRow>
              </TableHeader>
          <TableBody>
            {loading ? (
              <>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell className="sticky left-0 z-10 bg-background border-r px-1 lg:px-2">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="sticky left-[35px] lg:left-[40px] xl:left-[45px] z-10 bg-background border-r w-[65px] min-w-[65px] lg:w-[80px] lg:min-w-[80px] xl:w-[90px] xl:min-w-[90px] px-1 lg:px-2">
                      <Skeleton className="h-4 w-12 lg:w-16" />
                    </TableCell>
                    <TableCell className="min-w-[130px] max-w-[200px] lg:min-w-[180px] lg:max-w-[250px] xl:min-w-[220px] xl:max-w-[300px] px-2 lg:px-3 xl:px-4">
                      <Skeleton className="h-4 w-24 lg:w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-5 w-16 mx-auto" />
                    </TableCell>
                    <TableCell className="text-right sticky right-0 z-10 bg-background border-l">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Nenhum pedido encontrado</h3>
                    <p className="text-sm text-muted-foreground">Tente ajustar seus filtros de busca.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
                  paginatedOrders.map((order: OrderWithItems) => {
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell className="text-center sticky left-0 z-10 bg-background border-r px-1 lg:px-2">
                          <Checkbox
                            checked={selectedOrderIdsForPrint.includes(order.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOrderIdsForPrint([...selectedOrderIdsForPrint, order.id]);
                              } else {
                                setSelectedOrderIdsForPrint(selectedOrderIdsForPrint.filter(id => id !== order.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium whitespace-nowrap sticky left-[35px] lg:left-[40px] xl:left-[45px] z-10 bg-background border-r w-[65px] min-w-[65px] lg:w-[80px] lg:min-w-[80px] xl:w-[90px] xl:min-w-[90px] px-1 lg:px-2 text-[10px] sm:text-xs lg:text-sm xl:text-base">
                          <div className="flex items-center gap-1 lg:gap-2">
                            #{order.numero || order.id}
                            <EditingIndicator orderId={order.id} />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium min-w-[130px] max-w-[200px] lg:min-w-[180px] lg:max-w-[250px] xl:min-w-[220px] xl:max-w-[300px] truncate px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base">
                          {order.cliente || order.customer_name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap min-w-[85px] max-w-[100px] lg:min-w-[110px] lg:max-w-[130px] xl:min-w-[120px] xl:max-w-[140px] px-1 lg:px-2 xl:px-3 text-[10px] sm:text-xs lg:text-sm xl:text-base">
                          {formatDateForDisplay(order.data_entrega, '-')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap min-w-[70px] max-w-[85px] lg:min-w-[90px] lg:max-w-[110px] xl:min-w-[100px] xl:max-w-[120px] px-1 lg:px-2 xl:px-3">
                          <Badge 
                            variant={order.prioridade === 'ALTA' ? 'destructive' : 'secondary'}
                            className="text-[10px] lg:text-xs xl:text-sm px-1.5 py-0 lg:px-2 lg:py-0.5"
                          >
                            {order.prioridade || 'NORMAL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[100px] max-w-[130px] lg:min-w-[130px] lg:max-w-[160px] xl:min-w-[150px] xl:max-w-[180px] truncate px-1 lg:px-2 xl:px-3 text-[10px] sm:text-xs lg:text-sm xl:text-base">
                          {order.cidade_cliente && order.estado_cliente 
                            ? `${order.cidade_cliente}/${order.estado_cliente}`
                            : order.cidade_cliente || '-'}
                        </TableCell>
                        
                        {/* Checkboxes de Status */}
                        {/* Financeiro - Apenas admins podem alterar */}
                        <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-block">
                                  <Checkbox
                                    checked={order.financeiro === true}
                                    disabled={!isAdmin}
                                    onCheckedChange={() => handleStatusClick(order.id, 'financeiro', !!order.financeiro, 'Financeiro')}
                                    className={!isAdmin ? "opacity-50 cursor-not-allowed" : ""}
                                  />
                                </div>
                              </TooltipTrigger>
                              {!isAdmin && (
                                <TooltipContent>
                                  <p>Somente administradores podem executar esta ação.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        
                        {/* Conferência - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2">
                          <Checkbox
                            checked={order.conferencia === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'conferencia', !!order.conferencia, 'Conferência')}
                          />
                        </TableCell>
                        
                        {/* Sublimação - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2">
                          <Checkbox
                            checked={order.sublimacao === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'sublimacao', !!order.sublimacao, 'Sublimação')}
                          />
                          {order.sublimacao && (order.sublimacao_maquina || order.sublimacao_data_impressao) && (
                            <div className="mt-0.5 lg:mt-1 text-[8px] lg:text-[9px] xl:text-[10px] text-muted-foreground leading-tight text-center">
                              {order.sublimacao_maquina && <div className="truncate">{order.sublimacao_maquina}</div>}
                              {order.sublimacao_data_impressao && (
                                <div>{formatDateForDisplay(order.sublimacao_data_impressao, '-')}</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        
                        {/* Costura - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2">
                          <Checkbox
                            checked={order.costura === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'costura', !!order.costura, 'Costura')}
                          />
                  </TableCell>
                        
                        {/* Expedição - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2">
                          <Checkbox
                            checked={order.expedicao === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'expedicao', !!order.expedicao, 'Expedição')}
                          />
                        </TableCell>
                        
                        {/* Status (Pronto / Em andamento) - Campo calculado automaticamente */}
                        <TableCell className="text-center whitespace-nowrap min-w-[75px] max-w-[90px] lg:min-w-[100px] lg:max-w-[120px] xl:min-w-[110px] xl:max-w-[130px] px-1 lg:px-2 xl:px-3">
                          <Badge 
                            variant={order.pronto ? 'success' : 'secondary'}
                            className="text-[10px] lg:text-xs xl:text-sm px-1.5 py-0 lg:px-2 lg:py-0.5"
                          >
                            {order.pronto ? 'Pronto' : 'Em Andamento'}
                          </Badge>
                        </TableCell>
                      <TableCell className="text-right whitespace-nowrap sticky right-0 z-10 bg-background border-l min-w-[110px] max-w-[130px] lg:min-w-[140px] lg:max-w-[160px] xl:min-w-[160px] xl:max-w-[180px] px-1 lg:px-2 xl:px-3">
                        <div className="flex justify-end gap-0.5 lg:gap-1 xl:gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewOrder(order)}
                            className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                            title="Visualizar Pedido"
                          >
                            <FileText className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleView(order)}
                            className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                            title="Detalhes"
                          >
                            <Eye className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(order)}
                            className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                          >
                            <Edit className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteClick(order.id)}
                              className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                            </Button>
                          )}
                        </div>
                  </TableCell>
                </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
            </SmoothTableWrapper>
          </div>
          ) : null}
        </CardContent>
      </Card>

      {filteredOrders.length > 0 && (
        <div className="w-full bg-background border-t border-border p-4 mt-auto">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-muted-foreground text-center lg:text-left">
              {dateFrom || dateTo || productionStatusFilter === 'pending' || productionStatusFilter === 'ready'
                ? `Mostrando ${page * rowsPerPage + 1} a ${Math.min((page + 1) * rowsPerPage, totalOrders)} de ${totalOrders} resultados`
                : `Mostrando ${page * rowsPerPage + 1} a ${Math.min((page + 1) * rowsPerPage, filteredOrders.length)} de ${filteredOrders.length} resultados`
              }
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
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
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1 flex-wrap justify-center max-w-full">
                  {Array.from({ 
                    length: dateFrom || dateTo || productionStatusFilter === 'pending' || productionStatusFilter === 'ready'
                      ? totalPages
                      : totalPagesFiltered
                  }).map((_, index) => (
                    <Button
                      key={index}
                      variant={index === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(index)}
                      className="min-w-[40px]"
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const maxPage = dateFrom || dateTo || productionStatusFilter === 'pending' || productionStatusFilter === 'ready'
                      ? totalPages - 1
                      : totalPagesFiltered - 1;
                    setPage(Math.min(maxPage, page + 1));
                  }}
                  disabled={
                    dateFrom || dateTo || productionStatusFilter === 'pending' || productionStatusFilter === 'ready'
                      ? page >= totalPages - 1
                      : page >= totalPagesFiltered - 1
                  }
                >
                  Próxima
                </Button>
              </div>
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
      
      <OrderQuickEditDialog
        orderId={editOrderId}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditOrderId(null);
          }
        }}
        onUpdated={(order) => {
          updateOrder(order);
          setSelectedOrder(order);
          if (selectedOrderForView && selectedOrderForView.id === order.id) {
            setSelectedOrderForView(order);
          }
        }}
      />
    </div>
  );
}
