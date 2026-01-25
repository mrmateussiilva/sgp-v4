import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, FileText, Printer, Search, ArrowUp, ArrowDown, X, Filter, CheckSquare, Inbox, Camera, ChevronDown, ChevronUp, Calendar, AlertTriangle, Clock, CheckCircle2, Copy, ChevronRight, Table2, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { api } from '../services/api';
import { logger } from '@/utils/logger';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import { OrderWithItems, UpdateOrderStatusRequest, OrderStatus } from '../types';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import { useOrderAutoSync } from '../hooks/useOrderEvents';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { SmoothTableWrapper } from './SmoothTableWrapper';
import { OrderViewModal } from './OrderViewModal';
import { EditingIndicator } from './EditingIndicator';
import { OrderQuickEditDialog } from './OrderQuickEditDialog';
import { OrderProductionPipeline } from './OrderProductionPipeline';
// import { OrderContextPanel } from './OrderContextPanel'; // Painel lateral desabilitado
import { formatDateForDisplay } from '@/utils/date';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
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
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isTauri } from '@/utils/isTauri';
import { PrintPreviewModal } from './PrintPreviewModal';
import { generateMultipleOrdersPdfBlob } from '@/utils/printOrderServiceForm';
import { loadAuthenticatedImage } from '@/utils/imageLoader';
import { isValidImagePath } from '@/utils/path';

// import { cn } from '@/lib/utils'; // Não usado mais (painel lateral desabilitado)

export default function OrderList() {
  const navigate = useNavigate();
  const { orders, setOrders, removeOrder, setSelectedOrder, updateOrder } = useOrderStore();
  const logout = useAuthStore((state) => state.logout);
  const { isAdmin } = useUser();

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState(''); // Termo de busca ativo (após clicar em buscar)
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
  const [selectedFormaEnvio, setSelectedFormaEnvio] = useState<string>('');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  // Dados para filtros
  const [vendedores, setVendedores] = useState<Array<{ id: number; nome: string }>>([]);
  const [designers, setDesigners] = useState<Array<{ id: number; nome: string }>>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [formasEnvio, setFormasEnvio] = useState<Array<{ id: number; nome: string; valor: number }>>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<OrderWithItems | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [orderToDuplicate, setOrderToDuplicate] = useState<OrderWithItems | null>(null);
  const [duplicateDataEntrada, setDuplicateDataEntrada] = useState('');
  const [duplicateDataEntrega, setDuplicateDataEntrega] = useState('');
  const [duplicateDateError, setDuplicateDateError] = useState<string | null>(null);
  const [selectedOrderIdsForPrint, setSelectedOrderIdsForPrint] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  // Estados para reposição
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [orderToReplace, setOrderToReplace] = useState<OrderWithItems | null>(null);
  // Alternância entre tabela e pipeline de produção
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
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

  // Estados para navegação por teclado (painel lateral desabilitado)
  const [isBulkPreviewOpen, setIsBulkPreviewOpen] = useState(false);
  const [bulkPdfBlob, setBulkPdfBlob] = useState<Blob | null>(null);
  const [bulkPdfFilename, setBulkPdfFilename] = useState('');
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  // const [contextPanelOpen, setContextPanelOpen] = useState(false);
  // const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null);
  const selectedOrder = useOrderStore((state) => state.selectedOrder);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  // REMOVIDO: subscribeToOrderEvents duplicado
  // useOrderAutoSync já gerencia todas as atualizações via WebSocket
  // Não precisamos de uma segunda assinatura que cria conexões duplicadas

  // Carregar dados para filtros (vendedores + designers + formas de envio)
  useEffect(() => {
    let isMounted = true;
    const loadFilterData = async () => {
      try {
        const [vendedoresData, designersData, formasEnvioData] = await Promise.all([
          api.getVendedoresAtivos(),
          api.getDesignersAtivos(),
          api.getFormasEnvioAtivas(),
        ]);
        if (!isMounted) {
          return;
        }
        setVendedores(vendedoresData);
        setDesigners(designersData);
        setFormasEnvio(formasEnvioData);
      } catch (error) {
        if (isMounted) {
          logger.error('Erro ao carregar dados para filtros:', error);
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
      // Se houver busca ativa, sempre carregar dataset maior para filtrar localmente
      const hasSearch = Boolean(activeSearchTerm && activeSearchTerm.trim().length > 0);
      const clientSideFiltersActive =
        hasSearch ||
        selectedStatuses.length > 0 || Boolean(selectedVendedor) || Boolean(selectedDesigner) || Boolean(selectedCidade) || Boolean(selectedFormaEnvio);

      // SEMPRE buscar todos os pedidos quando 'all' é selecionado, independente de outros filtros
      if (productionStatusFilter === 'all') {
        const bigPageSize = 10000; // Limite alto para buscar todos os pedidos
        logger.debug('[OrderList] Buscando TODOS os pedidos com bigPageSize:', bigPageSize);
        const paginatedData = await api.getOrdersPaginatedForTable(
          1, // Sempre começar da página 1 quando buscando 'all'
          bigPageSize,
          undefined, // status - todos
          hasSearch ? undefined : (activeSearchTerm || undefined), // cliente
          dateFrom || undefined, // data_inicio
          dateTo || undefined // data_fim
        );
        logger.debug('[OrderList] Pedidos recebidos:', paginatedData.orders.length, 'Total:', paginatedData.total);
        if (loadRequestRef.current !== requestId) {
          return;
        }

        // Quando buscamos 'all' com bigPageSize, sempre paginar no frontend
        // Os filtros client-side serão aplicados através de filteredOrders
        setOrders(paginatedData.orders);
        // TotalPages será calculado no useMemo baseado em filteredOrders e rowsPerPage
        // TotalOrders será o número total de pedidos retornados
        setTotalPages(Math.ceil(paginatedData.orders.length / currentPageSize) || 1);
        setTotalOrders(paginatedData.orders.length);
      } else if (productionStatusFilter === 'pending') {
        const all = await api.getPendingOrdersLight();
        if (loadRequestRef.current !== requestId) {
          return;
        }
        logger.debug('[OrderList] getPendingOrdersLight retornou:', {
          ordersLength: all.length
        });
        setOrders(all);
        setTotalPages(Math.ceil(all.length / currentPageSize) || 1);
        setTotalOrders(all.length);
      } else if (dateFrom || dateTo) {
        // Se houver filtros que o backend não suporta (designer/vendedor/cidade/status checkbox),
        // precisamos trazer um conjunto maior e filtrar localmente.
        if (clientSideFiltersActive) {
          const bigPageSize = 5000;
          // Não passar cliente para backend quando há busca - vamos filtrar localmente
          const paginatedData = await api.getOrdersPaginatedForTable(
            1,
            bigPageSize,
            undefined, // status
            hasSearch ? undefined : (activeSearchTerm || undefined), // cliente - só se não houver busca
            dateFrom || undefined, // data_inicio
            dateTo || undefined, // data_fim
          );
          if (loadRequestRef.current !== requestId) {
            return;
          }
          setOrders(paginatedData.orders);
          setTotalPages(Math.ceil(paginatedData.orders.length / currentPageSize) || 1);
          setTotalOrders(paginatedData.orders.length);
        } else {
          const filters = {
            status: OrderStatus.Concluido,
            cliente: hasSearch ? undefined : (activeSearchTerm || undefined), // Não passar cliente se há busca - vamos filtrar localmente
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            page: currentPage + 1,
            page_size: currentPageSize,
          };

          const paginatedData = await api.getOrdersWithFiltersForTable(filters);
          if (loadRequestRef.current !== requestId) {
            return;
          }
          setOrders(paginatedData.orders);
          setTotalPages(paginatedData.total_pages);
          setTotalOrders(paginatedData.total);
        }
      } else if (productionStatusFilter === 'ready') {
        if (clientSideFiltersActive || hasSearch) {
          const all = await api.getReadyOrdersLight();
          if (loadRequestRef.current !== requestId) {
            return;
          }
          setOrders(all);
          setTotalPages(Math.ceil(all.length / currentPageSize) || 1);
          setTotalOrders(all.length);
        } else {
          const paginatedData = await api.getReadyOrdersPaginated(currentPage + 1, currentPageSize);
          if (loadRequestRef.current !== requestId) {
            return;
          }
          setOrders(paginatedData.orders);
          setTotalPages(paginatedData.total_pages);
          setTotalOrders(paginatedData.total);
        }
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      if (isSessionError(message)) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'destructive',
        });
        logger.error('Session error while loading orders:', error);
        logout();
        navigate('/login', { replace: true });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os pedidos.',
          variant: 'destructive',
        });
        logger.error('Error loading orders:', error);
      }
    } finally {
      if (loadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [
    dateFrom,
    dateTo,
    page,
    rowsPerPage,
    productionStatusFilter,
    activeSearchTerm, // Usar activeSearchTerm (busca só após clicar no botão)
    selectedStatuses.length,
    selectedVendedor,
    selectedDesigner,
    selectedCidade,
    selectedFormaEnvio,
    toast,
    logout,
    navigate,
  ]);

  // Configurar sincronização automática via eventos (DEPOIS de loadOrders estar definido)
  useOrderAutoSync({
    orders,
    setOrders,
    removeOrder,
    updateOrder,
    loadOrders,
  });

  // Auto-refresh suave (fallback) a cada 15s.
  // Não executa enquanto modais estiverem abertos para evitar qualquer sensação de "piscada".
  useAutoRefresh(
    async () => {
      if (viewModalOpen || editDialogOpen || deleteDialogOpen) {
        return;
      }
      await loadOrders();
    },
    30000,
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Recarregar pedidos quando o modal de visualização for fechado
  useEffect(() => {
    if (!viewModalOpen) {
      // Pequeno delay para garantir que o modal foi completamente fechado
      const timeoutId = setTimeout(() => {
        logger.debug('[OrderList] Modal fechado, recarregando pedidos...');
        loadOrders();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [viewModalOpen, loadOrders]);

  useEffect(() => {
    setPage(0);
  }, [productionStatusFilter, dateFrom, dateTo, selectedStatuses, selectedVendedor, selectedDesigner, selectedCidade, activeSearchTerm, rowsPerPage]);

  const handleEdit = (order: OrderWithItems) => {
    // Navegar para a página de edição completa usando a nova rota
    // Como o Dashboard está em /dashboard/*, precisamos incluir o prefixo
    navigate(`/dashboard/pedido/editar/${order.id}`);
  };

  const handleViewOrder = (order: OrderWithItems) => {
    setSelectedOrderForView(order);
    setViewModalOpen(true);
  };


  const handleDeleteClick = (orderId: number) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  };

  const validateDuplicateDates = (dataEntrada: string, dataEntrega: string): string | null => {
    if (!dataEntrada) return null; // Data de entrada é obrigatória mas validação será feita no submit
    if (!dataEntrega) return null; // Data de entrega é opcional

    const entrada = new Date(dataEntrada);
    const saida = new Date(dataEntrega);

    if (entrada > saida) {
      return 'Data de entrada não pode ser maior que data de entrega';
    }

    return null;
  };

  const handleDuplicateClick = (order: OrderWithItems) => {
    setOrderToDuplicate(order);
    // Inicializar datas: entrada = hoje, entrega = mesma do pedido original
    const hoje = new Date().toISOString().split('T')[0];
    const dataEntrega = order.data_entrega || '';
    setDuplicateDataEntrada(hoje);
    setDuplicateDataEntrega(dataEntrega);
    setDuplicateDateError(validateDuplicateDates(hoje, dataEntrega));
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateDateChange = (field: 'entrada' | 'entrega', value: string) => {
    if (field === 'entrada') {
      setDuplicateDataEntrada(value);
      if (duplicateDataEntrega) {
        setDuplicateDateError(validateDuplicateDates(value, duplicateDataEntrega));
      }
    } else {
      setDuplicateDataEntrega(value);
      if (duplicateDataEntrada) {
        setDuplicateDateError(validateDuplicateDates(duplicateDataEntrada, value));
      }
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!orderToDuplicate) return;

    // Validar datas antes de confirmar
    if (duplicateDataEntrada && duplicateDataEntrega) {
      const dateError = validateDuplicateDates(duplicateDataEntrada, duplicateDataEntrega);
      if (dateError) {
        toast({
          title: 'Erro de Validação',
          description: dateError,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validar que data de entrada foi preenchida
    if (!duplicateDataEntrada) {
      toast({
        title: 'Erro de Validação',
        description: 'Data de entrada é obrigatória',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDuplicateDialogOpen(false);

      toast({
        title: 'Duplicando pedido...',
        description: 'Aguarde enquanto o pedido está sendo duplicado.',
      });

      // Chamar duplicateOrder com as datas personalizadas
      const newOrder = await api.duplicateOrder(orderToDuplicate.id, {
        data_entrada: duplicateDataEntrada || undefined,
        data_entrega: duplicateDataEntrega || undefined,
      });

      // Não chamar addOrder diretamente - o WebSocket vai adicionar automaticamente
      // Isso evita duplicação

      toast({
        title: 'Sucesso',
        description: `Pedido duplicado com sucesso! Novo pedido #${newOrder.numero || newOrder.id}`,
      });

      // Limpar estado
      setOrderToDuplicate(null);
      setDuplicateDataEntrada('');
      setDuplicateDataEntrega('');
      setDuplicateDateError(null);
    } catch (error) {
      logger.error('Erro ao duplicar pedido:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao duplicar pedido',
        variant: 'destructive',
      });
    }
  };

  const handleCreateReplacementClick = (order: OrderWithItems) => {
    setOrderToReplace(order);
    setReplacementDialogOpen(true);
  };

  const handleReplacementConfirm = async (zeroValues: boolean) => {
    if (!orderToReplace) return;

    try {
      setReplacementDialogOpen(false);
      toast({
        title: 'Criando ficha de reposição...',
        description: zeroValues
          ? 'Gerando reposição com valores zerados (Cortesia).'
          : 'Gerando reposição com valores originais.',
      });

      // Criar o pedido de reposição com a opção escolhida
      const newOrder = await api.createReplacementOrder(orderToReplace.id, { zeroValues });

      toast({
        title: 'Ficha de reposição criada',
        description: `Pedido #${newOrder.numero || newOrder.id} criado com sucesso.`,
      });

      // Navegar para a página de edição do novo pedido
      navigate(`/dashboard/pedido/editar/${newOrder.id}`);
      setOrderToReplace(null);
    } catch (error) {
      logger.error('Erro ao criar ficha de reposição:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar ficha de reposição',
        variant: 'destructive',
      });
    }
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
        logger.error('Error deleting order:', error);
      }
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleQuickShare = async (order: OrderWithItems) => {
    try {
      // Buscar pedido completo se não tiver itens carregados
      let orderWithItems = order;
      if (!order.items || order.items.length === 0) {
        orderWithItems = await api.getOrderById(order.id);
      }

      if (!orderWithItems.items || orderWithItems.items.length === 0) {
        toast({
          title: "Aviso",
          description: "Este pedido não possui itens para compartilhar.",
          variant: "warning",
        });
        return;
      }

      // Criar div temporário off-screen
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '600px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      tempDiv.style.color = '#000';

      // Título do pedido
      const titleDiv = document.createElement('div');
      titleDiv.style.marginBottom = '20px';
      titleDiv.style.fontSize = '18px';
      titleDiv.style.fontWeight = 'bold';
      titleDiv.textContent = `Pedido #${formatOrderNumber(orderWithItems.numero, orderWithItems.id)} - ${orderWithItems.cliente || orderWithItems.customer_name || 'Cliente'}`;
      tempDiv.appendChild(titleDiv);

      // Container para itens
      const itemsContainer = document.createElement('div');
      itemsContainer.style.display = 'flex';
      itemsContainer.style.flexDirection = 'column';
      itemsContainer.style.gap = '30px';

      // Carregar e renderizar cada item
      for (const item of orderWithItems.items) {
        const itemDiv = document.createElement('div');
        itemDiv.style.display = 'flex';
        itemDiv.style.flexDirection = 'column';
        itemDiv.style.gap = '10px';
        itemDiv.style.borderBottom = '1px solid #e5e5e5';
        itemDiv.style.paddingBottom = '20px';

        // Nome do item
        if (item.item_name) {
          const itemNameDiv = document.createElement('div');
          itemNameDiv.style.fontSize = '16px';
          itemNameDiv.style.fontWeight = '600';
          itemNameDiv.textContent = item.item_name;
          itemDiv.appendChild(itemNameDiv);
        }

        // Imagem do item (se existir)
        if (item.imagem && isValidImagePath(item.imagem)) {
          try {
            const imageUrl = await loadAuthenticatedImage(item.imagem);
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.marginTop = '10px';
            img.style.marginBottom = '10px';

            // Aguardar carregamento da imagem
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              // Timeout de segurança
              setTimeout(() => {
                if (!img.complete) {
                  reject(new Error('Timeout ao carregar imagem'));
                }
              }, 10000);
            });

            itemDiv.appendChild(img);
          } catch (error) {
            logger.error('Erro ao carregar imagem do item:', error);
            // Continuar mesmo se a imagem falhar
          }
        }

        // Legenda/Observação
        const caption = item.legenda_imagem || item.observacao;
        if (caption) {
          const captionDiv = document.createElement('div');
          captionDiv.style.fontSize = '14px';
          captionDiv.style.color = '#333';
          captionDiv.style.lineHeight = '1.5';
          captionDiv.style.whiteSpace = 'pre-wrap';
          captionDiv.textContent = caption;
          itemDiv.appendChild(captionDiv);
        }

        itemsContainer.appendChild(itemDiv);
      }

      tempDiv.appendChild(itemsContainer);
      document.body.appendChild(tempDiv);

      // Aguardar um pouco para garantir que tudo foi renderizado
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar screenshot
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#ffffff',
        scale: 2, // Melhor qualidade
        logging: false,
        useCORS: true,
        allowTaint: false,
      });

      // Converter canvas para blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });

      if (!blob) {
        throw new Error('Não foi possível gerar a imagem');
      }

      // Tentar copiar para clipboard usando Tauri (se disponível) ou fallback para download
      if (isTauri()) {
        try {
          // Usar plugin de clipboard do Tauri
          const { writeImage } = await import('@tauri-apps/plugin-clipboard-manager');

          // Converter blob para Uint8Array (bytes do arquivo PNG)
          const arrayBuffer = await blob.arrayBuffer();
          const imageBytes = new Uint8Array(arrayBuffer);

          await writeImage(imageBytes);

          toast({
            title: "Copiado!",
            description: "Cole no WhatsApp",
            variant: "success",
          });
        } catch (tauriError) {
          logger.error('Erro ao copiar via Tauri:', tauriError);
          // Fallback para download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pedido-${formatOrderNumber(orderWithItems.numero, orderWithItems.id)}.png`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            if (document.body.contains(a)) {
              document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
          }, 100);

          toast({
            title: "Imagem salva",
            description: "A imagem foi baixada. Anexe ao WhatsApp.",
            variant: "info",
          });
        }
      } else {
        // Ambiente web: tentar clipboard do navegador primeiro
        let copied = false;
        try {
          if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            copied = true;
          }
        } catch (clipboardError) {
          logger.warn('Erro ao copiar para clipboard:', clipboardError);
        }

        if (copied) {
          toast({
            title: "Copiado!",
            description: "Cole no WhatsApp",
            variant: "success",
          });
        } else {
          // Fallback para download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pedido-${formatOrderNumber(orderWithItems.numero, orderWithItems.id)}.png`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            if (document.body.contains(a)) {
              document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
          }, 100);

          toast({
            title: "Imagem salva",
            description: "A imagem foi baixada. Anexe ao WhatsApp.",
            variant: "info",
          });
        }
      }

      // Limpar div temporário
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    } catch (error) {
      logger.error('Erro ao gerar screenshot:', error);

      // Limpar div temporário se ainda existir
      const tempDiv = document.querySelector('div[style*="-9999px"]');
      if (tempDiv && document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }

      toast({
        title: "Erro",
        description: "Não foi possível gerar a imagem. Tente novamente.",
        variant: "destructive",
      });
    }
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

  // Função para executar busca
  const handleSearch = () => {
    logger.debug('[OrderList] handleSearch chamado com termo:', searchTerm);
    setActiveSearchTerm(searchTerm.trim());
    setPage(0); // Resetar para primeira página
  };

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedVendedor('');
    setSelectedDesigner('');
    setSelectedCidade('');
    setSelectedFormaEnvio('');
    setSearchTerm('');
    setActiveSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setProductionStatusFilter('pending');
  };

  // Formatar data para exibição
  const formatDateFilter = (date: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  // Verificar se um pedido é de reposição
  const isReplacementOrder = (order: OrderWithItems): boolean => {
    return order.observacao?.includes('[REPOSIÇÃO]') || order.observacao?.includes('[REPOSICAO]') || false;
  };

  // Remover zeros à esquerda do número do pedido
  const formatOrderNumber = (numero: string | number | null | undefined, id: number): string => {
    if (numero) {
      // Converte para string e remove zeros à esquerda, mantém o valor original se for 0
      const numStr = String(numero).replace(/^0+/, '');
      return numStr || '0';
    }
    return String(id);
  };

  // Calcular estado de urgência do pedido baseado na data de entrega
  const getOrderUrgency = useCallback((dataEntrega: string | null | undefined) => {
    if (!dataEntrega) return { type: 'no-date', days: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tratar dataEntrega com cuidado para evitar problemas de fuso horário
    // Se for YYYY-MM-DD, extrair os componentes e criar data local
    let deliveryDate: Date;
    const dateMatch = dataEntrega.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dateMatch) {
      const [, y, m, d] = dateMatch.map(Number);
      deliveryDate = new Date(y, m - 1, d);
    } else {
      deliveryDate = new Date(dataEntrega);
    }

    deliveryDate.setHours(0, 0, 0, 0);

    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { type: 'overdue', days: Math.abs(diffDays) };
    } else if (diffDays === 0) {
      return { type: 'today', days: 0 };
    } else if (diffDays === 1) {
      return { type: 'tomorrow', days: 1 };
    } else if (diffDays <= 3) {
      return { type: 'soon', days: diffDays };
    } else {
      return { type: 'ok', days: diffDays };
    }
  }, []);

  // Obter lista de filtros ativos para exibição
  const activeFiltersList = useMemo(() => {
    const filters: Array<{ label: string; onRemove: () => void }> = [];

    if (productionStatusFilter !== 'pending') {
      filters.push({
        label: productionStatusFilter === 'ready' ? 'Prontos' : 'Todos',
        onRemove: () => setProductionStatusFilter('pending'),
      });
    }

    if (dateFrom || dateTo) {
      const dateLabel = dateFrom && dateTo
        ? `${formatDateFilter(dateFrom)} a ${formatDateFilter(dateTo)}`
        : dateFrom
          ? `A partir de ${formatDateFilter(dateFrom)}`
          : `Até ${formatDateFilter(dateTo)}`;
      filters.push({
        label: `Período: ${dateLabel}`,
        onRemove: () => {
          setDateFrom('');
          setDateTo('');
        },
      });
    }

    if (activeSearchTerm) {
      filters.push({
        label: `Busca: "${activeSearchTerm}"`,
        onRemove: () => {
          setActiveSearchTerm('');
          setSearchTerm('');
        },
      });
    }

    selectedStatuses.forEach(status => {
      const statusLabels: Record<string, string> = {
        financeiro: 'Financeiro',
        conferencia: 'Conferência',
        sublimacao: 'Sublimação',
        costura: 'Costura',
        expedicao: 'Expedição',
        pronto: 'Pronto',
      };
      filters.push({
        label: statusLabels[status] || status,
        onRemove: () => setSelectedStatuses(selectedStatuses.filter(s => s !== status)),
      });
    });

    if (selectedVendedor) {
      filters.push({
        label: `Vendedor: ${selectedVendedor}`,
        onRemove: () => setSelectedVendedor(''),
      });
    }

    if (selectedDesigner) {
      filters.push({
        label: `Designer: ${selectedDesigner}`,
        onRemove: () => setSelectedDesigner(''),
      });
    }

    if (selectedCidade) {
      filters.push({
        label: `Cidade: ${selectedCidade}`,
        onRemove: () => setSelectedCidade(''),
      });
    }

    if (selectedFormaEnvio) {
      filters.push({
        label: `Forma de Envio: ${selectedFormaEnvio}`,
        onRemove: () => setSelectedFormaEnvio(''),
      });
    }

    return filters;
  }, [productionStatusFilter, dateFrom, dateTo, activeSearchTerm, selectedStatuses, selectedVendedor, selectedDesigner, selectedCidade, selectedFormaEnvio]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedVendedor) count++;
    if (selectedDesigner) count++;
    if (selectedCidade) count++;
    if (selectedFormaEnvio) count++;
    if (activeSearchTerm) count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [selectedStatuses, selectedVendedor, selectedDesigner, selectedCidade, selectedFormaEnvio, activeSearchTerm, dateFrom, dateTo]);

  // Verificar se estamos usando paginação do backend
  // Se houver filtros que o backend não suporta (designer/vendedor/cidade/status checkbox),
  // carregamos um dataset maior e fazemos paginação local.
  const clientSideFiltersActive =
    Boolean(activeSearchTerm) || // Busca só ativa após clicar no botão
    selectedStatuses.length > 0 || Boolean(selectedVendedor) || Boolean(selectedDesigner) || Boolean(selectedCidade) || Boolean(selectedFormaEnvio);
  // Quando 'all' é selecionado, sempre usamos paginação frontend porque buscamos todos os pedidos de uma vez
  const isBackendPaginated =
    !clientSideFiltersActive &&
    productionStatusFilter !== 'all' && // 'all' sempre usa paginação frontend
    productionStatusFilter !== 'pending' && // 'pending' sempre usa paginação frontend (filtra por pronto)
    (dateFrom || dateTo || productionStatusFilter === 'ready');

  // Salvaguarda: Se não for admin, forçar visão de tabela
  useEffect(() => {
    if (!isAdmin && viewMode === 'pipeline') {
      setViewMode('table');
    }
  }, [isAdmin, viewMode]);

  const filteredOrders = useMemo(() => {
    logger.debug('[OrderList] filteredOrders - orders.length:', orders.length);
    logger.debug('[OrderList] filteredOrders - productionStatusFilter:', productionStatusFilter);
    logger.debug('[OrderList] filteredOrders - isBackendPaginated:', isBackendPaginated);
    logger.debug('[OrderList] filteredOrders - activeSearchTerm:', activeSearchTerm);
    logger.debug('[OrderList] filteredOrders - selectedStatuses:', selectedStatuses);

    // Se estamos usando paginação do backend, os pedidos já vêm filtrados e paginados
    // Aplicar apenas filtros avançados que não estão disponíveis no backend
    let filtered = orders;

    const normalizeText = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    // Aplicar busca apenas quando activeSearchTerm estiver definido (após clicar em buscar)
    if (activeSearchTerm && activeSearchTerm.trim().length > 0) {
      const normalizedTerm = normalizeText(activeSearchTerm);
      const termDigits = normalizedTerm.replace(/\D/g, '');
      const beforeCount = filtered.length;
      filtered = filtered.filter((order) => {
        const clienteName = order.cliente || order.customer_name || '';
        const normalizedCliente = normalizeText(clienteName);
        const idStr = String(order.id ?? '');
        const numeroStr = order.numero ? String(order.numero) : '';
        const numeroStrNoZeros = numeroStr.replace(/^0+/, '');

        const matches = (
          (normalizedTerm.length > 0 && normalizedCliente.includes(normalizedTerm)) ||
          (termDigits.length > 0 &&
            (idStr.includes(termDigits) ||
              numeroStr.includes(termDigits) ||
              numeroStrNoZeros.includes(termDigits)))
        );
        return matches;
      });
      // Debug: log apenas em desenvolvimento
      if (import.meta.env.DEV && beforeCount > 0) {
        logger.debug(`[OrderList] Busca "${activeSearchTerm}": ${beforeCount} -> ${filtered.length} pedidos`);
      }
    }

    // Se não estamos usando paginação do backend, aplicar todos os filtros localmente
    if (!isBackendPaginated) {
      if (dateFrom || dateTo) {
        const startDate = dateFrom ? new Date(dateFrom) : null;
        const endDate = dateTo ? new Date(dateTo) : null;
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        filtered = filtered.filter((order) => {
          if (!order.data_entrega) return false;
          const deliveryDate = new Date(order.data_entrega);
          if (Number.isNaN(deliveryDate.getTime())) return false;
          if (startDate && deliveryDate < startDate) return false;
          if (endDate && deliveryDate > endDate) return false;
          return true;
        });
      }

      // Filtro por status de produção
      if (productionStatusFilter === 'pending') {
        filtered = filtered.filter(order => !order.pronto);
      } else if (productionStatusFilter === 'ready') {
        filtered = filtered.filter(order => order.pronto);
      }
    }

    // Filtros avançados (sempre aplicados, pois não estão disponíveis no backend)
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

    // Filtro por forma de envio
    if (selectedFormaEnvio) {
      filtered = filtered.filter((order) => {
        return order.forma_envio === selectedFormaEnvio;
      });
    }

    // Ordenação (sempre aplicada localmente para consistência)
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
    } else if (isAdmin) {
      // Ordenação padrão para admin: Pedidos não financeiros primeiro, depois Prioridade ALTA, depois ID desc
      filtered = [...filtered].sort((a, b) => {
        // 1. Financeiro (false primeiro)
        if (a.financeiro !== b.financeiro) {
          return a.financeiro ? 1 : -1;
        }
        // 2. Prioridade (ALTA primeiro)
        if (a.prioridade !== b.prioridade) {
          return a.prioridade === 'ALTA' ? -1 : 1;
        }
        // 3. ID (descendente)
        return (b.id || 0) - (a.id || 0);
      });
    }

    logger.debug('[OrderList] filteredOrders - resultado final length:', filtered.length);
    return filtered;
  }, [orders, activeSearchTerm, productionStatusFilter, dateFrom, dateTo, selectedStatuses, selectedVendedor, selectedDesigner, selectedCidade, selectedFormaEnvio, sortColumn, sortDirection, isBackendPaginated]);

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
    const maxPage = isBackendPaginated ? totalPages - 1 : totalPagesFiltered - 1;
    if (page > maxPage) {
      setPage(Math.max(0, maxPage));
    }
  }, [totalPages, totalPagesFiltered, page, dateFrom, dateTo, productionStatusFilter, isBackendPaginated]);

  // Para pedidos com filtros de data, pendentes, prontos e 'all' com paginação, usar dados do backend
  // A paginação já foi feita no backend, então retornar os pedidos diretamente
  const paginatedOrders = useMemo(() => {
    logger.debug('[OrderList] paginatedOrders - orders.length:', orders.length);
    logger.debug('[OrderList] paginatedOrders - filteredOrders.length:', filteredOrders.length);
    logger.debug('[OrderList] paginatedOrders - isBackendPaginated:', isBackendPaginated);
    logger.debug('[OrderList] paginatedOrders - page:', page, 'rowsPerPage:', rowsPerPage);

    if (isBackendPaginated) {
      // Mesmo com paginação do backend, aplicar ordenação local se houver
      if (sortColumn) {
        let sorted = [...orders];
        sorted = sorted.sort((a, b) => {
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
        const result = sorted;
        logger.debug('[OrderList] paginatedOrders - resultado (backend com sort):', result.length);
        return result;
      }

      if (isAdmin) {
        // Ordenação padrão para admin na página atual do backend
        const result = [...orders].sort((a, b) => {
          // 1. Financeiro (false primeiro)
          if (a.financeiro !== b.financeiro) {
            return a.financeiro ? 1 : -1;
          }
          // 2. Prioridade (ALTA primeiro)
          if (a.prioridade !== b.prioridade) {
            return a.prioridade === 'ALTA' ? -1 : 1;
          }
          // 3. ID (descendente)
          return (b.id || 0) - (a.id || 0);
        });
        logger.debug('[OrderList] paginatedOrders - resultado (backend com priority sort):', result.length);
        return result;
      }

      const result = orders; // orders já vem paginado do backend
      logger.debug('[OrderList] paginatedOrders - resultado (backend):', result.length);
      return result;
    }
    // Paginação local (permite filtros avançados funcionarem em pending/ready/all quando necessário)
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const result = filteredOrders.slice(startIndex, endIndex);
    logger.debug('[OrderList] paginatedOrders - resultado (frontend):', result.length, 'slice:', startIndex, '-', endIndex);
    return result;
  }, [orders, filteredOrders, page, rowsPerPage, isBackendPaginated, sortColumn, sortDirection]);

  // Handlers para painel lateral - DESABILITADO
  // const handleOpenContextPanel = (order: OrderWithItems) => {
  //   setSelectedOrder(order);
  //   setContextPanelOpen(true);
  //   const index = paginatedOrders.findIndex(o => o.id === order.id);
  //   if (index >= 0) {
  //     setSelectedOrderIndex(index);
  //   }
  // };

  // const handleCloseContextPanel = () => {
  //   setContextPanelOpen(false);
  //   setSelectedOrderIndex(null);
  // };

  // Navegação por teclado (setas) - DESABILITADO (painel lateral desabilitado)
  // const handleNavigateUp = useCallback(() => {
  //   if (paginatedOrders.length === 0) return;
  //   
  //   const currentIndex = selectedOrderIndex ?? 0;
  //   const newIndex = currentIndex > 0 ? currentIndex - 1 : paginatedOrders.length - 1;
  //   setSelectedOrderIndex(newIndex);
  //   
  //   const order = paginatedOrders[newIndex];
  //   if (order) {
  //     setSelectedOrder(order);
  //     setContextPanelOpen(true);
  //   }
  // }, [paginatedOrders, selectedOrderIndex]);

  // const handleNavigateDown = useCallback(() => {
  //   if (paginatedOrders.length === 0) return;
  //   
  //   const currentIndex = selectedOrderIndex ?? -1;
  //   const newIndex = currentIndex < paginatedOrders.length - 1 ? currentIndex + 1 : 0;
  //   setSelectedOrderIndex(newIndex);
  //   
  //   const order = paginatedOrders[newIndex];
  //   if (order) {
  //     setSelectedOrder(order);
  //     setContextPanelOpen(true);
  //   }
  // }, [paginatedOrders, selectedOrderIndex]);
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

  const printSelectedOrders = async (ordersToPrint: OrderWithItems[]) => {
    try {
      logger.info(`[OrderList] Iniciando impressão em lote para ${ordersToPrint.length} pedidos`);
      setIsBulkGenerating(true);
      toast({
        title: "Preparando impressão",
        description: "Gerando preview dos pedidos selecionados...",
      });

      const { blob, filename } = await generateMultipleOrdersPdfBlob(ordersToPrint);

      setBulkPdfBlob(blob);
      setBulkPdfFilename(filename);
      setIsBulkPreviewOpen(true);

      toast({
        title: "Preview gerado",
        description: "A pré-visualização está pronta.",
      });
    } catch (error) {
      logger.error('Erro ao gerar preview em lote:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a pré-visualização.",
        variant: "destructive",
      });
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Atalhos de teclado - precisa estar depois de todos os handlers
  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    {
      key: 'n',
      ctrl: true,
      action: () => navigate('/dashboard/pedido/novo'),
      description: 'Novo pedido',
    },
    {
      key: 'f',
      ctrl: true,
      action: () => searchInputRef.current?.focus(),
      description: 'Focar busca',
    },
    {
      key: '/',
      action: () => searchInputRef.current?.focus(),
      description: 'Focar busca',
    },
    // Navegação por setas desabilitada (painel lateral desabilitado)
    // {
    //   key: 'ArrowUp',
    //   action: handleNavigateUp,
    //   description: 'Navegar para cima',
    //   enabled: !viewModalOpen && !editDialogOpen && !deleteDialogOpen,
    // },
    // {
    //   key: 'ArrowDown',
    //   action: handleNavigateDown,
    //   description: 'Navegar para baixo',
    //   enabled: !viewModalOpen && !editDialogOpen && !deleteDialogOpen,
    // },
    {
      key: 'e',
      action: () => {
        if (selectedOrder) {
          handleEdit(selectedOrder);
        }
      },
      description: 'Editar pedido',
      enabled: selectedOrder !== null,
    },
    {
      key: 'd',
      action: () => {
        if (selectedOrder && isAdmin) {
          handleDeleteClick(selectedOrder.id);
        }
      },
      description: 'Deletar pedido',
      enabled: selectedOrder !== null && isAdmin,
    },
    {
      key: 'p',
      action: () => {
        if (selectedOrder) {
          setSelectedOrderIdsForPrint([selectedOrder.id]);
          setTimeout(() => handlePrintSelected(), 100);
        }
      },
      description: 'Imprimir ficha',
      enabled: selectedOrder !== null,
    },
    {
      key: 'Escape',
      action: () => {
        // Painel lateral desabilitado
        // if (contextPanelOpen) {
        //   handleCloseContextPanel();
        // } else 
        if (viewModalOpen) {
          setViewModalOpen(false);
        } else if (deleteDialogOpen) {
          setDeleteDialogOpen(false);
        }
      },
      description: 'Fechar modal',
    },
  ], [
    navigate,
    // handleNavigateUp, // Painel lateral desabilitado
    // handleNavigateDown, // Painel lateral desabilitado
    selectedOrder,
    viewModalOpen,
    editDialogOpen,
    deleteDialogOpen,
    // contextPanelOpen, // Painel lateral desabilitado
    isAdmin,
    handleEdit,
    handleDeleteClick,
    // handleCloseContextPanel, // Painel lateral desabilitado
    handlePrintSelected,
    setSelectedOrderIdsForPrint,
  ]);

  useKeyboardShortcuts(shortcuts);

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
      logger.warn('⚠️ Campo financeiro está no payload mesmo não sendo alterado!', payload);
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
      if (import.meta.env.DEV) {
        logger.error('Error updating status:', error);
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

  // Se estiver no modo pipeline, renderizar layout de fluxo de produção

  // Modo tabela - layout original
  return (
    <>
      <div className={`flex flex-col h-full ${viewMode === 'pipeline' ? 'w-full overflow-hidden bg-background/50 animate-in fade-in duration-500' : 'space-y-4 min-h-screen'}`}>
        {viewMode === 'pipeline' ? (
          <>
            {/* Header minimalista com Glassmorphism */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 gap-4 border-b border-border/40 bg-background/40 backdrop-blur-md sticky top-0 z-20">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  Status de Produção — Visão em Pipeline
                </h1>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider pl-3">Fluxo Linear e Sequencial</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 flex-1 md:flex-initial">
                  <div className="relative group flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Pesquisar no pipeline..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                      className="pl-9 h-9 text-xs bg-muted/30 border-border/40 focus:bg-background transition-all"
                    />
                  </div>
                  <Select
                    value={productionStatusFilter}
                    onValueChange={(value) => setProductionStatusFilter(value as any)}
                  >
                    <SelectTrigger className="h-9 text-xs w-[130px] bg-muted/30 border-border/40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="ready">Prontos</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-6 w-px bg-border/40 mx-1 hidden sm:block" />

                {/* Alternância de Visualização - Apenas para Admins */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-lg border border-border/40 shadow-inner">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="h-7 px-2.5 text-xs transition-all text-muted-foreground hover:text-foreground hover:bg-background/50"
                    >
                      <Table2 className="h-3.5 w-3.5 mr-1.5" />
                      Tabela
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setViewMode('pipeline')}
                      className="h-7 px-2.5 text-xs transition-all bg-background shadow-sm text-primary"
                    >
                      <div className="flex flex-row gap-0.5 items-center mr-1.5 grayscale opacity-50">
                        <div className="h-2 w-2 rounded-full bg-current" />
                        <ChevronRight className="h-2 w-2" />
                        <div className="h-2 w-2 rounded-full bg-current" />
                      </div>
                      Pipeline
                    </Button>
                  </div>
                )}

                <Button
                  size="sm"
                  className="h-9 px-4 text-xs font-semibold gap-2 shadow-sm shadow-primary/20"
                  onClick={() => navigate('/dashboard/pedido/novo')}
                >
                  <FileText className="h-4 w-4" />
                  Novo Pedido
                </Button>
              </div>
            </div>

            {/* Área do Pipeline - ocupa todo o espaço restante sem scroll externo */}
            <div className="flex-1 overflow-hidden p-6 bg-muted/5">
              <OrderProductionPipeline
                orders={filteredOrders}
                onStatusChange={handleKanbanStatusChange}
                onEdit={handleEdit}
                onViewOrder={handleViewOrder}
                onDelete={handleDeleteClick}
                onDuplicate={handleDuplicateClick}
                isAdmin={isAdmin}
                loading={loading}
              />
            </div>
          </>
        ) : (
          <>
            {/* Header com alternância de visualização */}
            <div className="flex items-center justify-between py-2 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestão de Pedidos</h1>
                <p className="text-sm text-muted-foreground">Visualize e gerencie todos os pedidos do sistema</p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50 shadow-sm">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 px-3 bg-background shadow-sm text-primary"
                  >
                    <Table2 className="h-4 w-4 mr-2" />
                    Tabela
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('pipeline')}
                    className="h-8 px-3 text-muted-foreground hover:text-foreground"
                  >
                    <div className="flex flex-row gap-0.5 items-center mr-1.5 grayscale opacity-50">
                      <div className="h-2 w-2 rounded-full bg-current" />
                      <ChevronRight className="h-2 w-2" />
                      <div className="h-2 w-2 rounded-full bg-current" />
                    </div>
                    Pipeline
                  </Button>
                </div>
              )}
            </div>
            {/* Barra de Filtros Principais - Sempre Visível */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  {/* Linha 1: Busca e Status */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Busca - Prioridade 1 */}
                    <div className="flex-1 flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nome do cliente, ID ou número do pedido"
                          ref={searchInputRef}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSearch();
                            }
                          }}
                          className="pl-10 h-10"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSearch}
                        className="h-10 px-4 whitespace-nowrap"
                        variant="default"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Buscar
                      </Button>
                    </div>

                    {/* Status - Prioridade 1 */}
                    <div className="w-full sm:w-[180px]">
                      <Select
                        value={productionStatusFilter}
                        onValueChange={(value) =>
                          setProductionStatusFilter(value as 'all' | 'pending' | 'ready')
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Status de produção" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendentes (não prontos)</SelectItem>
                          <SelectItem value="ready">Prontos para entrega</SelectItem>
                          <SelectItem value="all">Todos os pedidos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Data de Entrega - Prioridade 1 */}
                    <div className="flex gap-2 flex-1 sm:flex-initial">
                      <div className="flex-1 sm:w-[160px] relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          placeholder="Data inicial de entrega"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="pl-10 h-10"
                          title="Data inicial de entrega"
                        />
                      </div>
                      <div className="flex-1 sm:w-[160px] relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          placeholder="Data final de entrega"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="pl-10 h-10"
                          title="Data final de entrega"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Linha 2: Filtros Ativos e Controles - Sempre visível quando há filtros */}
                  {activeFiltersList.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Mostrando:</span>
                          {activeFiltersList.map((filter, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="gap-1.5 px-2.5 py-1 text-sm font-medium"
                            >
                              <span>{filter.label}</span>
                              <button
                                onClick={filter.onRemove}
                                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5 transition-colors"
                                aria-label={`Remover filtro ${filter.label}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-8 gap-1.5 font-medium"
                      >
                        <X className="h-3.5 w-3.5" />
                        Limpar todos os filtros
                      </Button>
                    </div>
                  )}

                  {/* Indicador quando não há filtros */}
                  {activeFiltersList.length === 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        Use os filtros acima para buscar pedidos. Todos os filtros são aplicados instantaneamente.
                      </p>
                    </div>
                  )}

                  {/* Linha 3: Filtros Avançados (Colapsáveis) */}
                  <div className="border-t pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
                      className="w-full justify-between h-9"
                    >
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtros Adicionais
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </span>
                      {advancedFiltersOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>

                    {advancedFiltersOpen && (
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Status de Produção */}
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Status de Produção</Label>
                            <div className="grid grid-cols-2 gap-2">
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

                          {/* Filtros Secundários */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="vendedor-filter" className="text-sm font-semibold">Vendedor</Label>
                              <Select
                                value={selectedVendedor || "all"}
                                onValueChange={(value) => setSelectedVendedor(value === "all" ? "" : value)}
                              >
                                <SelectTrigger id="vendedor-filter" className="h-9">
                                  <SelectValue placeholder="Todos os vendedores" />
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
                              <Label htmlFor="designer-filter" className="text-sm font-semibold">Designer</Label>
                              <Select
                                value={selectedDesigner || "all"}
                                onValueChange={(value) => setSelectedDesigner(value === "all" ? "" : value)}
                              >
                                <SelectTrigger id="designer-filter" className="h-9">
                                  <SelectValue placeholder="Todos os designers" />
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
                              <Label htmlFor="cidade-filter" className="text-sm font-semibold">Cidade</Label>
                              <Select
                                value={selectedCidade || "all"}
                                onValueChange={(value) => setSelectedCidade(value === "all" ? "" : value)}
                              >
                                <SelectTrigger id="cidade-filter" className="h-9">
                                  <SelectValue placeholder="Todas as cidades" />
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

                            <div className="space-y-2">
                              <Label htmlFor="forma-envio-filter" className="text-sm font-semibold">Forma de Envio</Label>
                              <Select
                                value={selectedFormaEnvio || "all"}
                                onValueChange={(value) => setSelectedFormaEnvio(value === "all" ? "" : value)}
                              >
                                <SelectTrigger id="forma-envio-filter" className="h-9">
                                  <SelectValue placeholder="Todas as formas de envio" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas</SelectItem>
                                  {formasEnvio.filter(f => f.nome).map((forma) => (
                                    <SelectItem key={forma.id} value={forma.nome}>
                                      {forma.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Barra de Seleção de Pedidos para Impressão */}
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
                    disabled={isBulkGenerating}
                  >
                    <Printer className={`h-4 w-4 mr-1 ${isBulkGenerating ? 'animate-pulse' : ''}`} />
                    {isBulkGenerating ? 'Gerando...' : 'Imprimir Selecionados'}
                  </Button>
                </div>
              </div>
            )}

            <Card className="flex-1 flex flex-col min-h-0 flex-grow">
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 min-h-0 overflow-x-auto relative">
                  {/* Indicador de loading sutil */}
                  {loading && paginatedOrders.length > 0 && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 z-20 overflow-hidden">
                      <div className="h-full bg-primary animate-pulse" style={{ width: '40%', animation: 'loading 1.5s ease-in-out infinite' }} />
                    </div>
                  )}

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
                            className="w-[50px] min-w-[50px] lg:w-[65px] lg:min-w-[65px] xl:w-[75px] xl:min-w-[75px] hd:w-[90px] hd:min-w-[90px] sticky left-[35px] lg:left-[40px] xl:left-[45px] hd:left-[45px] z-10 bg-background border-r cursor-pointer hover:bg-muted/50 transition-colors px-1 lg:px-2"
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
                            className="hidden sm:table-cell min-w-[85px] max-w-[100px] lg:min-w-[110px] lg:max-w-[130px] xl:min-w-[120px] xl:max-w-[140px] cursor-pointer hover:bg-muted/50 transition-colors px-1 lg:px-2 xl:px-3"
                            onClick={() => handleSort('data_entrega')}
                          >
                            <div className="flex items-center text-[10px] sm:text-xs lg:text-sm xl:text-base">
                              Data Entrega
                              {getSortIcon('data_entrega')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="hidden md:table-cell min-w-[70px] max-w-[85px] lg:min-w-[90px] lg:max-w-[110px] xl:min-w-[100px] xl:max-w-[120px] cursor-pointer hover:bg-muted/50 transition-colors px-1 lg:px-2 xl:px-3"
                            onClick={() => handleSort('prioridade')}
                          >
                            <div className="flex items-center text-[10px] sm:text-xs lg:text-sm xl:text-base">
                              Prioridade
                              {getSortIcon('prioridade')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="hidden hd:table-cell min-w-[100px] max-w-[130px] lg:min-w-[130px] lg:max-w-[160px] xl:min-w-[150px] xl:max-w-[180px] cursor-pointer hover:bg-muted/50 transition-colors px-1 lg:px-2 xl:px-3"
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
                          <TableHead className="hidden sm:table-cell text-center whitespace-nowrap min-w-[75px] max-w-[90px] lg:min-w-[100px] lg:max-w-[120px] xl:min-w-[110px] xl:max-w-[130px] px-1 lg:px-2 xl:px-3 text-[10px] sm:text-xs lg:text-sm xl:text-base">Status</TableHead>
                          <TableHead className="text-right whitespace-nowrap sticky right-0 z-10 bg-background border-l min-w-[110px] max-w-[130px] lg:min-w-[140px] lg:max-w-[160px] xl:min-w-[160px] xl:max-w-[180px] hd:min-w-[190px] hd:max-w-[210px] px-1 lg:px-2 xl:px-3 text-[10px] sm:text-xs lg:text-sm xl:text-base">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading && paginatedOrders.length === 0 ? (
                          <>
                            {Array.from({ length: 5 }).map((_, index) => (
                              <TableRow key={`skeleton-${index}`}>
                                <TableCell className="sticky left-0 z-10 bg-background border-r px-1 lg:px-2">
                                  <Skeleton className="h-4 w-4" />
                                </TableCell>
                                <TableCell className="sticky left-[35px] lg:left-[40px] xl:left-[45px] hd:left-[45px] z-10 bg-background border-r w-[50px] min-w-[50px] lg:w-[65px] lg:min-w-[65px] xl:w-[75px] xl:min-w-[75px] hd:w-[90px] hd:min-w-[90px] px-1 lg:px-2">
                                  <Skeleton className="h-4 w-10 lg:w-12 xl:w-14 hd:w-16" />
                                </TableCell>
                                <TableCell className="min-w-[130px] max-w-[200px] lg:min-w-[180px] lg:max-w-[250px] xl:min-w-[220px] xl:max-w-[300px] px-2 lg:px-3 xl:px-4">
                                  <Skeleton className="h-4 w-24 lg:w-32" />
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Skeleton className="h-4 w-24" />
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Skeleton className="h-4 w-20" />
                                </TableCell>
                                <TableCell className="hidden hd:table-cell">
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
                                <TableCell className="hidden sm:table-cell text-center">
                                  <Skeleton className="h-5 w-16 mx-auto" />
                                </TableCell>
                                <TableCell className="text-right sticky right-0 z-10 bg-background border-l min-w-[110px] max-w-[130px] lg:min-w-[140px] lg:max-w-[160px] xl:min-w-[160px] xl:max-w-[180px] hd:min-w-[190px] hd:max-w-[210px] px-1 lg:px-2 xl:px-3">
                                  <div className="flex justify-end gap-2">
                                    <Skeleton className="h-8 w-8" />
                                    <Skeleton className="h-8 w-8" />
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
                            const urgency = getOrderUrgency(order.data_entrega);
                            const isOverdue = urgency.type === 'overdue';
                            const isUrgent = urgency.type === 'today' || urgency.type === 'tomorrow';
                            const isHighPriority = order.prioridade === 'ALTA';
                            const isDelayed = isOverdue && !order.pronto;

                            // Classe base da linha com destaque visual baseado em urgência e prioridade
                            const rowClassName = `
                      hover:bg-muted/50 transition-all duration-200
                      ${isDelayed ? 'bg-red-50/50 dark:bg-red-950/20 border-l-4 border-l-red-500' : ''}
                      ${isOverdue && order.pronto ? 'bg-orange-50/30 dark:bg-orange-950/10 border-l-2 border-l-orange-400' : ''}
                      ${isUrgent && !isOverdue && !order.pronto ? 'bg-yellow-50/40 dark:bg-yellow-950/15 border-l-2 border-l-yellow-400' : ''}
                      ${isHighPriority && !isDelayed && !isUrgent ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}
                    `.trim().replace(/\s+/g, ' ');

                            return (
                              <TableRow
                                key={order.id}
                                className={rowClassName}
                                data-overdue={isDelayed}
                                data-urgent={isUrgent}
                                data-priority={order.prioridade}
                              >
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
                                <TableCell className="font-mono font-medium whitespace-nowrap sticky left-[35px] lg:left-[40px] xl:left-[45px] hd:left-[45px] z-10 bg-background border-r w-[50px] min-w-[50px] lg:w-[65px] lg:min-w-[65px] xl:w-[75px] xl:min-w-[75px] hd:w-[90px] hd:min-w-[90px] px-1 lg:px-2 text-[10px] sm:text-xs lg:text-sm xl:text-base">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1 lg:gap-2">
                                      #{formatOrderNumber(order.numero, order.id)}
                                      <EditingIndicator orderId={order.id} />
                                    </div>
                                    {isReplacementOrder(order) && (
                                      <Badge variant="outline" className="text-[8px] lg:text-[9px] px-1 py-0 h-4 bg-orange-50 text-orange-700 border-orange-300 w-fit">
                                        REPOSIÇÃO
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className={`
                          font-medium min-w-[130px] max-w-[200px] lg:min-w-[180px] lg:max-w-[250px] xl:min-w-[220px] xl:max-w-[300px] truncate px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base
                          ${isDelayed ? 'font-semibold' : ''}
                          ${isUrgent && !order.pronto ? 'font-semibold' : ''}
                        `}>
                                  {order.cliente || order.customer_name}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell whitespace-nowrap min-w-[85px] max-w-[100px] lg:min-w-[110px] lg:max-w-[130px] xl:min-w-[120px] xl:max-w-[140px] px-1 lg:px-2 xl:px-3 text-[10px] sm:text-xs lg:text-sm xl:text-base">
                                  <div className="flex items-center gap-1.5">
                                    {urgency.type === 'overdue' && (
                                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" aria-hidden="true" />
                                    )}
                                    {urgency.type === 'today' && (
                                      <Clock className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" aria-hidden="true" />
                                    )}
                                    {urgency.type === 'tomorrow' && (
                                      <Clock className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" aria-hidden="true" />
                                    )}
                                    <span className={`
                              font-medium
                              ${urgency.type === 'overdue' ? 'text-red-600 dark:text-red-400' : ''}
                              ${urgency.type === 'today' ? 'text-orange-600 dark:text-orange-400' : ''}
                              ${urgency.type === 'tomorrow' ? 'text-yellow-600 dark:text-yellow-500' : ''}
                              ${urgency.type === 'soon' ? 'text-amber-600 dark:text-amber-400' : ''}
                            `}>
                                      {formatDateForDisplay(order.data_entrega, '-')}
                                    </span>
                                    {urgency.type === 'overdue' && (
                                      <span className="text-[9px] lg:text-[10px] font-semibold text-red-600 dark:text-red-400" title={`Atrasado há ${urgency.days} dia(s)`}>
                                        ({urgency.days}d)
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell whitespace-nowrap min-w-[70px] max-w-[85px] lg:min-w-[90px] lg:max-w-[110px] xl:min-w-[100px] xl:max-w-[120px] px-1 lg:px-2 xl:px-3">
                                  <Badge
                                    variant={order.prioridade === 'ALTA' ? 'destructive' : 'secondary'}
                                    className={`
                              text-[10px] lg:text-xs xl:text-sm px-1.5 py-0 lg:px-2 lg:py-0.5 font-semibold
                              ${order.prioridade === 'ALTA' ? 'animate-pulse' : ''}
                              ${order.prioridade === 'ALTA' && isDelayed ? 'ring-2 ring-red-400 ring-offset-1' : ''}
                            `}
                                  >
                                    {order.prioridade || 'NORMAL'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden hd:table-cell min-w-[100px] max-w-[130px] lg:min-w-[130px] lg:max-w-[160px] xl:min-w-[150px] xl:max-w-[180px] truncate px-1 lg:px-2 xl:px-3 text-[10px] sm:text-xs lg:text-sm xl:text-base">
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
                                            className={`
                                      transition-all duration-150
                                      ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}
                                      ${order.financeiro ? "scale-110" : ""}
                                    `}
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
                                    className="transition-all duration-150 data-[state=checked]:scale-110"
                                  />
                                </TableCell>

                                {/* Sublimação - Só habilitado se Financeiro estiver marcado */}
                                <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2">
                                  <Checkbox
                                    checked={order.sublimacao === true}
                                    disabled={!order.financeiro}
                                    onCheckedChange={() => handleStatusClick(order.id, 'sublimacao', !!order.sublimacao, 'Sublimação')}
                                    className="transition-all duration-150 data-[state=checked]:scale-110"
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
                                    className="transition-all duration-150 data-[state=checked]:scale-110"
                                  />
                                </TableCell>

                                {/* Expedição - Só habilitado se Financeiro estiver marcado */}
                                <TableCell className="text-center whitespace-nowrap px-0 lg:px-1 xl:px-2">
                                  <Checkbox
                                    checked={order.expedicao === true}
                                    disabled={!order.financeiro}
                                    onCheckedChange={() => handleStatusClick(order.id, 'expedicao', !!order.expedicao, 'Expedição')}
                                    className="transition-all duration-150 data-[state=checked]:scale-110"
                                  />
                                </TableCell>

                                {/* Status (Pronto / Em andamento) - Campo calculado automaticamente */}
                                <TableCell className="hidden sm:table-cell text-center whitespace-nowrap min-w-[75px] max-w-[90px] lg:min-w-[100px] lg:max-w-[120px] xl:min-w-[110px] xl:max-w-[130px] px-1 lg:px-2 xl:px-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {order.pronto && (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" aria-hidden="true" />
                                    )}
                                    <Badge
                                      variant={order.pronto ? 'success' : isDelayed ? 'destructive' : 'secondary'}
                                      className={`
                                text-[10px] lg:text-xs xl:text-sm px-1.5 py-0 lg:px-2 lg:py-0.5 font-semibold
                                ${order.pronto ? '' : isDelayed ? 'animate-pulse' : ''}
                              `}
                                    >
                                      {order.pronto ? 'Pronto' : isDelayed ? 'Atrasado' : 'Em Andamento'}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap sticky right-0 z-10 bg-background border-l min-w-[110px] max-w-[130px] lg:min-w-[140px] lg:max-w-[160px] xl:min-w-[160px] xl:max-w-[180px] hd:min-w-[190px] hd:max-w-[210px] px-1 lg:px-2 xl:px-3">
                                  <div className="flex justify-end gap-0.5 lg:gap-1 xl:gap-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleQuickShare(order)}
                                            className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                                            title="Ação Rápida: Copiar itens para WhatsApp"
                                          >
                                            <Camera className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar itens do pedido para WhatsApp</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(order);
                                      }}
                                      className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                                    >
                                      <Edit className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                                    </Button>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDuplicateClick(order);
                                            }}
                                            className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                                            title="Duplicar pedido"
                                          >
                                            <Copy className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Duplicar pedido</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCreateReplacementClick(order);
                                            }}
                                            className="h-6 w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8"
                                            title="Criar ficha de reposição"
                                          >
                                            <RefreshCw className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Criar ficha de reposição</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {isAdmin && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteClick(order.id);
                                        }}
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
                      onValueChange={(value) => {
                        setRowsPerPage(Number(value));
                        setPage(0); // Resetar para primeira página ao mudar tamanho
                      }}
                    >
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue placeholder="Itens por página" />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100, 500].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size === 500 ? 'Todos' : `${size} por página`}
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
                          length: isBackendPaginated ? totalPages : totalPagesFiltered
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
                          const maxPage = isBackendPaginated ? totalPages - 1 : totalPagesFiltered - 1;
                          setPage(Math.min(maxPage, page + 1));
                        }}
                        disabled={
                          isBackendPaginated ? page >= totalPages - 1 : page >= totalPagesFiltered - 1
                        }
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
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

        {/* Modal de Duplicação */}
        <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicar Pedido</DialogTitle>
              <DialogDescription>
                Configure as datas para o novo pedido duplicado do pedido #{orderToDuplicate?.numero || orderToDuplicate?.id}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="duplicate-data-entrada">Data de Entrada *</Label>
                <Input
                  id="duplicate-data-entrada"
                  type="date"
                  value={duplicateDataEntrada}
                  onChange={(e) => handleDuplicateDateChange('entrada', e.target.value)}
                  className={duplicateDateError ? 'border-destructive' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duplicate-data-entrega">Data de Entrega (Opcional)</Label>
                <Input
                  id="duplicate-data-entrega"
                  type="date"
                  value={duplicateDataEntrega}
                  onChange={(e) => handleDuplicateDateChange('entrega', e.target.value)}
                  className={duplicateDateError ? 'border-destructive' : ''}
                />
                {duplicateDateError && (
                  <p className="text-sm text-destructive mt-1">{duplicateDateError}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDuplicateDialogOpen(false);
                setOrderToDuplicate(null);
                setDuplicateDataEntrada('');
                setDuplicateDataEntrega('');
                setDuplicateDateError(null);
              }}>
                Cancelar
              </Button>
              <Button
                onClick={handleDuplicateConfirm}
                disabled={!!duplicateDateError || !duplicateDataEntrada}
              >
                Duplicar Pedido
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

        {/* Modal de Opções de Reposição */}
        <Dialog open={replacementDialogOpen} onOpenChange={setReplacementDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Opções de Reposição</DialogTitle>
              <DialogDescription>
                Selecione como deseja gerar a ficha de reposição para o pedido #{orderToReplace?.numero || orderToReplace?.id}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-4">
              <Button
                variant="outline"
                className="flex flex-col items-start h-auto p-4 gap-1 text-left hover:bg-muted"
                onClick={() => handleReplacementConfirm(false)}
              >
                <span className="font-semibold">Com Valores Originais</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Copia todos os preços dos itens e o valor do frete do pedido original.
                </span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-start h-auto p-4 gap-1 text-left border-orange-200 hover:bg-orange-50 hover:border-orange-300 dark:border-orange-900/30 dark:hover:bg-orange-950/20"
                onClick={() => handleReplacementConfirm(true)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-orange-700 dark:text-orange-400">Zerar Valores (Cortesia)</span>
                  <Badge variant="outline" className="text-[10px] h-4 bg-orange-100/50 text-orange-700 border-orange-200">RECOMENDADO</Badge>
                </div>
                <span className="text-xs text-muted-foreground font-normal">
                  Zera todos os preços unitários e o frete. Ideal para casos de erro na produção ou garantia.
                </span>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setReplacementDialogOpen(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <OrderViewModal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          order={selectedOrderForView}
        />

        <PrintPreviewModal
          isOpen={isBulkPreviewOpen}
          onClose={() => setIsBulkPreviewOpen(false)}
          pdfBlob={bulkPdfBlob}
          filename={bulkPdfFilename}
          title="Pré-visualização - Impressão em Lote"
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

        {/* Painel Lateral de Contexto - DESABILITADO */}
        {/* 
      <OrderContextPanel
        order={selectedOrder}
        isOpen={contextPanelOpen}
        onClose={handleCloseContextPanel}
        onEdit={(orderId) => {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            handleEdit(order);
          }
        }}
        onDelete={(orderId) => handleDeleteClick(orderId)}
        onPrint={(orderId) => {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            setSelectedOrderIdsForPrint([orderId]);
            setTimeout(() => handlePrintSelected(), 100);
          }
        }}
        onStatusChange={(orderId, field, value) => {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            const fieldLabels: Record<string, string> = {
              financeiro: 'Financeiro',
              conferencia: 'Conferência',
              sublimacao: 'Sublimação',
              costura: 'Costura',
              expedicao: 'Expedição',
            };
            handleStatusClick(orderId, field, !value, fieldLabels[field] || field);
          }
        }}
        isAdmin={isAdmin}
      />
      */}
      </div>
    </>
  );
}
