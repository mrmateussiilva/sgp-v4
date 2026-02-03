import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  CheckCircle,
  Clock,
  AlertTriangle,
  Timer,
  Users,
  Calendar,
  Plus,
  Eye,
  Zap,
  FileText,
  Truck,
  Target,
  RefreshCw,
  Search,
  Edit
} from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { OrderWithItems, DashboardSummary } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDateForDisplay } from '@/utils/date';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  urgentOrders: number;
  overdueOrders: number;
  avgProductionTime: number;
  avgDelayTime: number;
  todayOrders: number;
  efficiencyRate: number;
  shippingMethods: Array<{ name: string; count: number; percentage: number }>;
}

interface RecentOrder extends OrderWithItems {
  isOverdue?: boolean;
  daysUntilDelivery?: number;
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { orders, setOrders } = useOrderStore();
  const logout = useAuthStore((state) => state.logout);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // Função para carregar pedidos do servidor
  const loadOrdersFromServer = useCallback(async (showToast = false) => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Carregar o resumo estatístico e os pedidos iniciais em paralelo
      const [summaryResult, initialOrdersResult] = await Promise.all([
        api.getDashboardSummary(),
        api.getOrdersPaginated(1, 100)
      ]);

      setSummary(summaryResult);

      // Carregar até 500 pedidos (5 páginas) para garantir que busca e listagem funcionem como antes
      let allOrders = [...initialOrdersResult.orders];
      let currentPage = 2;
      const pageSize = 100;
      let totalPages = initialOrdersResult.total_pages;

      while (currentPage <= 5 && currentPage <= totalPages) {
        const nextResult = await api.getOrdersPaginated(currentPage, pageSize);
        allOrders = [...allOrders, ...nextResult.orders];
        currentPage++;
      }

      setOrders(allOrders);
      setLastUpdate(new Date());

      if (showToast) {
        toast({
          title: 'Atualizado',
          description: `Dados do dashboard atualizados com sucesso`,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar pedidos:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Erro desconhecido';
      setError(errorMessage);

      // Verificar se é erro de sessão
      if (errorMessage.toLowerCase().includes('sessão') ||
        errorMessage.toLowerCase().includes('token') ||
        error?.response?.status === 401) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'destructive',
        });
        logout();
        navigate('/login', { replace: true });
        return;
      }

      toast({
        title: 'Erro ao carregar dados',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [setOrders, toast, logout, navigate]);

  // Carregar pedidos quando o componente montar
  useEffect(() => {
    loadOrdersFromServer();
  }, [loadOrdersFromServer]);

  // Validar se orders é um array válido
  const validOrders = useMemo(() => {
    if (!Array.isArray(orders)) {
      console.warn('Orders não é um array válido');
      return [];
    }
    return orders;
  }, [orders]);

  // Calcular estatísticas com useMemo para otimização
  const stats = useMemo<DashboardStats>(() => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      if (summary) {
        return {
          totalOrders: summary.total,
          pendingOrders: summary.pendentes,
          completedOrders: summary.concluidos,
          urgentOrders: summary.urgentes,
          overdueOrders: summary.atrasados,
          avgProductionTime: summary.avg_production_time,
          avgDelayTime: summary.avg_delay_time,
          todayOrders: summary.hoje,
          efficiencyRate: summary.efficiency_rate,
          shippingMethods: summary.shipping_methods || [],
        };
      }

      const totalOrders = validOrders.length;
      const pendingOrders = validOrders.filter(order => !order.pronto).length;
      const completedOrders = validOrders.filter(order => order.pronto).length;
      const urgentOrders = validOrders.filter(order => order.prioridade === 'ALTA').length;

      // Calcular pedidos atrasados
      const overdueOrders = validOrders.filter(order => {
        if (order.pronto) return false;
        if (!order.data_entrega) return false;

        // Tratar dataEntrega com cuidado para evitar problemas de fuso horário
        let deliveryDate: Date;
        const dateMatch = order.data_entrega.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [, y, m, d] = dateMatch.map(Number);
          deliveryDate = new Date(y, m - 1, d);
        } else {
          deliveryDate = new Date(order.data_entrega);
        }

        deliveryDate.setHours(0, 0, 0, 0);
        return deliveryDate < today;
      }).length;

      // Calcular tempo médio de produção (apenas pedidos concluídos)
      // CORRIGIDO: Usar updated_at ou data de conclusão real ao invés de new Date()
      const completedOrdersWithDates = validOrders.filter(order => {
        return order.pronto && order.data_entrada && (order.created_at || order.updated_at);
      });

      let totalProductionTime = 0;
      completedOrdersWithDates.forEach(order => {
        const startDate = new Date(order.data_entrada || order.created_at || '');
        // Usar updated_at se disponível, senão usar data atual como fallback
        const endDate = order.updated_at ? new Date(order.updated_at) : new Date();
        const productionDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (productionDays > 0) {
          totalProductionTime += productionDays;
        }
      });

      const avgProductionTime = completedOrdersWithDates.length > 0
        ? Math.round(totalProductionTime / completedOrdersWithDates.length)
        : 0;

      // Calcular tempo médio de atraso
      const overdueOrdersWithDates = validOrders.filter(order => {
        if (order.pronto) return false;
        if (!order.data_entrega) return false;

        // Tratar dataEntrega com cuidado para evitar problemas de fuso horário
        let deliveryDate: Date;
        const dateMatch = order.data_entrega.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [, y, m, d] = dateMatch.map(Number);
          deliveryDate = new Date(y, m - 1, d);
        } else {
          deliveryDate = new Date(order.data_entrega);
        }

        deliveryDate.setHours(0, 0, 0, 0);
        return deliveryDate < today;
      });

      let totalDelayTime = 0;
      overdueOrdersWithDates.forEach(order => {
        if (!order.data_entrega) return;

        // Tratar dataEntrega com cuidado para evitar problemas de fuso horário
        let deliveryDate: Date;
        const dateMatch = order.data_entrega.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [, y, m, d] = dateMatch.map(Number);
          deliveryDate = new Date(y, m - 1, d);
        } else {
          deliveryDate = new Date(order.data_entrega);
        }

        deliveryDate.setHours(0, 0, 0, 0);
        const delayDays = Math.ceil((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
        if (delayDays > 0) {
          totalDelayTime += delayDays;
        }
      });

      const avgDelayTime = overdueOrdersWithDates.length > 0
        ? Math.round(totalDelayTime / overdueOrdersWithDates.length)
        : 0;

      const todayOrders = validOrders.filter(order => {
        const orderDate = order.data_entrada || order.created_at;
        return orderDate && orderDate.startsWith(todayStr);
      }).length;

      // Calcular taxa de eficiência (pedidos no prazo vs total)
      const onTimeOrders = validOrders.filter(order => {
        if (!order.pronto) return false;
        const deliveryDate = order.data_entrega ? new Date(order.data_entrega) : null;
        if (!deliveryDate) return false;
        const completedDate = order.updated_at ? new Date(order.updated_at) : new Date();
        deliveryDate.setHours(23, 59, 59, 999);
        return completedDate <= deliveryDate;
      }).length;

      const efficiencyRate = completedOrders > 0
        ? Math.round((onTimeOrders / completedOrders) * 100)
        : 0;

      // Calcular distribuição por forma de envio
      const shippingCounts: Record<string, number> = {};
      validOrders.forEach(order => {
        const shippingMethod = order.forma_envio || 'Não especificado';
        shippingCounts[shippingMethod] = (shippingCounts[shippingMethod] || 0) + 1;
      });

      const shippingMethods = Object.entries(shippingCounts)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalOrders) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 formas de envio

      return {
        totalOrders,
        pendingOrders,
        completedOrders,
        urgentOrders,
        overdueOrders,
        avgProductionTime,
        avgDelayTime,
        todayOrders,
        efficiencyRate,
        shippingMethods,
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao calcular estatísticas do dashboard',
        variant: 'destructive',
      });
      return {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        urgentOrders: 0,
        overdueOrders: 0,
        avgProductionTime: 0,
        avgDelayTime: 0,
        todayOrders: 0,
        efficiencyRate: 0,
        shippingMethods: [],
      };
    }
  }, [validOrders, summary, toast]);

  // Atualização automática a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrdersFromServer(false); // Não mostrar toast na atualização automática
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [loadOrdersFromServer]);

  // Memoizar funções de formatação
  const formatDays = useCallback((days: number): string => {
    if (days === 1) return '1 dia';
    if (days === 0) return '0 dias';
    return `${days} dias`;
  }, []);

  const getProductionStatus = useCallback((order: OrderWithItems): string => {
    if (order.pronto) return 'Pronto';
    if (order.expedicao) return 'Expedição';
    if (order.costura) return 'Costura';
    if (order.sublimacao) return 'Sublimação';
    if (order.conferencia) return 'Conferência';
    if (order.financeiro) return 'Financeiro';
    return 'Pendente';
  }, []);

  const getProductionStatusColor = useCallback((order: OrderWithItems): string => {
    if (order.pronto) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (order.expedicao) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (order.costura) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    if (order.sublimacao) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    if (order.conferencia) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (order.financeiro) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }, []);

  // Memoizar listas de pedidos com filtro de busca
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return validOrders;
    const term = searchTerm.toLowerCase();
    return validOrders.filter(order => {
      const numero = String(order.numero || order.id || '').toLowerCase();
      const cliente = (order.cliente || order.customer_name || '').toLowerCase();
      return numero.includes(term) || cliente.includes(term);
    });
  }, [validOrders, searchTerm]);

  const recentOrders = useMemo((): RecentOrder[] => {
    return filteredOrders
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.data_entrada || '');
        const dateB = new Date(b.created_at || b.data_entrada || '');
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5)
      .map(order => {
        let deliveryDate: Date | null = null;
        if (order.data_entrega) {
          const dateMatch = order.data_entrega.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            const [, y, m, d] = dateMatch.map(Number);
            deliveryDate = new Date(y, m - 1, d);
          } else {
            deliveryDate = new Date(order.data_entrega);
          }
          deliveryDate.setHours(0, 0, 0, 0);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isOverdue = deliveryDate && deliveryDate < today && !order.pronto;
        const daysUntilDelivery = deliveryDate
          ? Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : undefined;

        return {
          ...order,
          isOverdue: isOverdue ?? undefined,
          daysUntilDelivery,
        };
      });
  }, [filteredOrders]);

  const urgentOrders = useMemo((): RecentOrder[] => {
    return filteredOrders
      .filter(order => order.prioridade === 'ALTA' && !order.pronto)
      .sort((a, b) => {
        const dateA = new Date(a.data_entrega || '');
        const dateB = new Date(b.data_entrega || '');
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5)
      .map(order => ({
        ...order,
        isOverdue: false,
        daysUntilDelivery: undefined,
      }));
  }, [filteredOrders]);

  // Memoizar eficiência por etapa
  const productionEfficiency = useMemo(() => {
    if (summary?.production_efficiency) {
      return summary.production_efficiency;
    }

    const total = Math.max(validOrders.length, 1);
    return {
      financeiro: Math.round((validOrders.filter(o => o.financeiro).length / total) * 100),
      conferencia: Math.round((validOrders.filter(o => o.conferencia).length / total) * 100),
      sublimacao: Math.round((validOrders.filter(o => o.sublimacao).length / total) * 100),
      costura: Math.round((validOrders.filter(o => o.costura).length / total) * 100),
      expedicao: Math.round((validOrders.filter(o => o.expedicao).length / total) * 100),
    };
  }, [validOrders, summary]);

  const handleRefresh = useCallback(() => {
    loadOrdersFromServer(true); // Mostrar toast no refresh manual
  }, [loadOrdersFromServer]);


  const formatLastUpdate = useCallback((date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, []);


  const handleCardClick = useCallback((filterType: 'all' | 'pending' | 'completed' | 'overdue' | 'urgent') => {
    const params = new URLSearchParams();
    switch (filterType) {
      case 'pending':
        params.set('status', 'pending');
        break;
      case 'completed':
        params.set('status', 'ready');
        break;
      case 'overdue':
        params.set('overdue', 'true');
        break;
      case 'urgent':
        params.set('priority', 'ALTA');
        break;
    }
    navigate(`/dashboard/orders?${params.toString()}`);
  }, [navigate]);

  const handleViewOrder = useCallback((order: OrderWithItems) => {
    navigate(`/dashboard/pedido/editar/${order.id}`);
  }, [navigate]);

  const handleEditOrder = useCallback((order: OrderWithItems) => {
    navigate(`/dashboard/pedido/editar/${order.id}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de gerenciamento de pedidos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Última atualização: {formatLastUpdate(lastUpdate)}
            {error && (
              <span className="text-red-500 ml-2">⚠️ Erro ao carregar dados</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            aria-label="Atualizar dashboard"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            onClick={() => navigate('/dashboard/orders/new')}
            aria-label="Criar novo pedido"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Novo Pedido
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/orders')}
            aria-label="Ver todos os pedidos"
          >
            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
            Ver Todos
          </Button>
        </div>
      </div>

      {/* Mensagem de erro se houver */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Erro ao carregar dados
              </p>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadOrdersFromServer(true)}
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      )}

      {/* Busca Rápida */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar pedidos por número ou cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          aria-label="Buscar pedidos"
          noUppercase
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => handleCardClick('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayOrders} pedidos hoje
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => handleCardClick('pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Em produção
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => handleCardClick('completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Prontos para entrega
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => handleCardClick('overdue')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueOrders}</div>
            <p className="text-xs text-muted-foreground">
              Fora do prazo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Methods Distribution */}
      {stats.shippingMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              Formas de Envio
            </CardTitle>
            <CardDescription>
              Distribuição de pedidos por forma de envio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.shippingMethods.map((method) => (
                <div key={method.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{method.name}</span>
                    <span className="text-muted-foreground">
                      {method.count} pedidos ({method.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${method.percentage}%` }}
                      role="progressbar"
                      aria-valuenow={method.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time-based Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Produção</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatDays(stats.avgProductionTime)}</div>
            <p className="text-xs text-muted-foreground">
              Do início ao fim
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atraso Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatDays(stats.avgDelayTime)}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos atrasados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Eficiência</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.efficiencyRate}%</div>
            <p className="text-xs text-muted-foreground">
              Entregas no prazo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Production Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Eficiência por Etapa de Produção
          </CardTitle>
          <CardDescription>
            Progresso médio dos pedidos por etapa de produção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{productionEfficiency.financeiro}%</div>
              <div className="text-sm text-muted-foreground">Financeiro</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-gray-600 dark:bg-gray-500 h-2 rounded-full transition-all"
                  style={{ width: `${productionEfficiency.financeiro}%` }}
                  role="progressbar"
                  aria-valuenow={productionEfficiency.financeiro}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{productionEfficiency.conferencia}%</div>
              <div className="text-sm text-muted-foreground">Conferência</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-yellow-600 dark:bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${productionEfficiency.conferencia}%` }}
                  role="progressbar"
                  aria-valuenow={productionEfficiency.conferencia}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">{productionEfficiency.sublimacao}%</div>
              <div className="text-sm text-muted-foreground">Sublimação</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${productionEfficiency.sublimacao}%` }}
                  role="progressbar"
                  aria-valuenow={productionEfficiency.sublimacao}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-500">{productionEfficiency.costura}%</div>
              <div className="text-sm text-muted-foreground">Costura</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${productionEfficiency.costura}%` }}
                  role="progressbar"
                  aria-valuenow={productionEfficiency.costura}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{productionEfficiency.expedicao}%</div>
              <div className="text-sm text-muted-foreground">Expedição</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${productionEfficiency.expedicao}%` }}
                  role="progressbar"
                  aria-valuenow={productionEfficiency.expedicao}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Pedidos Urgentes
            </CardTitle>
            <CardDescription>
              Pedidos com prioridade alta que precisam de atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            {urgentOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum pedido urgente no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{order.numero || order.id}</span>
                        <Badge variant="destructive" className="text-xs">
                          ALTA
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.cliente || order.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entrega: {formatDateForDisplay(order.data_entrega, '-')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <Badge className={cn("text-xs", getProductionStatusColor(order))}>
                          {getProductionStatus(order)}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(order);
                          }}
                          aria-label="Visualizar pedido"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOrder(order);
                          }}
                          aria-label="Editar pedido"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/dashboard/orders')}
                  aria-label="Ver todos os pedidos urgentes"
                >
                  Ver Todos os Pedidos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Pedidos Recentes
            </CardTitle>
            <CardDescription>
              Últimos pedidos adicionados ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{order.numero || order.id}</span>
                        {order.prioridade === 'ALTA' && (
                          <Badge variant="destructive" className="text-xs">
                            ALTA
                          </Badge>
                        )}
                        {order.isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            ATRASADO
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.cliente || order.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateForDisplay(order.data_entrada || order.created_at, '-')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <Badge className={cn("text-xs", getProductionStatusColor(order))}>
                          {getProductionStatus(order)}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(order);
                          }}
                          aria-label="Visualizar pedido"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOrder(order);
                          }}
                          aria-label="Editar pedido"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/dashboard/orders')}
                  aria-label="Ver todos os pedidos urgentes"
                >
                  Ver Todos os Pedidos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            Ações Rápidas
          </CardTitle>
          <CardDescription>
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/dashboard/orders/new')}
            >
              <Plus className="h-6 w-6" />
              <span>Novo Pedido</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/dashboard/orders')}
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Gerenciar Pedidos</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/dashboard/clientes')}
            >
              <Users className="h-6 w-6" />
              <span>Clientes</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/dashboard/relatorios-envios')}
            >
              <Truck className="h-6 w-6" />
              <span>Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
