import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Boxes, ShoppingBag, DollarSign, TrendingUp, Info } from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import { api } from '@/services/api';
import {
  AnalyticsResponse,
  AnalyticsFilters,
  AnalyticsLeaderboardEntry,
  AnalyticsTopProduct,
} from '@/types';
import {
  AnalyticsFilterBar,
  AnalyticsFilterState,
  FilterOption,
} from '@/components/analytics/AnalyticsFilterBar';
import { SummaryCard } from '@/components/analytics/SummaryCard';
import { LeaderboardCard } from '@/components/analytics/LeaderboardCard';
import { TrendChartCard } from '@/components/analytics/TrendChartCard';
import { useToast } from '@/hooks/use-toast';
import { MOCK_ANALYTICS_RESPONSE } from '@/data/mockAnalytics';

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

const mapProductsToLeaderboard = (products: AnalyticsTopProduct[]): AnalyticsLeaderboardEntry[] =>
  products.map((product) => ({
    id: product.product_id,
    name: product.product_name,
    value: product.quantity,
  }));

const isAnalyticsEmpty = (data: AnalyticsResponse | null): boolean => {
  if (!data) return true;
  const summary = data.summary;

  const hasSummaryValues =
    Boolean(summary) &&
    (Boolean(summary.total_orders) ||
      Boolean(summary.total_items_produced) ||
      Boolean(summary.total_revenue) ||
      Boolean(summary.average_ticket));

  const hasCollections =
    (data.top_products?.length ?? 0) > 0 ||
    (data.top_sellers?.length ?? 0) > 0 ||
    (data.top_designers?.length ?? 0) > 0 ||
    (data.monthly_trends?.length ?? 0) > 0;

  return !hasSummaryValues && !hasCollections;
};

const shouldUseMockAnalytics = (): boolean => {
  const flag = (import.meta.env.VITE_ANALYTICS_USE_MOCK ?? '').toString().toLowerCase();
  if (flag === 'true') {
    return true;
  }
  if (flag === 'false') {
    return false;
  }
  // Default: habilita mock em ambiente de desenvolvimento quando a API ainda não responde.
  return Boolean(import.meta.env.DEV);
};

export default function PainelDesempenho() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AnalyticsFilterState>(initialFilterState);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
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

  const loadAnalytics = useCallback(
    async (filtersPayload: AnalyticsFilters, isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);

        const response = await analyticsService.getAnalytics(filtersPayload);

        const effectiveData =
          isAnalyticsEmpty(response) && shouldUseMockAnalytics()
            ? (() => {
                console.info(
                  '[PainelDesempenho] Nenhum dado retornado pelo backend. Carregando dataset mock para visualização.',
                );
                return MOCK_ANALYTICS_RESPONSE;
              })()
            : response;

        setAnalytics(effectiveData);

        if (effectiveData.available_product_types) {
          setProductTypes(
            effectiveData.available_product_types.map((name) => ({
              value: name,
              label: name,
            })),
          );
        }
      } catch (loadError) {
        console.error('Erro ao buscar analytics:', loadError);
        if (shouldUseMockAnalytics()) {
          console.info('[PainelDesempenho] API indisponível. Utilizando dataset mock para manter a visualização.');
          setAnalytics(MOCK_ANALYTICS_RESPONSE);
          setProductTypes(
            MOCK_ANALYTICS_RESPONSE.available_product_types?.map((name) => ({
              value: name,
              label: name,
            })) ?? [],
          );
          setError('API de analytics indisponível no momento. Mostrando dados de exemplo para visualização.');
        } else {
          setError('Não foi possível carregar os dados de desempenho. Tente novamente mais tarde.');
          toast({
            title: 'Falha ao carregar painel',
            description:
              loadError instanceof Error ? loadError.message : 'Erro inesperado ao consultar o backend.',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    loadCatalogs();
    const initialPayload = buildFiltersPayload(initialFilterState);
    loadAnalytics(initialPayload, true);
  }, [buildFiltersPayload, loadAnalytics, loadCatalogs]);

  const handleFiltersChange = (changes: Partial<AnalyticsFilterState>) => {
    setFilters((previous) => ({
      ...previous,
      ...changes,
    }));
  };

  const handleApplyFilters = () => {
    const payload = buildFiltersPayload(filters);
    loadAnalytics(payload, false);
  };

  const handleResetFilters = () => {
    setFilters(initialFilterState);
    const payload = buildFiltersPayload(initialFilterState);
    loadAnalytics(payload, false);
  };

  const summaryCards = useMemo(() => {
    if (!analytics) {
      return null;
    }
    const summary = analytics.summary;
    if (!summary) {
      return null;
    }
    return [
      {
        title: 'Total de pedidos',
        value: numberFormatter.format(summary.total_orders ?? 0),
        icon: <ShoppingBag className="h-5 w-5" />,
      },
      {
        title: 'Itens produzidos',
        value: numberFormatter.format(summary.total_items_produced ?? 0),
        icon: <Boxes className="h-5 w-5" />,
      },
      {
        title: 'Receita total',
        value: currencyFormatter.format(summary.total_revenue ?? 0),
        icon: <DollarSign className="h-5 w-5" />,
      },
      {
        title: 'Ticket médio',
        value: currencyFormatter.format(summary.average_ticket ?? 0),
        icon: <TrendingUp className="h-5 w-5" />,
      },
    ];
  }, [analytics]);

  const topProducts = useMemo(
    () => mapProductsToLeaderboard((analytics?.top_products ?? []).slice(0, 5)),
    [analytics?.top_products],
  );
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

      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary-800">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" />
        <div>
          <p className="font-medium uppercase tracking-[0.08em]">Prévia em desenvolvimento</p>
          <p className="mt-1 text-primary-700">
            Esta página ainda está em construção. Os dados exibidos são demonstrativos e servem apenas como preview do layout final.
          </p>
        </div>
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

      {loading ? (
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
            <SummaryCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
          ))}
        </div>
      ) : null}

      {refreshing && !loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando dados...
        </div>
      ) : null}

      {!loading && !hasData ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-base text-muted-foreground">
          Nenhum dado disponível para os filtros selecionados. Ajuste os parâmetros e tente novamente.
        </div>
      ) : null}

      {!loading && analytics ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <TrendChartCard
              title="Produção x Receita (mensal)"
              data={analytics.monthly_trends ?? []}
              loading={loading}
            />
            <div className="space-y-4 lg:col-span-1">
              <LeaderboardCard
                title="Itens mais produzidos"
                data={topProducts}
                emptyMessage="Não há itens produzidos no período selecionado."
              />
              <LeaderboardCard
                title="Top Designers"
                data={topDesigners}
                emptyMessage="Ainda não há designers com vendas registradas no período."
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <LeaderboardCard
              title="Top Vendedores"
              data={topSellers}
              emptyMessage="Nenhuma venda registrada para os filtros atuais."
            />
            <CardLastUpdated timestamp={analytics.last_updated} />
          </div>
        </>
      ) : null}
    </div>
  );
}

interface CardLastUpdatedProps {
  timestamp?: string;
}

function CardLastUpdated({ timestamp }: CardLastUpdatedProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Última atualização</h2>
        <p className="mt-2 text-base text-muted-foreground">
          {timestamp
            ? `Dados sincronizados em ${new Date(timestamp).toLocaleString('pt-BR')}.`
            : 'Ainda não há informação sobre a última sincronização.'}
        </p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Este painel consulta o endpoint <code className="rounded bg-slate-100 px-1 py-0.5">/analytics</code>{' '}
        com os filtros aplicados e exibe uma visão consolidada da produção e vendas.
      </p>
    </div>
  );
}
