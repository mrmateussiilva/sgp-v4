import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, FileText, Printer, Search, ArrowUp, ArrowDown, X, Filter, CheckSquare, Square, Inbox, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import { OrderWithItems, OrderItem, UpdateOrderStatusRequest, OrderStatus } from '../types';
import { useToast } from '@/hooks/use-toast';
import { AutoRefreshStatus } from './AutoRefreshStatus';
import { useOrderAutoSync } from '../hooks/useOrderEvents';
import { SmoothTableWrapper } from './SmoothTableWrapper';
import OrderDetails from './OrderDetails';
import { OrderViewModal } from './OrderViewModal';
import { OrderQuickEditDialog } from './OrderQuickEditDialog';
import { formatDateForDisplay, ensureDateInputValue } from '@/utils/date';
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
import { cn } from '@/lib/utils';

export default function OrderList() {
  const navigate = useNavigate();
  const { orders, setOrders, removeOrder, setSelectedOrder, updateOrder } = useOrderStore();
  const logout = useAuthStore((state) => state.logout);
  
  // Sistema de sincronização em tempo real via eventos Tauri
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [lastSync, setLastSync] = useState<Date | undefined>();
  const [syncCount, setSyncCount] = useState(0);
  
  // Configurar sincronização automática via eventos
  useOrderAutoSync({
    orders,
    setOrders,
    removeOrder,
  });
  
  // Função para forçar sincronização manual (recarregar lista completa)
  const handleForceSync = async () => {
    console.log('🔄 Forçando sincronização manual...');
    await loadOrders();
    setLastSync(new Date());
    setSyncCount(prev => prev + 1);
  };
  
  const toggleRealtime = () => {
    setIsRealtimeActive(!isRealtimeActive);
    if (!isRealtimeActive) {
      setLastSync(new Date());
    }
  };
  
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
  const [sublimationModal, setSublimationModal] = useState<{
    show: boolean;
    pedidoId: number;
    machine: string;
    printDate: string;
  }>({
    show: false,
    pedidoId: 0,
    machine: '',
    printDate: '',
  });
  const [sublimationError, setSublimationError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carregar dados para filtros
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [vendedoresData, designersData] = await Promise.all([
          api.getVendedoresAtivos(),
          api.getDesignersAtivos(),
        ]);
        setVendedores(vendedoresData);
        setDesigners(designersData);
        
        // Extrair cidades únicas dos pedidos
        const uniqueCidades = Array.from(
          new Set(
            orders
              .map(order => order.cidade_cliente)
              .filter((cidade): cidade is string => Boolean(cidade))
          )
        ).sort();
        setCidades(uniqueCidades);
      } catch (error) {
        console.error('Erro ao carregar dados para filtros:', error);
      }
    };
    
    loadFilterData();
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
    extra?: { machine?: string; date?: string | null },
  ): UpdateOrderStatusRequest => {
    const payload: UpdateOrderStatusRequest = {
      id: order.id,
      financeiro: campo === 'financeiro' ? novoValor : order.financeiro === true,
      conferencia: campo === 'conferencia' ? novoValor : order.conferencia === true,
      sublimacao: campo === 'sublimacao' ? novoValor : order.sublimacao === true,
      costura: campo === 'costura' ? novoValor : order.costura === true,
      expedicao: campo === 'expedicao' ? novoValor : order.expedicao === true,
    };

    const existingMachine = order.sublimacao_maquina ?? null;
    const existingDate = order.sublimacao_data_impressao ?? null;

    if (campo === 'sublimacao') {
      if (novoValor) {
        payload.sublimacao_maquina =
          extra?.machine !== undefined ? extra.machine : existingMachine;
        payload.sublimacao_data_impressao =
          extra?.date !== undefined ? extra.date : existingDate;
      } else {
        payload.sublimacao_maquina = null;
        payload.sublimacao_data_impressao = null;
      }
    } else {
      payload.sublimacao_maquina = existingMachine;
      payload.sublimacao_data_impressao = existingDate;
    }

    const allComplete =
      payload.financeiro && payload.conferencia && payload.sublimacao && payload.costura && payload.expedicao;

    payload.pronto = allComplete;
    if (allComplete) {
      payload.status = OrderStatus.Concluido;
    } else {
      payload.status =
        order.status === OrderStatus.Concluido ? OrderStatus.EmProcessamento : order.status;
    }

    if (!payload.financeiro) {
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
    setEditOrderId(order.id);
    setSelectedOrder(order);
    setEditDialogOpen(true);
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

  const handlePrintSelected = () => {
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
        variant: "destructive",
      });
      setSelectedOrderIdsForPrint([]);
      return;
    }

    printSelectedOrders(ordersToPrint);
    toast({
      title: "Impressão",
      description: `Abrindo visualização de impressão de ${ordersToPrint.length} pedido(s).`,
    });
  };

  const printSelectedOrders = (orders: OrderWithItems[]) => {
    const printContent = generatePrintList(orders);
    
    // Criar iframe para impressão
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();

    // Aguardar carregamento das imagens antes de imprimir
    iframe.contentWindow?.focus();
    
    setTimeout(() => {
      iframe.contentWindow?.print();
      
      // Remover iframe após impressão
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const collectOrderData = (item: OrderItem): { basic: string[], details: string[] } => {
    const basic: string[] = [];
    const details: string[] = [];
    const itemRecord = item as unknown as Record<string, unknown>;

    // Funções auxiliares (iguais ao modal)
    const hasTextValue = (value?: string | null, options?: { disallow?: string[] }) => {
      if (!value) return false;
      const trimmed = value.trim();
      if (!trimmed) return false;
      const lower = trimmed.toLowerCase();
      if (options?.disallow?.some((entry) => lower === entry)) {
        return false;
      }
      return true;
    };

    const hasPositiveNumber = (value?: string | number | null) => {
      if (typeof value === 'number') return value > 0;
      if (!value) return false;
      const normalized = value
        .toString()
        .trim()
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const parsed = parseFloat(normalized);
      return !Number.isNaN(parsed) && parsed > 0;
    };

    const hasQuantityValue = (value?: string | null) => {
      if (!value) return false;
      const parsed = parseFloat(value.toString().replace(/\D/g, ''));
      if (!Number.isNaN(parsed)) {
        return parsed > 0;
      }
      return hasTextValue(value);
    };

    const isTrue = (value: unknown) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value === 1;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return ['true', '1', 'sim', 'yes'].includes(normalized);
      }
      return false;
    };


    // Dados básicos (cards destacados no modal)
    const tipo = item.tipo_producao || '';
    const descricao = item.descricao || '';
    const painelQuantidade = item.quantidade_paineis || '';
    const itemQuantidade = item.quantity && item.quantity > 0 ? String(item.quantity) : '';
    const quantidadeDisplay = painelQuantidade || itemQuantidade;

    if (tipo) basic.push(`Tipo: ${tipo.toUpperCase()}`);
    if (descricao) basic.push(`Desc: ${descricao}`);
    if (quantidadeDisplay) basic.push(`Qtd: ${quantidadeDisplay}`);

    const vendedor = item.vendedor || '';
    const designer = item.designer || '';
    if (vendedor || designer) {
      const equipe = [vendedor && `Vendedor: ${vendedor}`, designer && `Designer: ${designer}`].filter(Boolean).join(' | ');
      basic.push(`Equipe: ${equipe}`);
    }

    const largura = item.largura || '';
    const altura = item.altura || '';
    const area = item.metro_quadrado || '';
    if (largura || altura || area) {
      const dimensoes = [largura && `${largura}m`, altura && `${altura}m`, area && `${area}m²`].filter(Boolean).join(' × ');
      basic.push(`Dimensões: ${dimensoes}`);
    }

    const materialLabel = tipo.toLowerCase().includes('totem') ? 'Material' : tipo.toLowerCase().includes('adesivo') ? 'Tipo de Adesivo' : 'Tecido';
    const tecido = item.tecido || '';
    if (tecido) {
      basic.push(`${materialLabel}: ${tecido}`);
    }

    // Dados técnicos detalhados (seção de detalhes no modal)
    // Acabamentos básicos
    if (item.overloque) details.push('Overloque');
    if (item.elastico) details.push('Elástico');

    if (hasTextValue(item.tipo_acabamento, { disallow: ['nenhum'] })) {
      details.push(`Acabamento: ${item.tipo_acabamento}`);
    }

    // Ilhós
    if (hasQuantityValue(item.quantidade_ilhos)) {
      details.push(`Ilhós: ${item.quantidade_ilhos} un`);
    }

    if (hasTextValue(item.espaco_ilhos || null)) {
      const espaco = (item.espaco_ilhos || '').includes('cm') ? (item.espaco_ilhos || '') : `${item.espaco_ilhos || ''} cm`;
      details.push(`Espaço Ilhós: ${espaco}`);
    }

    if (hasPositiveNumber(item.valor_ilhos)) {
      details.push(`Valor Ilhós: R$ ${item.valor_ilhos}`);
    }

    // Cordinha
    if (hasQuantityValue(item.quantidade_cordinha)) {
      details.push(`Cordinha: ${item.quantidade_cordinha} un`);
    }

    if (hasTextValue(item.espaco_cordinha || null)) {
      const espaco = (item.espaco_cordinha || '').includes('cm') ? (item.espaco_cordinha || '') : `${item.espaco_cordinha || ''} cm`;
      details.push(`Espaço Cordinha: ${espaco}`);
    }

    if (hasPositiveNumber(item.valor_cordinha)) {
      details.push(`Valor Cordinha: R$ ${item.valor_cordinha}`);
    }

    // Dados específicos por tipo
    if (tipo.toLowerCase().includes('lona')) {
      const terceirizado = itemRecord.terceirizado;
      if (typeof terceirizado === 'boolean' && terceirizado) {
        details.push('Terceirizado');
      }

      const acabamentoLonaRaw = itemRecord.acabamento_lona;
      if (acabamentoLonaRaw && hasTextValue(String(acabamentoLonaRaw))) {
        const acabamentoLabel = String(acabamentoLonaRaw)
          .split(/[_-]/)
          .map((segment: string) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' ');
        details.push(`Acabamento Lona: ${acabamentoLabel}`);
      }

      if (hasPositiveNumber(itemRecord.valor_lona as string | number | null)) {
        details.push(`Valor Base Lona: R$ ${itemRecord.valor_lona}`);
      }

      if (hasPositiveNumber(itemRecord.outros_valores_lona as string | number | null)) {
        details.push(`Outros Valores Lona: R$ ${itemRecord.outros_valores_lona}`);
      }
    }

    if (isTrue(itemRecord.ziper)) {
      details.push('Com zíper');
    }

    if (isTrue(itemRecord.cordinha_extra)) {
      details.push('Cordinha adicional');
    }

    if (isTrue(itemRecord.alcinha)) {
      details.push('Inclui alcinha');
    }

    if (isTrue(itemRecord.toalha_pronta)) {
      details.push('Toalha pronta');
    }

    if (tipo.toLowerCase().includes('adesivo')) {
      const tipoAdesivo = itemRecord.tipo_adesivo;
      if (tipoAdesivo && hasTextValue(String(tipoAdesivo))) {
        details.push(`Tipo Adesivo: ${tipoAdesivo}`);
      }

      if (hasPositiveNumber(itemRecord.valor_adesivo as string | number | null)) {
        details.push(`Valor Adesivo: R$ ${itemRecord.valor_adesivo}`);
      }

      if (hasPositiveNumber(itemRecord.outros_valores_adesivo as string | number | null)) {
        details.push(`Outros Valores Adesivo: R$ ${itemRecord.outros_valores_adesivo}`);
      }

      const quantidadeAdesivo = itemRecord.quantidade_adesivo;
      if (quantidadeAdesivo && hasTextValue(String(quantidadeAdesivo))) {
        details.push(`Qtd Adesivos: ${quantidadeAdesivo}`);
      }
    }

    // Emenda
    const emendaTipoRaw = itemRecord.emenda;
    if (emendaTipoRaw && hasTextValue(String(emendaTipoRaw), { disallow: ['sem-emenda'] })) {
      const emendaTipo = String(emendaTipoRaw)
        .split(/[-_]/)
        .map((segment: string) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');

      details.push(`Emenda: ${emendaTipo}`);

      const emendaQtd = itemRecord.emenda_qtd || itemRecord.emendaQtd;
      if (emendaQtd && hasQuantityValue(String(emendaQtd))) {
        const emendaQtdNumber = parseFloat(String(emendaQtd).replace(/\D/g, ''));
        const emendaQtdLabel = emendaQtdNumber === 1 ? '1 emenda' : `${emendaQtdNumber} emendas`;
        details.push(`Qtd Emendas: ${emendaQtdLabel}`);
      }
    }

    return { basic, details };
  };

  const generatePrintList = (orders: OrderWithItems[]): string => {
    const styles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 9pt;
          line-height: 1.2;
          color: #000;
          background: #fff;
        }

        .order-item {
          border: 2px solid #2563eb;
          padding: 5mm;
          margin-bottom: 5mm;
          page-break-inside: avoid;
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 4mm;
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-radius: 6px;
        }

        .order-item:last-child {
          margin-bottom: 0;
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 2mm;
        }

        .right-column {
          display: flex;
          flex-direction: column;
          gap: 2mm;
        }

        .header-info {
          font-size: 8pt;
          color: #475569;
          margin-bottom: 3mm;
          line-height: 1.3;
          background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 2mm 3mm;
          border-radius: 4px;
          font-weight: 600;
        }

        .header-info strong {
          color: #fbbf24;
          font-weight: 700;
        }

        .section-title {
          font-size: 11pt;
          font-weight: 800;
          margin-bottom: 2mm;
          color: #1e40af;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 1mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .item-details {
          font-size: 9pt;
          line-height: 1.4;
          color: #334155;
          background: #f1f5f9;
          padding: 2mm;
          border-radius: 4px;
          border-left: 3px solid #3b82f6;
        }

        .item-image-container {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #e2e8f0;
          padding: 3mm;
          min-height: 110px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 6px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .item-image-container img {
          max-width: 100%;
          max-height: 180px;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .no-image {
          color: #64748b;
          font-style: italic;
          font-size: 8pt;
          font-weight: 500;
        }

        .priority-high {
          color: #dc2626;
          font-weight: 800;
          text-shadow: 0 1px 2px rgba(220, 38, 38, 0.3);
        }

        .priority-normal {
          color: #059669;
          font-weight: 600;
        }

        /* Otimização para 3 pedidos por página */
        .order-item {
          break-inside: avoid;
          max-height: 90mm; /* Aproximadamente 1/3 de uma página A4 */
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .order-item {
            page-break-inside: avoid;
            box-shadow: none;
            border: 2px solid #000;
          }

          .header-info {
            background: #f0f0f0 !important;
            color: #000 !important;
          }

          .section-title {
            color: #000 !important;
            border-bottom-color: #000 !important;
          }

          .item-details {
            background: #f9f9f9 !important;
            border-left-color: #666 !important;
          }

          .item-image-container {
            background: #f5f5f5 !important;
            border-color: #ccc !important;
          }
        }
      </style>
    `;

    const ordersHtml = orders.map(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      
      return items.map(item => {
        // Coletar dados usando a mesma lógica do modal
        const orderData = collectOrderData(item);

        const basicText = orderData.basic.length > 0
          ? orderData.basic.join(' • ')
          : '';

        const detailsText = orderData.details.length > 0
          ? orderData.details.join(' • ')
          : 'Nenhum detalhe técnico informado';

        const imageUrl = item.imagem?.trim();

        return `
          <div class="order-item">
            <div class="left-column">
              <div class="header-info">
                <strong>#${order.numero || order.id}</strong> • ${order.cliente || order.customer_name || '-'} • ${order.telefone_cliente || '-'} • ${order.cidade_cliente || '-'} / ${order.estado_cliente || '-'} • ${order.forma_envio || '-'} • <span class="${order.prioridade === 'ALTA' ? 'priority-high' : 'priority-normal'}">${order.prioridade || 'NORMAL'}</span>
              </div>

              ${basicText ? `
                <div class="section-title">📋 Informações do Item</div>
                <div class="item-details">
                  <strong>${basicText}</strong>
                </div>
              ` : ''}

              <div class="section-title">🔧 Especificações Técnicas</div>
              <div class="item-details">
                <strong>${detailsText}</strong>
              </div>
            </div>

            <div class="right-column">
              <div class="section-title" style="text-align: center; margin-bottom: 2mm;">🖼️ Visual do Item</div>
              <div class="item-image-container">
                ${imageUrl
                  ? `<img src="${imageUrl}" alt="Imagem do item" />`
                  : '<span class="no-image">Imagem não disponível</span>'
                }
              </div>
            </div>
          </div>
        `;
      }).join('');
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lista de Produção</title>
        ${styles}
      </head>
      <body>
        ${ordersHtml}
      </body>
      </html>
    `;
  };

  const handleStatusClick = (pedidoId: number, campo: string, valorAtual: boolean, nomeSetor: string) => {
    const targetOrder = orders.find((order) => order.id === pedidoId);
    if (!targetOrder) {
      return;
    }

    if (campo === 'sublimacao' && !valorAtual) {
      const defaultDate =
        ensureDateInputValue(targetOrder.sublimacao_data_impressao ?? null) ||
        new Date().toISOString().slice(0, 10);
      setSublimationModal({
        show: true,
        pedidoId,
        machine: targetOrder.sublimacao_maquina ?? '',
        printDate: defaultDate,
      });
      setSublimationError(null);
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
    const targetOrder = orders.find((order) => order.id === pedidoId);

    if (!targetOrder) {
      setStatusConfirmModal({ show: false, pedidoId: 0, campo: '', novoValor: false, nomeSetor: '' });
      return;
    }

    const payload = buildStatusUpdatePayload(targetOrder, campo, novoValor);

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

  const handleCloseSublimationModal = () => {
    setSublimationModal({ show: false, pedidoId: 0, machine: '', printDate: '' });
    setSublimationError(null);
  };

  const handleConfirmSublimation = async () => {
    if (!sublimationModal.show) {
      return;
    }
    const targetOrder = orders.find((order) => order.id === sublimationModal.pedidoId);
    if (!targetOrder) {
      handleCloseSublimationModal();
      return;
    }

    const machine = sublimationModal.machine.trim();
    const printDateRaw = sublimationModal.printDate.trim();
    const normalizedDate = ensureDateInputValue(printDateRaw);

    if (!machine) {
      setSublimationError('Informe o nome da máquina.');
      return;
    }
    if (!normalizedDate) {
      setSublimationError('Informe a data de impressão.');
      return;
    }

    const payload = buildStatusUpdatePayload(targetOrder, 'sublimacao', true, {
      machine,
      date: normalizedDate,
    });

    try {
      const updatedOrder = await api.updateOrderStatus(payload);
      updateOrder(updatedOrder);
      const allCompleted =
        updatedOrder.pronto && updatedOrder.status === OrderStatus.Concluido;

      toast({
        title: allCompleted ? 'Pedido concluído' : 'Sublimação marcada',
        description: allCompleted
          ? `Todos os setores foram concluídos. Pedido marcado como pronto em ${formatDateForDisplay(normalizedDate, '-')}.`
          : `Sublimação confirmada com máquina ${machine} em ${formatDateForDisplay(normalizedDate, '-')}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status de sublimação.',
        variant: 'destructive',
      });
      console.error('Error updating sublimation status:', error);
    } finally {
      handleCloseSublimationModal();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 min-h-screen">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Busque e filtre os pedidos</CardDescription>
            </div>
            <AutoRefreshStatus 
              isActive={isRealtimeActive}
              isRefreshing={false}
              lastRefresh={lastSync}
              refreshCount={syncCount}
              onToggle={toggleRealtime}
              onForceRefresh={handleForceSync}
            />
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

      <Card className="flex-1 flex flex-col min-h-0 flex-grow">
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <SmoothTableWrapper>
              <Table className="w-full max-w-full">
              <TableHeader>
            <TableRow>
                  <TableHead className="w-[44px] sticky left-0 z-10 bg-background border-r">
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
                    className="w-[72px] sticky left-[44px] z-10 bg-background border-r cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center">
                      ID
                      {getSortIcon('id')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('cliente')}
                  >
                    <div className="flex items-center">
                      Nome Cliente
                      {getSortIcon('cliente')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[110px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('data_entrega')}
                  >
                    <div className="flex items-center">
                      Data Entrega
                      {getSortIcon('data_entrega')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[88px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('prioridade')}
                  >
                    <div className="flex items-center">
                      Prioridade
                      {getSortIcon('prioridade')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[140px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('cidade')}
                  >
                    <div className="flex items-center">
                      Cidade/UF
                      {getSortIcon('cidade')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap">Fin.</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Conf.</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Subl.</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Cost.</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Exp.</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap sticky right-0 z-10 bg-background border-l">Ações</TableHead>
            </TableRow>
              </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Carregando pedidos...
                  </div>
                </TableCell>
              </TableRow>
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
                        <TableCell className="text-center sticky left-0 z-10 bg-background border-r">
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
                        <TableCell className="font-mono font-medium whitespace-nowrap sticky left-[44px] z-10 bg-background border-r">
                          #{order.numero || order.id}
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px] truncate">
                          {order.cliente || order.customer_name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateForDisplay(order.data_entrega, '-')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge 
                            variant={order.prioridade === 'ALTA' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {order.prioridade || 'NORMAL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {order.cidade_cliente && order.estado_cliente 
                            ? `${order.cidade_cliente}/${order.estado_cliente}`
                            : order.cidade_cliente || '-'}
                        </TableCell>
                        
                        {/* Checkboxes de Status */}
                        {/* Financeiro - Sempre habilitado (é o primeiro) */}
                        <TableCell className="text-center whitespace-nowrap">
                          <Checkbox
                            checked={order.financeiro === true}
                            onCheckedChange={() => handleStatusClick(order.id, 'financeiro', !!order.financeiro, 'Financeiro')}
                          />
                        </TableCell>
                        
                        {/* Conferência - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center whitespace-nowrap">
                          <Checkbox
                            checked={order.conferencia === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'conferencia', !!order.conferencia, 'Conferência')}
                          />
                        </TableCell>
                        
                        {/* Sublimação - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center whitespace-nowrap">
                          <Checkbox
                            checked={order.sublimacao === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'sublimacao', !!order.sublimacao, 'Sublimação')}
                          />
                          {order.sublimacao && (order.sublimacao_maquina || order.sublimacao_data_impressao) && (
                            <div className="mt-1 text-[10px] text-muted-foreground leading-tight text-center">
                              {order.sublimacao_maquina && <div>{order.sublimacao_maquina}</div>}
                              {order.sublimacao_data_impressao && (
                                <div>{formatDateForDisplay(order.sublimacao_data_impressao, '-')}</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        
                        {/* Costura - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center whitespace-nowrap">
                          <Checkbox
                            checked={order.costura === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'costura', !!order.costura, 'Costura')}
                          />
                  </TableCell>
                        
                        {/* Expedição - Só habilitado se Financeiro estiver marcado */}
                        <TableCell className="text-center whitespace-nowrap">
                          <Checkbox
                            checked={order.expedicao === true}
                            disabled={!order.financeiro}
                            onCheckedChange={() => handleStatusClick(order.id, 'expedicao', !!order.expedicao, 'Expedição')}
                          />
                        </TableCell>
                        
                        {/* Status (Pronto / Em andamento) - Campo calculado automaticamente */}
                        <TableCell className="text-center whitespace-nowrap">
                          <Badge 
                            variant={order.pronto ? 'success' : 'secondary'}
                            className="text-xs"
                          >
                            {order.pronto ? 'Pronto' : 'Em Andamento'}
                          </Badge>
                        </TableCell>
                      <TableCell className="text-right whitespace-nowrap sticky right-0 z-10 bg-background border-l">
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
            </SmoothTableWrapper>
          </div>
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

      {/* Modal de Confirmação de Status */}
      <Dialog
        open={sublimationModal.show}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseSublimationModal();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Sublimação</DialogTitle>
            <DialogDescription>
              Informe os detalhes da impressão antes de marcar a sublimação como concluída.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sublimation-machine">Máquina</Label>
              <Input
                id="sublimation-machine"
                value={sublimationModal.machine}
                onChange={(event) =>
                  setSublimationModal((prev) => ({ ...prev, machine: event.target.value }))
                }
                placeholder="Ex: Epson SureColor F570"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sublimation-date">Data da impressão</Label>
              <Input
                id="sublimation-date"
                type="date"
                value={sublimationModal.printDate}
                onChange={(event) =>
                  setSublimationModal((prev) => ({ ...prev, printDate: event.target.value }))
                }
              />
            </div>
            {sublimationError && (
              <p className="text-sm text-destructive">{sublimationError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSublimationModal}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSublimation}>Confirmar</Button>
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
