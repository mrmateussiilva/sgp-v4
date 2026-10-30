import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Settings2,
  TrendingUp,
  Zap,
  Layers,
  MousePointer2,
  Calendar,
  Filter,
  BarChart,
  Settings,
  FileText,
  Calculator
} from 'lucide-react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { resourcesApi, getCachedResourcesCatalogs } from '@/api/endpoints/resources';
import { usePageCacheStore } from '@/store/pageCacheStore';
import { MaterialStatsResponse, RankingItem, MaterialEvolutionResponse } from '@/api/types';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  MaterialConfig,
  MaterialConfigMap,
  MaterialDatePreset
} from '@/types/materialAnalysis';
import {
  calculateSmartLinearMeters,
  getConsumo,
  chartColors,
  materialPalette
} from '@/utils/materialAnalysisUtils';
import { KpiCard } from '@/components/materials/KpiCard';
import { NarrativeSummary } from '@/components/materials/NarrativeSummary';
import { ProductionTypeCard } from '@/components/materials/ProductionTypeCard';
import { MemoriaCalculoModal } from '@/components/materials/MemoriaCalculoModal';
import { MaterialConfigModal } from '@/components/materials/MaterialConfigModal';
import { CategoriaDetalhesModal } from '@/components/materials/CategoriaDetalhesModal';
import { AnalysisSkeleton } from '@/components/materials/AnalysisSkeleton';

// Re-exporting for backwards compatibility with tests and callers
export { calculateSmartLinearMeters, getConsumo };
export type { MaterialConfig, MaterialConfigMap };

export default function MaterialAnalysis() {
  const materialCache = usePageCacheStore((state) => state.materialAnalysisCache);
  const setMaterialAnalysisCache = usePageCacheStore((state) => state.setMaterialAnalysisCache);

  const [loading, setLoading] = useState(() => !materialCache.stats);
  const [stats, setStats] = useState<MaterialStatsResponse | null>(() => materialCache.stats);
  const [evolution, setEvolution] = useState<MaterialEvolutionResponse | null>(() => materialCache.evolution);

  const [dataInicio, setDataInicio] = useState(() => materialCache.dataInicio);
  const [dataFim, setDataFim] = useState(() => materialCache.dataFim);
  const [tipoProducao, setTipoProducao] = useState<string>(() => materialCache.tipoProducao);
  const [tiposProducaoList, setTiposProducaoList] = useState<{ value: string; label: string }[]>(() => {
    const cachedCatalog = getCachedResourcesCatalogs().tiposProducao;
    return cachedCatalog ?? materialCache.tiposProducao;
  });
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  const [materialConfigs, setMaterialConfigs] = useState<MaterialConfigMap>(() => {
    const saved = localStorage.getItem('sgp_material_configs');
    return saved ? JSON.parse(saved) : {};
  });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [materiaisList, setMateriaisList] = useState<any[]>([]);

  const fetchMateriais = async () => {
    try {
      const data = await resourcesApi.getMateriais();
      setMateriaisList(data.filter((m: any) => m.ativo));
    } catch (error) {
      logger.error('Erro ao buscar materiais', error);
    }
  };

  const saveConfig = (newConfigs: MaterialConfigMap) => {
    setMaterialConfigs(newConfigs);
    localStorage.setItem('sgp_material_configs', JSON.stringify(newConfigs));
  };

  const handleUpdateConfig = (nome: string, measure: 'm2' | 'linear' | 'unidade', width: number) => {
    const updated = { ...materialConfigs, [nome]: { medida: measure, larguraRolo: width } };
    saveConfig(updated);
  };

  const [selectedCategory, setSelectedCategory] = useState<{
    nome: string;
    itens: RankingItem[];
    tipoFiltro?: 'material' | 'tipo_producao' | 'todos';
  } | null>(null);

  // Date Presets Handler
  const handleDatePreset = (preset: MaterialDatePreset) => {
    const now = new Date();
    const formatISO = (d: Date) => d.toISOString().split('T')[0];
    const todayStr = formatISO(now);

    switch (preset) {
      case 'today':
        setDataInicio(todayStr);
        setDataFim(todayStr);
        break;
      case '7days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        setDataInicio(formatISO(d));
        setDataFim(todayStr);
        break;
      }
      case '30days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        setDataInicio(formatISO(d));
        setDataFim(todayStr);
        break;
      }
      case 'month': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        setDataInicio(formatISO(d));
        setDataFim(todayStr);
        break;
      }
      case 'lastMonth': {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        setDataInicio(formatISO(firstDay));
        setDataFim(formatISO(lastDay));
        break;
      }
    }
  };

  const activePreset = useMemo<MaterialDatePreset>(() => {
    const now = new Date();
    const formatISO = (d: Date) => d.toISOString().split('T')[0];
    const todayStr = formatISO(now);
    if (dataInicio === todayStr && dataFim === todayStr) return 'today';

    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    if (dataInicio === formatISO(d7) && dataFim === todayStr) return '7days';

    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    if (dataInicio === formatISO(d30) && dataFim === todayStr) return '30days';

    const dMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (dataInicio === formatISO(dMonth) && dataFim === todayStr) return 'month';

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    if (dataInicio === formatISO(lastMonthStart) && dataFim === formatISO(lastMonthEnd)) return 'lastMonth';

    return 'custom';
  }, [dataInicio, dataFim]);

  const lastQueryKeyRef = useRef(materialCache.lastQueryKey);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    setMaterialAnalysisCache({ dataInicio, dataFim, tipoProducao });
  }, [dataInicio, dataFim, tipoProducao, setMaterialAnalysisCache]);

  const fetchStats = async (forceRefresh = false) => {
    const queryKey = JSON.stringify({ dataInicio, dataFim, tipoProducao });
    const currentCache = usePageCacheStore.getState().materialAnalysisCache;
    const isSameQuery = queryKey === lastQueryKeyRef.current && Boolean(currentCache.stats);
    const isFresh = Date.now() - currentCache.lastFetchTime < 30000;

    if (!forceRefresh && isSameQuery && isFresh) {
      setLoading(false);
      return;
    }

    if (!currentCache.stats || queryKey !== lastQueryKeyRef.current) {
      setLoading(true);
    }
    lastQueryKeyRef.current = queryKey;

    try {
      const params = {
        data_inicio: dataInicio,
        data_fim: dataFim,
        tipo_producao: tipoProducao === 'all' ? undefined : tipoProducao
      };

      const [statsData, evolutionData] = await Promise.all([
        resourcesApi.getMaterialStats(params),
        resourcesApi.getMaterialEvolution(params)
      ]);

      setStats(statsData);
      setEvolution(evolutionData);
      setMaterialAnalysisCache({
        stats: statsData,
        evolution: evolutionData,
        lastQueryKey: queryKey,
        lastFetchTime: Date.now(),
      });
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de materiais:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as estatísticas de materiais.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTiposProducao = async () => {
    try {
      const tipos = await resourcesApi.getTiposProducaoAtivos();
      setTiposProducaoList(tipos);
      setMaterialAnalysisCache({ tiposProducao: tipos });
    } catch (error) {
      logger.error('Erro ao buscar tipos de produção:', error);
    }
  };

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      fetchStats(false);
      return;
    }
    const timeout = setTimeout(() => {
      fetchStats(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [dataInicio, dataFim, tipoProducao]);

  useEffect(() => {
    fetchTiposProducao();
    const handleSoftRefresh = () => {
      fetchStats(true);
    };
    window.addEventListener('sgp:soft-refresh', handleSoftRefresh);
    return () => window.removeEventListener('sgp:soft-refresh', handleSoftRefresh);
  }, []);

  const insights = useMemo(() => {
    if (!stats || !stats.ranking_materiais || stats.ranking_materiais.length === 0) return [];

    const results = [];
    const topMaterial = stats.ranking_materiais[0];
    const topFinish = stats.ranking_acabamentos && stats.ranking_acabamentos.length > 0 ? stats.ranking_acabamentos[0] : null;

    if (topMaterial) {
      results.push({
        icon: <Zap className="w-4 h-4 text-amber-500" />,
        text: `${topMaterial.nome} domina ${topMaterial.percentual_area}% do consumo total.`
      });
    }

    if (topFinish) {
      results.push({
        icon: <MousePointer2 className="w-4 h-4 text-blue-500" />,
        text: `${topFinish.nome} é o acabamento mais requisitado (${topFinish.quantidade_itens} usos).`
      });
    }

    if (stats.kpis.data_pico) {
      const parts = stats.kpis.data_pico.split('-');
      if (parts.length === 3) {
        const formattedDate = `${parts[2]}/${parts[1]}`;
        results.push({
          icon: <TrendingUp className="w-4 h-4 text-rose-500" />,
          text: `Pico de produção em ${formattedDate} com ${stats.kpis.m2_pico} m² consumidos.`
        });
      }
    }

    return results;
  }, [stats]);

  const improvedRanking = useMemo(() => {
    if (!stats || !stats.ranking_materiais) return [];
    const raw = stats.ranking_materiais;
    if (raw.length <= 5) return raw;

    const main = raw.slice(0, 5);
    const others = raw.slice(5);
    const othersArea = others.reduce((acc: number, curr: RankingItem) => acc + curr.area_total_m2, 0);
    const othersPercent = others.reduce((acc: number, curr: RankingItem) => acc + curr.percentual_area, 0);
    const othersItens = others.reduce((acc: number, curr: RankingItem) => acc + curr.quantidade_itens, 0);

    return [
      ...main,
      {
        nome: 'OUTROS',
        quantidade_itens: othersItens,
        area_total_m2: Number(othersArea.toFixed(2)),
        percentual_area: Number(othersPercent.toFixed(2))
      }
    ];
  }, [stats]);

  if (loading && !stats) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Análise de Materiais
          </h1>
          <p className="text-muted-foreground font-medium">Visão operacional de consumo e eficiência de bobinas e m².</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 bg-card p-2.5 rounded-xl border shadow-xs backdrop-blur-sm bg-opacity-80">
          <Button
            variant="default" size="sm"
            onClick={() => setSelectedCategory({ nome: 'Todos os Materiais', itens: stats?.ranking_materiais || [], tipoFiltro: 'todos' })}
            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Ver Fichas Detalhadas</span>
          </Button>

          <Button
            variant="outline" size="sm"
            onClick={() => { fetchMateriais(); setIsConfigModalOpen(true); }}
            className="h-9 border-primary/20 hover:bg-primary/5 text-primary font-bold"
          >
            <Settings className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Configurar Medidas</span>
          </Button>

          <Button
            variant="outline" size="sm"
            onClick={() => setIsMemoryModalOpen(true)}
            className="h-9 border-primary/20 hover:bg-primary/5 text-primary font-bold"
          >
            <Calculator className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Memória de Cálculo</span>
          </Button>

          <Separator orientation="vertical" className="h-8 hidden lg:block" />

          {/* Quick Date Presets Bar */}
          <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs">
            <button
              onClick={() => handleDatePreset('today')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                activePreset === 'today'
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hoje
            </button>
            <button
              onClick={() => handleDatePreset('7days')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                activePreset === '7days'
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              7d
            </button>
            <button
              onClick={() => handleDatePreset('30days')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                activePreset === '30days'
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              30d
            </button>
            <button
              onClick={() => handleDatePreset('month')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                activePreset === 'month'
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Este Mês
            </button>
            <button
              onClick={() => handleDatePreset('lastMonth')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                activePreset === 'lastMonth'
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mês Ant.
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              type="date"
              className="w-[125px] h-7 border-none bg-transparent p-0 text-xs focus-visible:ring-0"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <span className="text-muted-foreground text-xs font-bold">→</span>
            <Input
              type="date"
              className="w-[125px] h-7 border-none bg-transparent p-0 text-xs focus-visible:ring-0"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <Separator orientation="vertical" className="h-8 hidden lg:block" />

          {/* Production Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={tipoProducao} onValueChange={setTipoProducao}>
              <SelectTrigger className="w-[150px] h-9 border-none bg-secondary/50 text-xs">
                <SelectValue placeholder="Produção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">Toda a Produção</SelectItem>
                {tiposProducaoList.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value} className="text-xs">
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="space-y-8">
          {/* Top 4 KPIs */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Área Total Processada"
              value={`${stats?.kpis?.total_area_m2?.toLocaleString() || '0'} m²`}
              icon={<Package className="w-4 h-4" />}
              tooltip="Soma total das metragens de todos os itens produzidos no período selecionado."
              colorClass="border-l-blue-500"
            />
            <KpiCard
              title="Média de Produção Diária"
              value={`${stats?.kpis?.media_m2_dia?.toFixed(1) || '0.0'} m²`}
              icon={<TrendingUp className="w-4 h-4" />}
              tooltip="Média aritmética de m² produzidos por dia nos dias com produção ativa."
              colorClass="border-l-emerald-500"
            />
            <KpiCard
              title="Total de Itens"
              value={`${stats?.kpis?.total_itens?.toLocaleString() || '0'}`}
              icon={<Layers className="w-4 h-4" />}
              tooltip="Contagem total de peças individuais processadas."
              colorClass="border-l-amber-500"
            />
            <KpiCard
              title="Pico de Produção"
              value={`${stats?.kpis?.m2_pico?.toFixed(1) || '0.0'} m²`}
              icon={<Zap className="w-4 h-4" />}
              tooltip="O dia com o maior volume de produção registrado no intervalo."
              colorClass="border-l-rose-500"
            />
          </div>

          {/* Historical Evolution Chart */}
          <Card className="border-none shadow-premium bg-white dark:bg-zinc-900 overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart className="w-5 h-5 text-primary" /> Histórico de Produção
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[320px] w-full">
                {evolution?.evolucao && evolution.evolucao.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={evolution.evolucao.map(item => ({
                        data: item.data.split('-').reverse().slice(0, 2).join('/'),
                        Total: item.total,
                        ...item.top_materiais
                      }))}
                    >
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="data" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m²`} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                      <Area type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={3} fill="url(#colorTotal)" />
                      {evolution.top_3_nomes.map((nome, i) => (
                        <Line key={nome} type="monotone" dataKey={nome} stroke={chartColors[i % chartColors.length]} strokeWidth={2} dot={false} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-400 italic">Sem dados históricos.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Distribution by Material & Operational Insights */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-none shadow-premium bg-white dark:bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" /> Distribuição por Material
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="h-[280px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={improvedRanking}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}
                          dataKey="area_total_m2" nameKey="nome"
                        >
                          {improvedRanking.map((_e, i) => (
                            <Cell key={`cell-${i}`} fill={materialPalette[i % materialPalette.length].hex} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(_v: number, name: string, props: any) => { const c = getConsumo(name, props.payload.area_total_m2, props.payload.quantidade_itens || 0, materialConfigs); return [c.text, 'Consumo Estimado']; }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-[10px] font-black uppercase text-muted-foreground block">M² Total</span>
                      <span className="text-xl font-black text-primary">{stats?.kpis?.total_area_m2?.toLocaleString() || '0'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {improvedRanking.map((item, i) => {
                      const color = materialPalette[i % materialPalette.length];
                      return (
                        <Card
                          key={item.nome}
                          className="border-none shadow-none bg-zinc-50 dark:bg-zinc-800/50 p-3 hover:bg-zinc-100 transition-colors cursor-pointer"
                          onClick={() => setSelectedCategory({ nome: item.nome, itens: [item], tipoFiltro: 'material' })}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", color.bg)} />
                              <span className="font-bold text-sm truncate max-w-[150px]">{item.nome}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black">{getConsumo(item.nome, item.area_total_m2, item.quantidade_itens, materialConfigs).text}</span>
                              <span className="text-[10px] font-bold text-muted-foreground ml-2">{item.percentual_area}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div className={cn("h-full", color.bg)} style={{ width: `${item.percentual_area}%` }} />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-premium bg-gradient-to-br from-zinc-900 to-zinc-800 text-white">
                <CardHeader className="pb-3 border-b border-white/5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Inteligência Operacional
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {insights.map((insight, i) => (
                    <div key={i} className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="shrink-0">{insight.icon}</div>
                      <p className="text-[11px] font-medium leading-relaxed">{insight.text}</p>
                    </div>
                  ))}
                  {insights.length === 0 && <p className="text-[10px] text-zinc-400 italic">Nenhum insight disponível para este período.</p>}
                </CardContent>
              </Card>

              <Card className="border-none shadow-premium bg-white dark:bg-zinc-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" /> Top Acabamentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {(stats?.ranking_acabamentos || []).slice(0, 5).map((item) => (
                    <div key={item.nome} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-600 truncate">{item.nome}</span>
                      <Badge variant="secondary" className="font-black text-[10px]">{item.quantidade_itens}x</Badge>
                    </div>
                  ))}
                  {(stats?.kpis?.total_ilhos || 0) > 0 && (
                    <div className="mt-4 pt-4 border-t border-dashed border-zinc-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Consumo Estimado</p>
                          <h4 className="text-xs font-black">ILHÓS ADICIONADOS</h4>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black">{stats?.kpis?.total_ilhos?.toLocaleString() || '0'}</div>
                          <p className="text-[9px] font-bold text-primary">unidades</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Categories by Production Type */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 mt-8">
              <Layers className="w-5 h-5 text-primary" /> Consumo por Categoria de Produção
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stats?.por_tipo_producao && Object.entries(stats.por_tipo_producao).map(([tipo, itens], i) => (
                <ProductionTypeCard
                  key={tipo}
                  tipo={tipo}
                  itens={itens}
                  colorIndex={i}
                  configs={materialConfigs}
                  onViewDetails={() => setSelectedCategory({ nome: tipo, itens, tipoFiltro: 'tipo_producao' })}
                />
              ))}
            </div>
          </div>

          {/* Modals */}
          <MaterialConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            materiaisList={materiaisList}
            materialConfigs={materialConfigs}
            onUpdateConfig={handleUpdateConfig}
          />

          <MemoriaCalculoModal
            isOpen={isMemoryModalOpen}
            onClose={() => setIsMemoryModalOpen(false)}
            dataInicio={dataInicio.split('-').reverse().join('/')}
            dataFim={dataFim.split('-').reverse().join('/')}
            stats={stats}
          />

          <CategoriaDetalhesModal
            category={selectedCategory}
            configs={materialConfigs}
            dataInicio={dataInicio}
            dataFim={dataFim}
            tipoProducaoFiltro={tipoProducao}
            onUpdateConfig={handleUpdateConfig}
            onClose={() => setSelectedCategory(null)}
          />

          <NarrativeSummary stats={stats} />
        </div>
      </TooltipProvider>
    </div>
  );
}
