import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  RefreshCw,
  Search,
  X,
  AlertCircle,
  CalendarDays
} from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { OrderWithItems, DashboardSummary } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { isTauri } from '@/utils/isTauri';
import { DashboardV1 } from '../components/dashboard/DashboardV1';
import {
  calculateDashboardStats,
  isDateOverdue,
  getDaysDifference,
  parseLocalDate,
  ProcessedOrder
} from '@/utils/dashboardStats';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const isPwa = !isTauri();
  const { orders, setOrders } = useOrderStore();
  const { username, logout } = useAuthStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const lastFetchTimeRef = useRef<number>(Date.now());

  // Saudação de acordo com o horário do dia
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Data formatada por extenso (ex: Segunda-feira, 5 de outubro)
  const currentDateFormatted = useMemo(() => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(now);
    } catch {
      return '';
    }
  }, []);

  // Função otimizada para carregar pedidos do servidor
  const loadOrdersFromServer = useCallback(async (showToast = false) => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Carregar o resumo estatístico e a 1ª página em paralelo
      const [summaryResult, initialOrdersResult] = await Promise.all([
        api.getDashboardSummary(),
        api.getOrdersPaginated(1, 100),
      ]);

      setSummary(summaryResult);

      let allOrders = [...initialOrdersResult.orders];
      const totalPages = initialOrdersResult.total_pages;
      const pageSize = 100;
      const maxPagesToFetch = Math.min(5, totalPages);

      // Disparar páginas restantes em paralelo com Promise.all para carregar até 500 pedidos instantaneamente
      if (maxPagesToFetch >= 2) {
        const remainingPagePromises = [];
        for (let p = 2; p <= maxPagesToFetch; p++) {
          remainingPagePromises.push(api.getOrdersPaginated(p, pageSize));
        }
        const remainingResults = await Promise.all(remainingPagePromises);
        remainingResults.forEach((res) => {
          allOrders = allOrders.concat(res.orders);
        });
      }

      setOrders(allOrders);
      setLastUpdate(new Date());
      lastFetchTimeRef.current = Date.now();

      if (showToast) {
        toast({
          title: 'Dashboard atualizado',
          description: 'Todos os indicadores e pedidos foram sincronizados.',
        });
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail || err?.message || 'Erro de conexão com o servidor';
      setError(errorMessage);

      // Verificar se é erro de sessão
      if (
        errorMessage.toLowerCase().includes('sessão') ||
        errorMessage.toLowerCase().includes('token') ||
        err?.response?.status === 401
      ) {
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

  // Carregar pedidos ao montar o componente
  useEffect(() => {
    loadOrdersFromServer();
  }, [loadOrdersFromServer]);

  // Polling automático inteligente de 30 segundos (pausa quando a aba estiver em segundo plano)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Não executa polling se a aba estiver oculta/minimizada
      }
      loadOrdersFromServer(false);
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Se já passou mais de 30s desde o último fetch, atualiza ao focar na janela
        const elapsed = Date.now() - lastFetchTimeRef.current;
        if (elapsed > 30000) {
          loadOrdersFromServer(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadOrdersFromServer]);

  // Garantir array válido
  const validOrders = useMemo(() => {
    return Array.isArray(orders) ? orders : [];
  }, [orders]);

  // Estatísticas analíticas calculadas com funções utilitárias puras
  const stats = useMemo(() => {
    return calculateDashboardStats(validOrders, summary);
  }, [validOrders, summary]);

  // Formatação de dias
  const formatDays = useCallback((days: number): string => {
    if (days === 1) return '1 dia';
    if (days === 0) return '0 dias';
    return `${days} dias`;
  }, []);

  // Status de produção
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
    if (order.pronto) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    if (order.expedicao) return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
    if (order.costura) return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
    if (order.sublimacao) return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
    if (order.conferencia) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    if (order.financeiro) return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
  }, []);

  // Filtro de busca rápido
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return validOrders;
    const term = searchTerm.toLowerCase();
    return validOrders.filter((order) => {
      const numero = String(order.numero || order.id || '').toLowerCase();
      const cliente = (order.cliente || order.customer_name || '').toLowerCase();
      return numero.includes(term) || cliente.includes(term);
    });
  }, [validOrders, searchTerm]);

  // Pedidos Recentes (imutável, ordenado)
  const recentOrders = useMemo((): ProcessedOrder[] => {
    return [...filteredOrders]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.data_entrada || '').getTime();
        const dateB = new Date(b.created_at || b.data_entrada || '').getTime();
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((order) => {
        const isOverdue = isDateOverdue(order.data_entrega, order.pronto);
        const daysUntilDelivery = getDaysDifference(order.data_entrega);

        return {
          ...order,
          isOverdue,
          daysUntilDelivery,
        };
      });
  }, [filteredOrders]);

  // Pedidos Urgentes
  const urgentOrders = useMemo((): ProcessedOrder[] => {
    return [...filteredOrders]
      .filter((order) => order.prioridade === 'ALTA' && !order.pronto)
      .sort((a, b) => {
        const dateA = parseLocalDate(a.data_entrega)?.getTime() ?? 0;
        const dateB = parseLocalDate(b.data_entrega)?.getTime() ?? 0;
        return dateA - dateB;
      })
      .slice(0, 5)
      .map((order) => ({
        ...order,
        isOverdue: isDateOverdue(order.data_entrega, order.pronto),
        daysUntilDelivery: getDaysDifference(order.data_entrega),
      }));
  }, [filteredOrders]);

  const handleRefresh = useCallback(() => {
    loadOrdersFromServer(true);
  }, [loadOrdersFromServer]);

  const formatLastUpdate = useCallback((date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleCardClick = useCallback(
    (filterType: 'all' | 'pending' | 'completed' | 'overdue' | 'urgent') => {
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
    },
    [navigate]
  );

  const handleViewOrder = useCallback(
    (order: OrderWithItems) => {
      navigate(`/dashboard/pedido/editar/${order.id}`);
    },
    [navigate]
  );

  const handleEditOrder = useCallback(
    (order: OrderWithItems) => {
      navigate(`/dashboard/pedido/editar/${order.id}`);
    },
    [navigate]
  );

  // Skeleton Loader estruturado fiel ao design final
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
          <div className="space-y-2">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border shadow-xs">
              <CardHeader className="pb-2 pt-4 px-4">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>


        {/* Listas Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card className="border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", !isPwa && "sm:space-y-6")}>
      {/* 1. Cabeçalho Integrado e Moderno */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              {greeting}{username ? `, ${username}` : ''}!
            </h1>
            <span className="hidden sm:inline-block text-xl">👋</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-1">
            <span className="inline-flex items-center gap-1 font-medium capitalize">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {currentDateFormatted}
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <span>Última sincronização:</span>
              <strong className="text-foreground font-semibold">{formatLastUpdate(lastUpdate)}</strong>
            </span>
          </div>
        </div>

        {/* Ações do Header */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="h-9 px-3 text-xs font-semibold shadow-2xs"
            aria-label="Sincronizar dados do dashboard"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefreshing && "animate-spin text-primary")} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>

          {!isPwa && (
            <Button
              onClick={() => navigate('/dashboard/pedido/novo')}
              size="sm"
              className="h-9 px-3.5 text-xs font-semibold shadow-xs"
              aria-label="Criar novo pedido"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Pedido
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/orders')}
            className="h-9 px-3 text-xs font-semibold shadow-2xs"
            aria-label="Ver todos os pedidos"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Todos os Pedidos
          </Button>
        </div>
      </div>

      {/* Mensagem de Erro de Conexão */}
      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/80 dark:bg-red-950/40 text-red-800 dark:text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">
              Erro ao sincronizar dados: {error}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOrdersFromServer(true)}
            className="h-8 text-xs font-semibold bg-background hover:bg-red-100 dark:hover:bg-red-900/50"
          >
            Reconectar
          </Button>
        </div>
      )}

      {/* 2. Barra de Busca Rápida com Atalho e Limpeza */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar rapidamente por número do pedido ou nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(
            "pl-10 pr-9 h-11 bg-card border-slate-200/80 dark:border-slate-800/80 shadow-2xs focus-visible:ring-primary/20",
            isPwa && "min-h-[44px]"
          )}
          aria-label="Buscar pedidos"
          noUppercase
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 3. Conteúdo Principal do Dashboard V1 */}
      <DashboardV1
        stats={stats}
        urgentOrders={urgentOrders}
        recentOrders={recentOrders}
        isPwa={isPwa}
        getProductionStatusColor={getProductionStatusColor}
        getProductionStatus={getProductionStatus}
        formatDays={formatDays}
        handleViewOrder={handleViewOrder}
        handleEditOrder={handleEditOrder}
        handleCardClick={handleCardClick}
      />
    </div>
  );
}
