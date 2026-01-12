import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Boxes, ShoppingBag, DollarSign, TrendingUp, Truck, Package, BarChart3, Minus, Maximize2, Target, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import {
  AnalyticsResponse,
  AnalyticsFilters,
  // AnalyticsLeaderboardEntry,
  // AnalyticsTopProduct,
  ReportResponse,
  ReportRequestPayload,
  OrderWithItems,
} from '@/types';
import {
  AnalyticsFilterBar,
  AnalyticsFilterState,
  FilterOption,
} from '@/components/analytics/AnalyticsFilterBar';
import { EnhancedSummaryCard } from '@/components/analytics/EnhancedSummaryCard';
import { LeaderboardCard } from '@/components/analytics/LeaderboardCard';
import { ComparativeLineChart } from '@/components/analytics/ComparativeLineChart';
import { DailyRevenueChart } from '@/components/analytics/DailyRevenueChart';
import { StatusDistributionChart } from '@/components/analytics/StatusDistributionChart';
import { TopProductsChart } from '@/components/analytics/TopProductsChart';
import { CriticalOrdersCard } from '@/components/analytics/CriticalOrdersCard';
import {
  calculatePeriodAnalytics,
  getCurrentWeek,
  getPreviousWeek,
  calculateVariation,
  getStatusFromVariation,
} from '@/utils/analyticsComparison';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { calculateOrderAnalytics } from '@/utils/orderAnalytics';

const numberFormatter = new Intl.NumberFormat('pt-BR');
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const initialFilterState: AnalyticsFilterState = {
  date_from: '',
  date_to: '',
  vendedor_id: '',
  designer_id: '',
  product_type: '',
};

const mapToFilterOptions = (items: Array<{ id: number; nome: string }>): FilterOption[] =>
  items.map((item) => ({
    value: String(item.id),
    label: item.nome,
  }));

// const mapProductsToLeaderboard = (products: AnalyticsTopProduct[]): AnalyticsLeaderboardEntry[] =>
//   products.map((product) => ({
//     id: product.product_id,
//     name: product.product_name,
//     value: product.quantity,
//   }));


const formatCurrency = (value: number): string => {
  return currencyFormatter.format(value);
};

export default function PainelDesempenho() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AnalyticsFilterState>(initialFilterState);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [fechamentoData, setFechamentoData] = useState<ReportResponse | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingFechamento, setLoadingFechamento] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [vendedores, setVendedores] = useState<FilterOption[]>([]);
  const [designers, setDesigners] = useState<FilterOption[]>([]);
  const [productTypes, setProductTypes] = useState<FilterOption[]>([]);

  const loadCatalogs = useCallback(async () => {
    try {
      const [vendedoresResponse, designersResponse] = await Promise.all([
        api.getVendedoresAtivos().catch(() => []),
        api.getDesignersAtivos().catch(() => []),
      ]);
      setVendedores(mapToFilterOptions(vendedoresResponse ?? []));
      setDesigners(mapToFilterOptions(designersResponse ?? []));
    } catch (catalogError) {
      console.warn('Não foi possível carregar catálogos auxiliares:', catalogError);
    }
  }, []);

  const buildFiltersPayload = useCallback(
    (state: AnalyticsFilterState): AnalyticsFilters => {
      const payload: AnalyticsFilters = {};
      if (state.date_from) payload.date_from = state.date_from;
      if (state.date_to) payload.date_to = state.date_to;
      if (state.vendedor_id) payload.vendedor_id = Number(state.vendedor_id);
      if (state.designer_id) payload.designer_id = Number(state.designer_id);
      if (state.product_type) payload.product_type = state.product_type;
      return payload;
    },
    [],
  );

  // Carregar pedidos do backend
  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const fetchedOrders = await api.getOrders();
      setOrders(fetchedOrders);
      console.info(`[PainelDesempenho] ${fetchedOrders.length} pedidos carregados para analytics`);
    } catch (loadError) {
      console.error('Erro ao carregar pedidos:', loadError);
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar todos os pedidos. Alguns dados podem estar incompletos.',
        variant: 'default',
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [toast]);

  const loadAnalytics = useCallback(
    async (filtersPayload: AnalyticsFilters, isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);

        // Se não há pedidos carregados, aguardar
        if (orders.length === 0) {
          console.info('[PainelDesempenho] Aguardando carregamento de pedidos...');
          return;
        }

        // Calcular analytics a partir de pedidos reais
        console.info('[PainelDesempenho] Calculando analytics a partir de pedidos reais');
        
        // Criar mapas de ID -> nome para vendedores e designers
        const vendedorNameMap = new Map<number, string>();
        vendedores.forEach((v) => {
          const id = Number(v.value);
          if (!Number.isNaN(id)) {
            vendedorNameMap.set(id, v.label);
          }
        });
        
        const designerNameMap = new Map<number, string>();
        designers.forEach((d) => {
          const id = Number(d.value);
          if (!Number.isNaN(id)) {
            designerNameMap.set(id, d.label);
          }
        });
        
        const calculatedAnalytics = calculateOrderAnalytics(
          orders,
          filtersPayload,
          vendedorNameMap,
          designerNameMap,
        );
        setAnalytics(calculatedAnalytics);

        if (calculatedAnalytics.available_product_types) {
          setProductTypes(
            calculatedAnalytics.available_product_types.map((name) => ({
              value: name,
              label: name,
            })),
          );
        }
      } catch (loadError) {
        console.error('Erro ao calcular analytics:', loadError);
        setError('Não foi possível calcular os dados de desempenho. Tente novamente mais tarde.');
        toast({
          title: 'Falha ao calcular painel',
          description:
            loadError instanceof Error ? loadError.message : 'Erro inesperado ao processar os dados.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orders, vendedores, designers, toast],
  );

  // Função para buscar dados de fechamento
  const loadFechamentoData = useCallback(
    async (filtersPayload: AnalyticsFilters) => {
      if (!filtersPayload.date_from || !filtersPayload.date_to) {
        setFechamentoData(null);
        return;
      }

      try {
        setLoadingFechamento(true);
        const payload: ReportRequestPayload = {
          report_type: 'sintetico_data',
          start_date: filtersPayload.date_from,
          end_date: filtersPayload.date_to,
          date_mode: 'entrega',
          status: undefined,
          vendedor: filtersPayload.vendedor_id ? vendedores.find((v) => v.value === String(filtersPayload.vendedor_id))?.label : undefined,
          designer: filtersPayload.designer_id ? designers.find((d) => d.value === String(filtersPayload.designer_id))?.label : undefined,
        };

        const response = await api.generateReport(payload);
        setFechamentoData(response);
      } catch (error) {
        console.error('Erro ao buscar dados de fechamento:', error);
        setFechamentoData(null);
      } finally {
        setLoadingFechamento(false);
      }
    },
    [vendedores, designers],
  );

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Carregar pedidos e catálogos na inicialização
  useEffect(() => {
    loadCatalogs();
    loadOrders();
  }, [loadCatalogs, loadOrders]);

  // Quando pedidos são carregados, calcular analytics inicial
  useEffect(() => {
    if (!loadingOrders && !initialLoadDone) {
      const initialPayload = buildFiltersPayload(initialFilterState);
      loadAnalytics(initialPayload, true);
      setInitialLoadDone(true);
    }
  }, [loadingOrders, initialLoadDone, buildFiltersPayload, loadAnalytics]);

  useEffect(() => {
    const payload = buildFiltersPayload(filters);
    loadFechamentoData(payload);
  }, [filters, buildFiltersPayload, loadFechamentoData]);

  const handleFiltersChange = (changes: Partial<AnalyticsFilterState>) => {
    setFilters((previous) => ({
      ...previous,
      ...changes,
    }));
  };

  const handleApplyFilters = () => {
    const payload = buildFiltersPayload(filters);
    setRefreshing(true);
    loadAnalytics(payload, false);
  };

  const handleResetFilters = () => {
    setFilters(initialFilterState);
    const payload = buildFiltersPayload(initialFilterState);
    loadAnalytics(payload, false);
  };

  // Calcular estatísticas do relatório de fechamento
  const fechamentoStats = useMemo(() => {
    if (!fechamentoData) return null;

    const totalGroups = fechamentoData.groups.length;
    const totalSubgroups = fechamentoData.groups.reduce(
      (acc, group) => acc + (group.subgroups?.length || 0),
      0,
    );
    const totalRows = fechamentoData.groups.reduce(
      (acc, group) =>
        acc +
        (group.rows?.length || 0) +
        (group.subgroups?.reduce((subAcc, sub) => subAcc + (sub.rows?.length || 0), 0) || 0),
      0,
    );

    return { totalGroups, totalSubgroups, totalRows };
  }, [fechamentoData]);

  // Calcular estatísticas detalhadas de fechamento (médias, maior/menor, etc)
  const fechamentoDetailedStats = useMemo(() => {
    if (!fechamentoData || !fechamentoStats || fechamentoStats.totalRows === 0) return null;

    const allRows: Array<{ valor_frete: number; valor_servico: number; total: number }> = [];

    // Coletar todas as linhas do relatório
    fechamentoData.groups.forEach((group) => {
      if (group.rows) {
        group.rows.forEach((row) => {
          const total = row.valor_frete + row.valor_servico;
          allRows.push({
            valor_frete: row.valor_frete,
            valor_servico: row.valor_servico,
            total,
          });
        });
      }
      if (group.subgroups) {
        group.subgroups.forEach((subgroup) => {
          if (subgroup.rows) {
            subgroup.rows.forEach((row) => {
              const total = row.valor_frete + row.valor_servico;
              allRows.push({
                valor_frete: row.valor_frete,
                valor_servico: row.valor_servico,
                total,
              });
            });
          }
        });
      }
    });

    if (allRows.length === 0) return null;

    // Calcular estatísticas
    const totalGeral = fechamentoData.total.valor_frete + fechamentoData.total.valor_servico;
    const mediaGeral = totalGeral / allRows.length;
    const mediaFrete = fechamentoData.total.valor_frete / allRows.length;
    const mediaServico = fechamentoData.total.valor_servico / allRows.length;

    // Encontrar maior e menor valor
    const valores = allRows.map((row) => row.total);
    const maiorValor = Math.max(...valores);
    const menorValor = Math.min(...valores);
    const maiorItem = allRows.find((row) => row.total === maiorValor);
    const menorItem = allRows.find((row) => row.total === menorValor);

    // Calcular mediana (valor do meio)
    const valoresOrdenados = [...valores].sort((a, b) => a - b);
    const mediana =
      valoresOrdenados.length % 2 === 0
        ? (valoresOrdenados[valoresOrdenados.length / 2 - 1] + valoresOrdenados[valoresOrdenados.length / 2]) / 2
        : valoresOrdenados[Math.floor(valoresOrdenados.length / 2)];

    return {
      totalItems: allRows.length,
      mediaGeral,
      mediaFrete,
      mediaServico,
      maiorValor,
      menorValor,
      mediana,
      maiorItem,
      menorItem,
    };
  }, [fechamentoData, fechamentoStats]);

  // Calcular cards de resumo executivo de FECHAMENTOS
  const fechamentoSummaryCards = useMemo(() => {
    if (!fechamentoData) return null;

    const totalGeral = fechamentoData.total.valor_frete + fechamentoData.total.valor_servico;
    const totalFrete = fechamentoData.total.valor_frete;
    const totalServico = fechamentoData.total.valor_servico;
    const totalItens = fechamentoStats?.totalRows || 0;

    // Calcular percentual de frete e serviço
    const percentFrete = totalGeral > 0 ? (totalFrete / totalGeral) * 100 : 0;
    const percentServico = totalGeral > 0 ? (totalServico / totalGeral) * 100 : 0;

    return [
      {
        title: 'Total Geral (Fechamento)',
        value: formatCurrency(totalGeral),
        subtitle: 'Frete + Serviços',
        icon: <DollarSign className="h-5 w-5 text-blue-600" />,
        className: 'border-blue-200 bg-blue-50/30',
      },
      {
        title: 'Total Frete',
        value: formatCurrency(totalFrete),
        subtitle: `${percentFrete.toFixed(1)}% do total`,
        icon: <Truck className="h-5 w-5 text-green-600" />,
        className: 'border-green-200 bg-green-50/30',
      },
      {
        title: 'Total Serviços',
        value: formatCurrency(totalServico),
        subtitle: `${percentServico.toFixed(1)}% do total`,
        icon: <Package className="h-5 w-5 text-purple-600" />,
        className: 'border-purple-200 bg-purple-50/30',
      },
      {
        title: 'Total de Itens',
        value: totalItens.toString(),
        subtitle: `${fechamentoStats?.totalGroups || 0} grupo(s)`,
        icon: <TrendingUp className="h-5 w-5 text-orange-600" />,
        className: 'border-orange-200 bg-orange-50/30',
      },
    ];
  }, [fechamentoData, fechamentoStats]);

  // Calcular analytics da semana anterior para comparação
  const previousWeekAnalytics = useMemo(() => {
    if (orders.length === 0) return null;
    
    const { start, end } = getPreviousWeek();
    const vendedorNameMap = new Map<number, string>();
    vendedores.forEach((v) => {
      const id = Number(v.value);
      if (!Number.isNaN(id)) {
        vendedorNameMap.set(id, v.label);
      }
    });
    
    const designerNameMap = new Map<number, string>();
    designers.forEach((d) => {
      const id = Number(d.value);
      if (!Number.isNaN(id)) {
        designerNameMap.set(id, d.label);
      }
    });

    const filtersPayload = buildFiltersPayload(filters);
    return calculatePeriodAnalytics(orders, start, end, {
      vendedor_id: filtersPayload.vendedor_id ?? undefined,
      designer_id: filtersPayload.designer_id ?? undefined,
      product_type: filtersPayload.product_type ?? undefined,
    });
  }, [orders, vendedores, designers, filters, buildFiltersPayload]);

  // Calcular analytics da semana atual
  const currentWeekAnalytics = useMemo(() => {
    if (orders.length === 0) return null;
    
    const { start, end } = getCurrentWeek();
    const vendedorNameMap = new Map<number, string>();
    vendedores.forEach((v) => {
      const id = Number(v.value);
      if (!Number.isNaN(id)) {
        vendedorNameMap.set(id, v.label);
      }
    });
    
    const designerNameMap = new Map<number, string>();
    designers.forEach((d) => {
      const id = Number(d.value);
      if (!Number.isNaN(id)) {
        designerNameMap.set(id, d.label);
      }
    });

    const filtersPayload = buildFiltersPayload(filters);
    return calculatePeriodAnalytics(orders, start, end, {
      vendedor_id: filtersPayload.vendedor_id ?? undefined,
      designer_id: filtersPayload.designer_id ?? undefined,
      product_type: filtersPayload.product_type ?? undefined,
    });
  }, [orders, vendedores, designers, filters, buildFiltersPayload]);

  const summaryCards = useMemo(() => {
    if (!analytics) {
      return null;
    }
    const summary = analytics.summary;
    if (!summary) {
      return null;
    }

    // Calcular variações se tiver dados da semana anterior
    const prevSummary = previousWeekAnalytics?.summary;
    const revenueVariation = prevSummary
      ? calculateVariation(summary.total_revenue ?? 0, prevSummary.total_revenue ?? 0)
      : undefined;
    const ordersVariation = prevSummary
      ? calculateVariation(summary.total_orders ?? 0, prevSummary.total_orders ?? 0)
      : undefined;
    const itemsVariation = prevSummary
      ? calculateVariation(summary.total_items_produced ?? 0, prevSummary.total_items_produced ?? 0)
      : undefined;

    // Formatar período atual
    const periodLabel = filters.date_from && filters.date_to
      ? `${new Date(filters.date_from).toLocaleDateString('pt-BR')} - ${new Date(filters.date_to).toLocaleDateString('pt-BR')}`
      : undefined;

    return [
      {
        title: '💰 Receita Total',
        value: currencyFormatter.format(summary.total_revenue ?? 0),
        variation: revenueVariation,
        variationLabel: 'vs semana anterior',
        status: revenueVariation !== undefined ? getStatusFromVariation(revenueVariation) : undefined,
        statusLabel: revenueVariation !== undefined && revenueVariation >= 5 ? 'Acima da média' : undefined,
        icon: <DollarSign className="h-5 w-5 text-blue-600" />,
        period: periodLabel,
        criteria: 'Critério: Data de entrada',
      },
      {
        title: '📦 Pedidos',
        value: numberFormatter.format(summary.total_orders ?? 0),
        variation: ordersVariation,
        variationLabel: 'vs semana anterior',
        status: ordersVariation !== undefined ? getStatusFromVariation(ordersVariation, 0, -3) : undefined,
        statusLabel: ordersVariation !== undefined && ordersVariation < -3 ? 'Atenção: abaixo da média' : undefined,
        subtitle: `Ticket médio: ${currencyFormatter.format(summary.average_ticket ?? 0)}`,
        icon: <ShoppingBag className="h-5 w-5 text-green-600" />,
      },
      {
        title: '🏭 Itens Produzidos',
        value: numberFormatter.format(summary.total_items_produced ?? 0),
        variation: itemsVariation,
        variationLabel: 'vs semana anterior',
        status: itemsVariation !== undefined ? getStatusFromVariation(itemsVariation) : undefined,
        statusLabel: itemsVariation !== undefined && itemsVariation >= 5 ? 'Em linha com a meta' : undefined,
        subtitle: `${summary.total_orders > 0 ? (summary.total_items_produced / summary.total_orders).toFixed(1) : 0} itens/pedido (média)`,
        icon: <Boxes className="h-5 w-5 text-purple-600" />,
      },
      {
        title: '⚠️ Atenção Hoje',
        value: orders.filter((o) => {
          if (o.pronto) return false;
          if (!o.data_entrega) return false;
          const deliveryDate = new Date(o.data_entrega);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          deliveryDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil <= 5 && daysUntil >= 0;
        }).length.toString(),
        subtitle: `${orders.filter((o) => {
          if (!o.data_entrega) return false;
          const deliveryDate = new Date(o.data_entrega);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          deliveryDate.setHours(0, 0, 0, 0);
          return deliveryDate < today && !o.pronto;
        }).length} atrasados • ${orders.filter((o) => {
          if (!o.data_entrega) return false;
          const deliveryDate = new Date(o.data_entrega);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          deliveryDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil <= 2 && daysUntil >= 0 && !o.pronto;
        }).length} críticos`,
        icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
        className: 'border-orange-200 bg-orange-50/30',
      },
    ];
  }, [analytics, previousWeekAnalytics, orders, filters]);

  // const topProducts = useMemo(
  //   () => mapProductsToLeaderboard((analytics?.top_products ?? []).slice(0, 5)),
  //   [analytics?.top_products],
  // );
  const topSellers = useMemo(
    () => (analytics?.top_sellers ?? []).slice(0, 5),
    [analytics?.top_sellers],
  );
  const topDesigners = useMemo(
    () => (analytics?.top_designers ?? []).slice(0, 5),
    [analytics?.top_designers],
  );

  const hasData =
    analytics &&
    ((analytics.top_products?.length ?? 0) > 0 ||
      (analytics.top_sellers?.length ?? 0) > 0 ||
      (analytics.top_designers?.length ?? 0) > 0 ||
      (analytics.monthly_trends?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Painel de Desempenho</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Acompanhe indicadores de produção e vendas em tempo real. Ajuste os filtros para refinar as
          análises.
        </p>
      </div>

      <AnalyticsFilterBar
        filters={filters}
        vendedores={vendedores}
        designers={designers}
        productTypes={productTypes}
        onChange={handleFiltersChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        loading={refreshing || loading}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {(loading || loadingOrders) ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`summary-skeleton-${index}`}
              className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100/60"
            />
          ))}
        </div>
      ) : summaryCards ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <EnhancedSummaryCard
              key={card.title}
              title={card.title}
              value={card.value}
              variation={card.variation}
              variationLabel={card.variationLabel}
              status={card.status}
              statusLabel={card.statusLabel}
              subtitle={card.subtitle}
              icon={card.icon}
              className={card.className}
              period={card.period}
              criteria={card.criteria}
            />
          ))}
        </div>
      ) : null}

      {/* Cards de Resumo Executivo de Fechamento */}
      {loadingFechamento && filters.date_from && filters.date_to ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`fechamento-skeleton-${index}`}
              className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100/60"
            />
          ))}
        </div>
      ) : fechamentoSummaryCards ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {fechamentoSummaryCards.map((card, index) => (
              <EnhancedSummaryCard
                key={`fechamento-${index}`}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                className={card.className}
              />
            ))}
          </div>

          {/* Estatísticas Detalhadas de Fechamento */}
          {fechamentoDetailedStats && (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-slate-600" />
                  <CardTitle className="text-lg font-semibold text-slate-900">Estatísticas Detalhadas de Fechamento</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {/* Média Geral */}
                  <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Target className="h-4 w-4 text-blue-600" />
                      Média Geral
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(fechamentoDetailedStats.mediaGeral)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Por item</p>
                  </div>

                  {/* Mediana */}
                  <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Minus className="h-4 w-4 text-orange-600" />
                      Mediana
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(fechamentoDetailedStats.mediana)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Valor central</p>
                  </div>

                  {/* Maior Valor */}
                  <div className="flex flex-col rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700">
                      <Maximize2 className="h-4 w-4 text-green-600" />
                      Maior Valor
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(fechamentoDetailedStats.maiorValor)}
                    </p>
                    <p className="mt-1 text-xs text-green-600">
                      {fechamentoDetailedStats.maiorItem && (
                        <>
                          Frete: {formatCurrency(fechamentoDetailedStats.maiorItem.valor_frete)} · Serv: {formatCurrency(fechamentoDetailedStats.maiorItem.valor_servico)}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Menor Valor */}
                  <div className="flex flex-col rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700">
                      <Minus className="h-4 w-4 text-red-600" />
                      Menor Valor
                    </div>
                    <p className="text-2xl font-bold text-red-900">
                      {formatCurrency(fechamentoDetailedStats.menorValor)}
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      {fechamentoDetailedStats.menorItem && (
                        <>
                          Frete: {formatCurrency(fechamentoDetailedStats.menorItem.valor_frete)} · Serv: {formatCurrency(fechamentoDetailedStats.menorItem.valor_servico)}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Médias detalhadas */}
                {fechamentoDetailedStats && (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                      <p className="text-sm font-medium text-green-700">Média de Frete</p>
                      <p className="mt-1 text-xl font-bold text-green-900">
                        {formatCurrency(fechamentoDetailedStats.mediaFrete)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                      <p className="text-sm font-medium text-purple-700">Média de Serviços</p>
                      <p className="mt-1 text-xl font-bold text-purple-900">
                        {formatCurrency(fechamentoDetailedStats.mediaServico)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                      <p className="text-sm font-medium text-blue-700">Total de Itens Analisados</p>
                      <p className="mt-1 text-xl font-bold text-blue-900">
                        {fechamentoDetailedStats.totalItems}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card destacado com totais */}
          {fechamentoData && (
            <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
              <div className="border-b border-blue-200 bg-blue-100/50 px-6 py-4">
                <h3 className="text-lg font-semibold text-blue-900">Resumo Financeiro do Período</h3>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Total Frete */}
                  <div className="flex flex-col items-center justify-center rounded-lg border border-green-200 bg-white p-4 text-center shadow-sm">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Truck className="h-4 w-4 text-green-600" />
                      Total Frete
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(fechamentoData.total.valor_frete)}
                    </p>
                    {fechamentoStats && fechamentoStats.totalRows > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Média: {formatCurrency(fechamentoData.total.valor_frete / fechamentoStats.totalRows)}
                      </p>
                    )}
                  </div>

                  {/* Total Serviços */}
                  <div className="flex flex-col items-center justify-center rounded-lg border border-purple-200 bg-white p-4 text-center shadow-sm">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Package className="h-4 w-4 text-purple-600" />
                      Total Serviços
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      {formatCurrency(fechamentoData.total.valor_servico)}
                    </p>
                    {fechamentoStats && fechamentoStats.totalRows > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Média: {formatCurrency(fechamentoData.total.valor_servico / fechamentoStats.totalRows)}
                      </p>
                    )}
                  </div>

                  {/* Total Geral */}
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-center shadow-md">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <DollarSign className="h-5 w-5 text-blue-700" />
                      Total Geral
                    </div>
                    <p className="text-3xl font-bold text-blue-900">
                      {formatCurrency(fechamentoData.total.valor_frete + fechamentoData.total.valor_servico)}
                    </p>
                    {fechamentoStats && fechamentoStats.totalRows > 0 && (
                      <p className="mt-1 text-xs font-medium text-blue-700">
                        Média por item: {formatCurrency((fechamentoData.total.valor_frete + fechamentoData.total.valor_servico) / fechamentoStats.totalRows)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Percentuais e distribuição */}
                {fechamentoData.total.valor_frete + fechamentoData.total.valor_servico > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-blue-200 bg-white p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Distribuição</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${((fechamentoData.total.valor_frete / (fechamentoData.total.valor_frete + fechamentoData.total.valor_servico)) * 100).toFixed(1)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-green-700">
                          {((fechamentoData.total.valor_frete / (fechamentoData.total.valor_frete + fechamentoData.total.valor_servico)) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Frete</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Composição</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-purple-500"
                            style={{
                              width: `${((fechamentoData.total.valor_servico / (fechamentoData.total.valor_frete + fechamentoData.total.valor_servico)) * 100).toFixed(1)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-purple-700">
                          {((fechamentoData.total.valor_servico / (fechamentoData.total.valor_frete + fechamentoData.total.valor_servico)) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Serviços</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {refreshing && !loading && !loadingOrders ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando dados...
        </div>
      ) : null}

      {!loading && !loadingOrders && !hasData ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-base text-muted-foreground">
          Nenhum dado disponível para os filtros selecionados. Ajuste os parâmetros e tente novamente.
        </div>
      ) : null}

      {!loading && !loadingOrders && analytics ? (
        <>
          {/* SEÇÃO 2: ANÁLISE COMPARATIVA - Gráficos Principais */}
          
          {/* Gráfico Comparativo Semanal */}
          {currentWeekAnalytics && previousWeekAnalytics && (
            <ComparativeLineChart
              currentWeekData={currentWeekAnalytics.monthly_trends || []}
              previousWeekData={previousWeekAnalytics.monthly_trends || []}
              loading={loading}
              title="Receita: Esta Semana vs Semana Anterior"
            />
          )}

          {/* Gráficos de Análise Detalhada */}
          <div className="grid gap-6 md:grid-cols-2">
            <DailyRevenueChart
              orders={orders}
              loading={loadingOrders}
              days={30}
            />
            <StatusDistributionChart
              orders={orders}
              loading={loadingOrders}
            />
          </div>

          {/* Top Produtos com Variação */}
          <TopProductsChart
            currentProducts={analytics.top_products || []}
            previousProducts={previousWeekAnalytics?.top_products}
            loading={loading}
            limit={5}
          />

          {/* SEÇÃO 3: DETALHES E RANKINGS */}
          <div className="grid gap-6 md:grid-cols-2">
            <CriticalOrdersCard
              orders={orders}
              loading={loadingOrders}
            />
            <div className="space-y-4">
              <LeaderboardCard
                title="Top Vendedores"
                data={topSellers}
                emptyMessage="Nenhuma venda registrada para os filtros atuais."
              />
              <LeaderboardCard
                title="Top Designers"
                data={topDesigners}
                emptyMessage="Ainda não há designers com vendas registradas no período."
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// interface CardLastUpdatedProps {
//   timestamp?: string;
// }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// function CardLastUpdated({ timestamp }: CardLastUpdatedProps) {
//   return (
//     <div className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-6">
//       <div>
//         <h2 className="text-lg font-semibold text-slate-800">Última atualização</h2>
//         <p className="mt-2 text-base text-muted-foreground">
//           {timestamp
//             ? `Dados sincronizados em ${new Date(timestamp).toLocaleString('pt-BR')}.`
//             : 'Ainda não há informação sobre a última sincronização.'}
//         </p>
//       </div>
//       <p className="mt-6 text-sm text-muted-foreground">
//         Este painel calcula os dados a partir dos pedidos carregados do sistema e exibe uma visão consolidada da produção e vendas.
//       </p>
//     </div>
//   );
// }
