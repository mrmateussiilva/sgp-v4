import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { OrderWithItems, OrderStatus } from '../types';
import { api } from '../services/api';
import { useOrderRefresh } from '../hooks/useRealtimeNotifications';
import { useToast } from '@/hooks/use-toast';
import ExpedicaoCard from '../components/ExpedicaoCard';
import ExpedicaoDrawer from '../components/ExpedicaoDrawer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { ToastAction } from '../components/ui/toast';
import {
  Truck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import { logger } from '@/utils/logger';

// Helpers para garantir datas locais no fuso do usuário (evita problemas de UTC após 21h)
const getLocalDateString = (d = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPastLocalDateString = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateString(d);
};

export type DatePreset = 'fila_hoje' | 'apenas_hoje' | 'semana' | 'todos' | 'customizado';
export type ViewTab = 'todos' | 'atrasados' | 'hoje' | 'expedidos';

export default function Expedicao() {
  const refreshTrigger = useOrderRefresh();
  const { toast } = useToast();

  const hojeLocal = useMemo(() => getLocalDateString(), []);

  // Preset padrão 'fila_hoje': traz pedidos com entrega até hoje (incluindo atrasados pendentes)
  const [datePreset, setDatePreset] = useState<DatePreset>('fila_hoje');
  const [dataInicio, setDataInicio] = useState<string>(() => getPastLocalDateString(60));
  const [dataFim, setDataFim] = useState<string>(() => getLocalDateString());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Abas e sub-filtros operacionais
  const [activeTab, setActiveTab] = useState<ViewTab>('todos');
  const [apenasProntosProducao, setApenasProntosProducao] = useState(false);
  const [ocultarExpedidos, setOcultarExpedidos] = useState(true);

  // Estados dos dados e UI
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [isExpeditingGroup, setIsExpeditingGroup] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Estados do Drawer de Detalhes
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isConfirmingExpedition, setIsConfirmingExpedition] = useState(false);

  // Referências para controlar debounce e chamadas estáveis
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ordersRef = useRef<OrderWithItems[]>([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Função para aplicar os limites de datas a partir do preset selecionado
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const hoje = new Date();
    const hojeStr = getLocalDateString(hoje);

    if (preset === 'fila_hoje') {
      // 60 dias atrás até hoje: garante que todos os atrasados pendentes que precisam sair hoje sejam incluídos
      setDataInicio(getPastLocalDateString(60));
      setDataFim(hojeStr);
    } else if (preset === 'apenas_hoje') {
      setDataInicio(hojeStr);
      setDataFim(hojeStr);
    } else if (preset === 'semana') {
      const diaDaSemana = hoje.getDay();
      const diffParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + diffParaSegunda);

      const domingo = new Date(segunda);
      domingo.setDate(segunda.getDate() + 6);

      setDataInicio(getLocalDateString(segunda));
      setDataFim(getLocalDateString(domingo));
    } else if (preset === 'todos') {
      setDataInicio('');
      setDataFim('');
    }
  };

  // Carregar pedidos
  const loadOrders = useCallback(
    async (isBackground = false) => {
      // Só mostra tela de carregamento cheia se for a primeira vez e ainda não tivermos pedidos
      if (!isBackground && ordersRef.current.length === 0) {
        setLoading(true);
      }
      setIsRefreshing(true);

      try {
        let start: string | undefined = dataInicio || undefined;
        let end: string | undefined = dataFim || undefined;

        if (datePreset === 'todos') {
          start = undefined;
          end = undefined;
        }

        const response = await api.getOrdersPaginated(
          1,
          1000,
          undefined,
          undefined,
          start,
          end,
          undefined,
          undefined,
          'entrega'
        );

        setOrders(response.orders || []);
      } catch (err) {
        logger.error('Erro ao buscar pedidos para expedição:', err);
        // Só exibe toast de erro se a tela estiver visível e não for background imperceptível
        if (!isBackground) {
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar os pedidos da expedição.',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        setIsInitialLoad(false);
      }
    },
    [dataInicio, dataFim, datePreset, toast]
  );

  const loadOrdersRef = useRef(loadOrders);
  useEffect(() => {
    loadOrdersRef.current = loadOrders;
  }, [loadOrders]);

  // Carregamento inicial e reações a mudanças de filtro de datas
  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  // Atualizações em tempo real via WebSocket com Debounce inteligente
  // Não recarrega com tela cheia, mantém os dados visíveis e atualiza suavemente
  useEffect(() => {
    if (isInitialLoad) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadOrdersRef.current(true);
    }, 1500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [refreshTrigger, isInitialLoad]);

  // Estatísticas e contadores consolidados
  const stats = useMemo(() => {
    const hojeStr = hojeLocal;

    let totalAguardando = 0;
    let expedidosHoje = 0;
    let atrasados = 0;
    let aguardandoHoje = 0;
    let prontosParaEmbalar = 0;

    // Contagem por forma de envio
    const formasEnvioMap: Record<string, number> = {};

    (orders || []).forEach((o) => {
      if (!o) return;
      const entrega = o.data_entrega ? o.data_entrega.split('T')[0] : '';
      const isExpedido = !!o.expedicao;

      if (isExpedido) {
        if (entrega === hojeStr) {
          expedidosHoje++;
        }
      } else {
        totalAguardando++;
        if (entrega && entrega < hojeStr) {
          atrasados++;
        } else if (entrega === hojeStr) {
          aguardandoHoje++;
        }

        // Se está concluído na costura ou marcado como pronto geral
        if (o.pronto || o.costura) {
          prontosParaEmbalar++;
        }

        // Agrupar formas de envio pendentes
        const forma = (o.forma_envio || 'Sem Forma').trim().toUpperCase();
        formasEnvioMap[forma] = (formasEnvioMap[forma] || 0) + 1;
      }
    });

    return {
      totalAguardando,
      expedidosHoje,
      atrasados,
      aguardandoHoje,
      prontosParaEmbalar,
      formasEnvioMap,
    };
  }, [orders, hojeLocal]);

  // Filtrar e agrupar pedidos
  const groupedOrders = useMemo(() => {
    const hojeStr = hojeLocal;

    const filtered = (orders || []).filter((order) => {
      if (!order) return false;
      const isExpedido = !!order.expedicao;
      const entrega = order.data_entrega ? order.data_entrega.split('T')[0] : '';
      const isAtrasado = !isExpedido && !!entrega && entrega < hojeStr;
      const isEntregaHoje = entrega === hojeStr;

      // Filtro da aba selecionada
      if (activeTab === 'atrasados' && !isAtrasado) return false;
      if (activeTab === 'hoje' && (!isEntregaHoje || isExpedido)) return false;
      if (activeTab === 'expedidos' && !isExpedido) return false;

      // Se a aba for 'todos', respeita o checkbox de ocultar expedidos
      if (activeTab === 'todos' && ocultarExpedidos && isExpedido) return false;

      // Filtro de Prontos na Produção
      if (apenasProntosProducao && !order.pronto && !order.costura) {
        return false;
      }

      // Busca textual abrangente (cliente, número, cidade, estado, forma de envio)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const clienteName = (order.cliente || order.customer_name || '').toLowerCase();
        const numStr = String(order.numero || order.id || '').toLowerCase();
        const cidade = (order.cidade_cliente || '').toLowerCase();
        const formaEnvio = (order.forma_envio || '').toLowerCase();

        const matchText =
          clienteName.includes(query) ||
          numStr.includes(query) ||
          cidade.includes(query) ||
          formaEnvio.includes(query);

        if (!matchText) return false;
      }

      return true;
    });

    // Agrupamento por forma de envio
    const groups: Record<string, OrderWithItems[]> = {};
    filtered.forEach((order) => {
      const envioKey = (order.forma_envio || 'SEM FORMA DE ENVIO').trim().toUpperCase();
      if (!groups[envioKey]) {
        groups[envioKey] = [];
      }
      groups[envioKey].push(order);
    });

    // Ordenação dos grupos e pedidos internos:
    // Pedidos atrasados primeiro, depois por data de entrega mais próxima
    const sortedGroups: Record<string, OrderWithItems[]> = {};
    Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .forEach((key) => {
        sortedGroups[key] = (groups[key] || []).filter(Boolean).sort((a, b) => {
          if (!a || !b) return 0;
          // Atrasados primeiro
          const aAtrasado = !a.expedicao && a.data_entrega && a.data_entrega.split('T')[0] < hojeStr ? 1 : 0;
          const bAtrasado = !b.expedicao && b.data_entrega && b.data_entrega.split('T')[0] < hojeStr ? 1 : 0;
          if (aAtrasado !== bAtrasado) return bAtrasado - aAtrasado;

          // Urgência ALTA primeiro
          const aUrgente = a.prioridade === 'ALTA' ? 1 : 0;
          const bUrgente = b.prioridade === 'ALTA' ? 1 : 0;
          if (aUrgente !== bUrgente) return bUrgente - aUrgente;

          // Data de entrega cronológica
          const dateA = a.data_entrega ? new Date(a.data_entrega).getTime() : 0;
          const dateB = b.data_entrega ? new Date(b.data_entrega).getTime() : 0;
          return dateA - dateB;
        });
      });

    return sortedGroups;
  }, [orders, searchQuery, ocultarExpedidos, activeTab, apenasProntosProducao, hojeLocal]);

  // Total de pedidos exibidos no momento
  const totalExibidos = useMemo(() => {
    return Object.values(groupedOrders).reduce((acc, list) => acc + list.length, 0);
  }, [groupedOrders]);

  // Ação de Toggle Expedição (Marcar / Desmarcar)
  const handleToggleExpedition = async (orderId: number, currentStatus: boolean, isUndo = false) => {
    setUpdatingOrderId(orderId);
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      const newStatus = !currentStatus;

      const updated = await api.updateOrderStatus({
        id: orderId,
        conferencia: order.conferencia || false,
        sublimacao: order.sublimacao || false,
        costura: order.costura || false,
        expedicao: newStatus,
        pronto: newStatus ? true : (order.pronto || false),
        status: newStatus ? OrderStatus.Concluido : order.status,
      });

      // Atualização otimista imediata na lista local
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));

      if (!isUndo && newStatus) {
        toast({
          title: 'Pedido expedido!',
          description: `Pedido #${order.numero || order.id} foi marcado como expedido.`,
          variant: 'success',
          duration: 7000,
          action: (
            <ToastAction altText="Desfazer" onClick={() => handleToggleExpedition(orderId, true, true)}>
              Desfazer
            </ToastAction>
          ),
        });
      } else {
        toast({
          title: newStatus ? 'Pedido expedido!' : 'Expedição desfeita!',
          description: `O pedido #${order.numero || order.id} foi atualizado com sucesso.`,
          variant: 'success',
        });
      }
    } catch (err) {
      logger.error('Erro ao atualizar expedição:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status de expedição.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Expedir lote completo de um grupo
  const handleExpedirGrupo = async (groupName: string, groupOrdersList: OrderWithItems[]) => {
    const pendentes = groupOrdersList.filter((o) => !o.expedicao);
    if (pendentes.length === 0) return;

    setIsExpeditingGroup(groupName);
    try {
      const updates = pendentes.map((order) =>
        api
          .updateOrderStatus({
            id: order.id,
            conferencia: order.conferencia || false,
            sublimacao: order.sublimacao || false,
            costura: order.costura || false,
            expedicao: true,
            pronto: true,
            status: OrderStatus.Concluido,
          })
          .then((updated) => ({ id: order.id, updated }))
      );

      const results = await Promise.allSettled(updates);
      const successUpdates: { id: number; updated: Partial<OrderWithItems> }[] = [];

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          successUpdates.push(res.value as { id: number; updated: Partial<OrderWithItems> });
        }
      });

      if (successUpdates.length > 0) {
        setOrders((prev) =>
          prev.map((o) => {
            const found = successUpdates.find((u) => u.id === o.id);
            return found ? { ...o, ...found.updated } : o;
          })
        );

        toast({
          title: 'Grupo expedido!',
          description: `${successUpdates.length} pedidos expedidos com sucesso.`,
          variant: 'success',
          duration: 7000,
        });
      }

      if (successUpdates.length < pendentes.length) {
        toast({
          title: 'Atenção',
          description: `Apenas ${successUpdates.length} de ${pendentes.length} pedidos foram expedidos.`,
          variant: 'destructive',
        });
      }
    } catch (err) {
      logger.error('Erro ao expedir grupo:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível expedir todos os pedidos do grupo.',
        variant: 'destructive',
      });
    } finally {
      setIsExpeditingGroup(null);
    }
  };

  const handleConfirmExpeditionFromDrawer = async (orderId: number) => {
    setIsConfirmingExpedition(true);
    await handleToggleExpedition(orderId, false);
    setIsConfirmingExpedition(false);
    setDrawerOpen(false);
  };

  const handleOpenDetails = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-4">
      {/* Barra de sincronização sutil (sem flash de tela) */}
      {isRefreshing && orders.length > 0 && (
        <div className="h-1 w-full bg-primary/20 overflow-hidden rounded-full">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      )}

      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Expedição
          </h1>
          <p className="text-muted-foreground text-sm flex flex-wrap items-center gap-2">
            Conferência, empacotamento e despacho logístico
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {totalExibidos} na fila
            </span>
            {datePreset === 'fila_hoje' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3" /> Fila do Dia (Hoje + Atrasados)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOrders(false)}
            disabled={isRefreshing}
            className="h-10 px-4 font-semibold text-xs gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Cards de Resumo Interativos (clicar filtra direto para o lote) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Atrasados - Urgência Máxima */}
        <Card
          onClick={() => {
            setActiveTab('atrasados');
            setOcultarExpedidos(true);
          }}
          className={`cursor-pointer transition-all duration-200 border ${
            activeTab === 'atrasados'
              ? 'ring-2 ring-rose-500 shadow-md bg-rose-500/15 border-rose-500'
              : 'bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:border-rose-500/50'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className={`h-5 w-5 sm:h-6 sm:w-6 ${stats.atrasados > 0 ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Atrasados Pendentes
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                {stats.atrasados}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Entrega Hoje */}
        <Card
          onClick={() => {
            setActiveTab('hoje');
            setOcultarExpedidos(true);
          }}
          className={`cursor-pointer transition-all duration-200 border ${
            activeTab === 'hoje'
              ? 'ring-2 ring-blue-500 shadow-md bg-blue-500/15 border-blue-500'
              : 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/50'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Para Hoje
              </span>
              <span className="text-xl sm:text-2xl font-black text-foreground">
                {stats.aguardandoHoje}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total da Fila */}
        <Card
          onClick={() => setActiveTab('todos')}
          className={`cursor-pointer transition-all duration-200 border ${
            activeTab === 'todos'
              ? 'ring-2 ring-amber-500 shadow-md bg-amber-500/15 border-amber-500'
              : 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/50'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Total Aguardando
              </span>
              <span className="text-xl sm:text-2xl font-black text-foreground">
                {stats.totalAguardando}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expedidos Hoje */}
        <Card
          onClick={() => {
            setActiveTab('expedidos');
            setOcultarExpedidos(false);
          }}
          className={`cursor-pointer transition-all duration-200 border ${
            activeTab === 'expedidos'
              ? 'ring-2 ring-emerald-500 shadow-md bg-emerald-500/15 border-emerald-500'
              : 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Expedidos Hoje
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.expedidosHoje}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo por Formas de Envio (Chips de conferência rápida) */}
      {Object.keys(stats.formasEnvioMap).length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-muted-foreground font-bold uppercase text-[10px] shrink-0 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> Fila por Envio:
          </span>
          {Object.entries(stats.formasEnvioMap).map(([forma, qtd]) => (
            <button
              key={forma}
              onClick={() => setSearchQuery(forma === searchQuery ? '' : forma)}
              className={`px-2.5 py-1 rounded-lg border font-semibold shrink-0 transition-all ${
                searchQuery.toUpperCase() === forma
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/50 hover:bg-muted text-foreground border-border/70'
              }`}
            >
              {forma}: <span className="font-extrabold">{qtd}</span>
            </button>
          ))}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[11px] text-muted-foreground hover:text-foreground underline px-1"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {/* Controles de Busca e Filtro */}
      <Card className="border border-border/80 shadow-sm">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Campo de Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="searchQuery"
                placeholder="Buscar cliente, cidade, número ou forma de envio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 text-base bg-muted/30 shadow-inner rounded-xl border-border focus-visible:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Presets de Data da Busca */}
            <div className="flex flex-wrap items-center gap-1 bg-muted p-1 rounded-xl border shrink-0">
              <Button
                variant={datePreset === 'fila_hoje' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => applyDatePreset('fila_hoje')}
                className={`h-10 px-3 text-xs font-bold rounded-lg ${
                  datePreset === 'fila_hoje'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-muted-foreground'
                }`}
                title="Tudo para enviar hoje (inclui atrasados pendentes)"
              >
                Fila de Hoje
              </Button>

              <Button
                variant={datePreset === 'apenas_hoje' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => applyDatePreset('apenas_hoje')}
                className={`h-10 px-3 text-xs font-bold rounded-lg ${
                  datePreset === 'apenas_hoje' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Apenas Hoje
              </Button>

              <Button
                variant={datePreset === 'semana' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => applyDatePreset('semana')}
                className={`h-10 px-3 text-xs font-bold rounded-lg ${
                  datePreset === 'semana' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Semana
              </Button>

              <Button
                variant={datePreset === 'todos' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => applyDatePreset('todos')}
                className={`h-10 px-3 text-xs font-bold rounded-lg ${
                  datePreset === 'todos' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Todos
              </Button>

              <Button
                variant={datePreset === 'customizado' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => applyDatePreset('customizado')}
                className={`h-10 px-3 text-xs font-bold rounded-lg ${
                  datePreset === 'customizado' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Período
              </Button>
            </div>
          </div>

          {/* Abas e Toggles de Visualização Rápida */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
            {/* Abas Rápidas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'todos'
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                Todos ({orders.length})
              </button>

              <button
                onClick={() => {
                  setActiveTab('atrasados');
                  setOcultarExpedidos(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'atrasados'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Atrasados ({stats.atrasados})
              </button>

              <button
                onClick={() => {
                  setActiveTab('hoje');
                  setOcultarExpedidos(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'hoje'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Hoje ({stats.aguardandoHoje})
              </button>

              <button
                onClick={() => {
                  setActiveTab('expedidos');
                  setOcultarExpedidos(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'expedidos'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                }`}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Expedidos ({stats.expedidosHoje})
              </button>
            </div>

            {/* Toggles da Direita */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro: Apenas Prontos para Embalar */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 h-10 rounded-xl border">
                <Checkbox
                  id="apenasProntosProducao"
                  checked={apenasProntosProducao}
                  onCheckedChange={(checked) => setApenasProntosProducao(checked === true)}
                  className="w-4 h-4"
                />
                <Label htmlFor="apenasProntosProducao" className="text-xs font-semibold cursor-pointer">
                  Apenas Prontos ({stats.prontosParaEmbalar})
                </Label>
              </div>

              {/* Ocultar Expedidos */}
              {activeTab === 'todos' && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 h-10 rounded-xl border">
                  <Checkbox
                    id="ocultarExpedidos"
                    checked={ocultarExpedidos}
                    onCheckedChange={(checked) => setOcultarExpedidos(checked === true)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="ocultarExpedidos" className="text-xs font-semibold cursor-pointer">
                    Ocultar Expedidos
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Filtros Customizados de Data (aparecem se preset for 'customizado') */}
          {datePreset === 'customizado' && (
            <div className="pt-3 border-t animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dataInicio" className="text-[10px] font-bold text-muted-foreground uppercase">
                    Data Início
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="h-9 text-xs min-w-[130px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dataFim" className="text-[10px] font-bold text-muted-foreground uppercase">
                    Data Fim
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="h-9 text-xs min-w-[130px]"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listagem de Grupos */}
      <div className="space-y-6 pb-20">
        {loading && orders.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground font-semibold">Carregando fila de expedição...</p>
          </div>
        ) : Object.keys(groupedOrders).length === 0 ? (
          <Card className="border border-dashed border-border/80">
            <CardContent className="py-12 text-center space-y-3">
              <Truck className="h-12 w-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-lg text-foreground">Nenhum pedido na fila atual</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {activeTab === 'atrasados'
                  ? 'Parabéns! Não há nenhum pedido atrasado pendente de envio.'
                  : activeTab === 'hoje'
                  ? 'Não há pedidos pendentes com data de entrega para hoje.'
                  : activeTab === 'expedidos'
                  ? 'Nenhum pedido foi expedido hoje até o momento.'
                  : 'Nenhum pedido encontrado para os filtros selecionados.'}
              </p>
              {activeTab !== 'todos' && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab('todos')} className="mt-2 text-xs font-semibold">
                  Ver Todos os Pedidos
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedOrders).map(([groupName, list]) => {
            const isCollapsed = collapsedGroups[groupName] || false;
            const pendentesGrupo = list.filter((o) => !o.expedicao).length;
            const expedidosGrupo = list.length - pendentesGrupo;
            const progresso = list.length > 0 ? (expedidosGrupo / list.length) * 100 : 0;

            return (
              <div
                key={groupName}
                className="space-y-3 bg-slate-50/60 dark:bg-slate-900/20 p-3 md:p-4 rounded-xl border border-border/60 shadow-sm"
              >
                {/* Header do Grupo */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div
                    onClick={() => toggleGroupCollapse(groupName)}
                    className="flex items-center gap-2 cursor-pointer select-none group w-full sm:w-auto"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                    ) : (
                      <ChevronUp className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                    )}

                    <div className="flex flex-col">
                      <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tight flex items-center gap-2">
                        {groupName}
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {list.length} itens
                        </span>
                      </h3>

                      {/* Barra de Progresso do Grupo */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                          {expedidosGrupo} de {list.length} expedidos
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto pl-8 sm:pl-0">
                    {pendentesGrupo > 0 && (
                      <Button
                        size="sm"
                        disabled={isExpeditingGroup === groupName}
                        onClick={() => handleExpedirGrupo(groupName, list)}
                        className="h-10 px-4 gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shrink-0 w-full sm:w-auto transition-transform active:scale-95"
                      >
                        {isExpeditingGroup === groupName ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Expedir Restantes ({pendentesGrupo})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Grid de Pedidos do Grupo */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-3">
                    {list.map((order) => (
                      <ExpedicaoCard
                        key={order.id}
                        order={order}
                        onOpenDetails={handleOpenDetails}
                        onToggleExpedition={handleToggleExpedition}
                        isUpdating={updatingOrderId === order.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Drawer de Detalhes e Conferência */}
      <ExpedicaoDrawer
        order={selectedOrder}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onConfirmExpedition={handleConfirmExpeditionFromDrawer}
        isConfirming={isConfirmingExpedition}
      />
    </div>
  );
}
