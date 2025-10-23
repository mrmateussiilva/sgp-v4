import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, FileText, Printer, Search } from 'lucide-react';
import { api } from '../services/api';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import { OrderWithItems, OrderItem, UpdateOrderStatusRequest, OrderStatus } from '../types';
import { useToast } from '@/hooks/use-toast';
import { AutoRefreshStatus } from './AutoRefreshStatus';
import { useOrderAutoSync } from '../hooks/useOrderEvents';
import { SmoothTableWrapper } from './SmoothTableWrapper';
import { EventTestPanel } from './EventTestPanel';
import OrderDetails from './OrderDetails';
import { OrderViewModal } from './OrderViewModal';
import { OrderQuickEditDialog } from './OrderQuickEditDialog';
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
  const { toast } = useToast();

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

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [productionStatusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadOrders(); // Recarregar pedidos quando o filtro muda (após setPage)
  }, [productionStatusFilter, page, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, rowsPerPage]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Se há filtros de data, usar API de filtros
      if (dateFrom || dateTo) {
        const filters = {
          status: productionStatusFilter === 'all' ? undefined : 
                   productionStatusFilter === 'pending' ? OrderStatus.Pendente : OrderStatus.Concluido,
          cliente: searchTerm || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page: page + 1,
          page_size: rowsPerPage
        };
        
        const paginatedData = await api.getOrdersWithFilters(filters);
        setOrders(paginatedData.orders);
        setTotalPages(paginatedData.total_pages);
        setTotalOrders(paginatedData.total);
      } else {
        // Usar API paginada para pedidos pendentes
        if (productionStatusFilter === 'pending') {
          const paginatedData = await api.getPendingOrdersPaginated(page + 1, rowsPerPage);
          setOrders(paginatedData.orders);
          setTotalPages(paginatedData.total_pages);
          setTotalOrders(paginatedData.total);
        } else if (productionStatusFilter === 'ready') {
          // Usar API paginada para pedidos prontos
          const paginatedData = await api.getReadyOrdersPaginated(page + 1, rowsPerPage);
          setOrders(paginatedData.orders);
          setTotalPages(paginatedData.total_pages);
          setTotalOrders(paginatedData.total);
        } else {
          // Para filtro 'all', usar API completa
          const data = await api.getOrders();
          setOrders(data);
          setTotalPages(Math.ceil(data.length / rowsPerPage) || 1);
          setTotalOrders(data.length);
        }
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      if (isSessionError(message)) {
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive",
        });
        console.error('Session error while loading orders:', error);
        logout();
        navigate('/login', { replace: true });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os pedidos.",
          variant: "destructive",
        });
        console.error('Error loading orders:', error);
      }
    } finally {
      setLoading(false);
    }
  };

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

  const filteredOrders = useMemo(() => {
    // Se há filtros de data, não aplicar filtros adicionais (já filtrado no backend)
    if (dateFrom || dateTo) {
      return orders.filter((order) => {
        const clienteName = order.cliente || order.customer_name || '';
        const matchesSearch =
          searchTerm === '' ||
          clienteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.toString().includes(searchTerm);
        return matchesSearch;
      });
    }
    
    // Para pedidos pendentes e prontos com paginação, não aplicar filtros de status adicionais
    if (productionStatusFilter === 'pending' || productionStatusFilter === 'ready') {
      return orders.filter((order) => {
        const clienteName = order.cliente || order.customer_name || '';
        const matchesSearch =
          searchTerm === '' ||
          clienteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.toString().includes(searchTerm);
        return matchesSearch;
      });
    }
    
    // Para filtro 'all', usar lógica original com todos os filtros
    return orders.filter((order) => {
      const clienteName = order.cliente || order.customer_name || '';
      const matchesSearch =
        searchTerm === '' ||
        clienteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm);
      return matchesSearch;
    });
  }, [orders, searchTerm, productionStatusFilter, dateFrom, dateTo]);

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
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [totalPages, page]);

  // Para pedidos com filtros de data, pendentes e prontos com paginação, usar dados do backend
  // Para filtro 'all' sem filtros de data, usar paginação local
  const paginatedOrders = (dateFrom || dateTo || productionStatusFilter === 'pending' || productionStatusFilter === 'ready')
    ? filteredOrders 
    : filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={selectedOrderIdsForPrint.length === 0}
              onClick={handlePrintSelected}
            >
              <Printer className="h-4 w-4" />
              Imprimir {selectedOrderIdsForPrint.length > 0 && `(${selectedOrderIdsForPrint.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0 flex-grow">
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <SmoothTableWrapper>
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
            </SmoothTableWrapper>
          </div>
        </CardContent>
      </Card>

      {filteredOrders.length > 0 && (
        <div className="w-full bg-background border-t border-border p-4 mt-auto">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-muted-foreground text-center lg:text-left">
              {productionStatusFilter === 'pending' 
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
                  {Array.from({ length: totalPages }).map((_, index) => (
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
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
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
      
      {/* Painel de teste de eventos - Remover em produção */}
      <EventTestPanel />
    </div>
  );
}
