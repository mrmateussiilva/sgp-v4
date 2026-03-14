import { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Settings2, 
  TrendingUp,
  Zap,
  Layers,
  MousePointer2,
  CalendarDays,
  Info,
  Calculator,
  Terminal,
  BookOpen,
  ChevronRight,
  Calendar,
  Filter,
  CheckCircle2,
  BarChart
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { resourcesApi } from '@/api/endpoints/resources';
import { MaterialStatsResponse, RankingItem, MaterialEvolutionResponse } from '@/api/types';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const chartColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
];

const materialPalette = [
  { hex: '#3b82f6', bg: 'bg-blue-500', border: 'border-blue-200', text: 'text-blue-700', shadow: 'shadow-blue-100', icon: 'text-blue-500' },
  { hex: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-emerald-700', shadow: 'shadow-emerald-100', icon: 'text-emerald-500' },
  { hex: '#f59e0b', bg: 'bg-amber-500', border: 'border-amber-200', text: 'text-amber-700', shadow: 'shadow-amber-100', icon: 'text-amber-500' },
  { hex: '#ef4444', bg: 'bg-rose-500', border: 'border-rose-200', text: 'text-rose-700', shadow: 'shadow-rose-100', icon: 'text-rose-500' },
  { hex: '#6366f1', bg: 'bg-indigo-500', border: 'border-indigo-200', text: 'text-indigo-700', shadow: 'shadow-indigo-100', icon: 'text-indigo-500' },
  { hex: '#71717a', bg: 'bg-zinc-500', border: 'border-zinc-200', text: 'text-zinc-700', shadow: 'shadow-zinc-100', icon: 'text-zinc-500' },
];

export default function MaterialAnalysis() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MaterialStatsResponse | null>(null);
  const [evolution, setEvolution] = useState<MaterialEvolutionResponse | null>(null);
  
  // Filtros
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [dataInicio, setDataInicio] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(today.toISOString().split('T')[0]);
  const [tipoProducao, setTipoProducao] = useState<string>('all');
  const [tiposProducaoList, setTiposProducaoList] = useState<{ value: string; label: string }[]>([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ nome: string; itens: RankingItem[] } | null>(null);

  const fetchStats = async () => {
    setLoading(true);
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
    } catch (error) {
      logger.error('Erro ao buscar tipos de produção:', error);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchStats();
    }, 500);
    return () => clearTimeout(timeout);
  }, [dataInicio, dataFim, tipoProducao]);

  useEffect(() => {
    fetchTiposProducao();
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Análise de Materiais
          </h1>
          <p className="text-muted-foreground font-medium">Visão operacional de consumo e eficiência.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border shadow-sm backdrop-blur-sm bg-opacity-80">
          <Button 
            variant="outline" size="sm" 
            onClick={() => setIsMemoryModalOpen(true)}
            className="h-9 border-primary/20 hover:bg-primary/5 text-primary font-bold"
          >
            <Calculator className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Memória de Cálculo</span>
          </Button>

          <Separator orientation="vertical" className="h-9 hidden md:block" />

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="date" className="w-[140px] h-9 border-none bg-secondary/50 focus-visible:ring-1" 
              value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
            />
            <span className="text-muted-foreground font-bold">→</span>
            <Input 
              type="date" className="w-[140px] h-9 border-none bg-secondary/50 focus-visible:ring-1" 
              value={dataFim} onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          
          <Separator orientation="vertical" className="h-9 hidden md:block" />
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={tipoProducao} onValueChange={setTipoProducao}>
              <SelectTrigger className="w-[160px] h-9 border-none bg-secondary/50">
                <SelectValue placeholder="Produção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda a Produção</SelectItem>
                {tiposProducaoList.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="space-y-8">
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
                      <XAxis dataKey="data" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m²`} />
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
                        <Tooltip formatter={(v: number) => [`${v.toLocaleString()} m²`, 'Consumo']} />
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
                        <Card key={item.nome} className="border-none shadow-none bg-zinc-50 dark:bg-zinc-800/50 p-3 hover:bg-zinc-100 transition-colors cursor-pointer" onClick={() => setSelectedCategory({ nome: item.nome, itens: [item] })}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", color.bg)} />
                              <span className="font-bold text-sm truncate max-w-[150px]">{item.nome}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black">{item.area_total_m2.toLocaleString()} m²</span>
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
                  onViewDetails={() => setSelectedCategory({ nome: tipo, itens })}
                />
              ))}
            </div>
          </div>

          <MemoriaCalculoModal 
            isOpen={isMemoryModalOpen} 
            onClose={() => setIsMemoryModalOpen(false)} 
            dataInicio={dataInicio.split('-').reverse().join('/')}
            dataFim={dataFim.split('-').reverse().join('/')}
            stats={stats}
          />

          <CategoriaDetalhesModal 
            category={selectedCategory}
            onClose={() => setSelectedCategory(null)}
          />

          <NarrativeSummary stats={stats} />
        </div>
      </TooltipProvider>
    </div>
  );
}

const KpiCard = ({ title, value, icon, tooltip, colorClass }: any) => (
  <Card className={cn("border-none shadow-premium bg-white dark:bg-zinc-900 border-l-4 transition-all hover:translate-y-[-2px]", colorClass)}>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{title}</span>
              <Info className="w-3 h-3 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900 text-white border-zinc-800 text-[10px] max-w-[200px]">
            {tooltip}
          </TooltipContent>
        </UITooltip>
        <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-primary">
          {icon}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">{value}</div>
    </CardContent>
  </Card>
);

const NarrativeSummary = ({ stats }: any) => {
  if (!stats) return null;
  return (
    <Card className="border-none shadow-premium bg-white dark:bg-zinc-900 mt-8">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Análise Qualitativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed italic border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-lg">
          "A análise de dados sugere que a operação mantém um fluxo estável, com foco principal em materiais de ampla cobertura."
        </p>
        <div>
          <h2 className="text-lg font-bold">Resumo Executivo</h2>
          <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Neste período, processamos um total de <span className="font-extrabold text-primary">{stats?.kpis?.total_area_m2?.toLocaleString() || '0'} m²</span> de materiais.
            O principal destaque operacional foi o material <span className="font-bold">{stats?.kpis?.material_mais_usado || '---'}</span>, que liderou o consumo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const MemoriaCalculoModal = ({ isOpen, onClose, dataInicio, dataFim, stats }: any) => {
  if (!stats) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 bg-zinc-900 text-white">
          <DialogTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Memória de Cálculo & Metodologia</DialogTitle>
          <DialogDescription className="text-zinc-400">Detalhamento técnico do processamento de dados.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 font-bold text-sm uppercase text-primary"><BookOpen className="w-4 h-4" /> Metodologia</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Fórmula de Área</p>
                  <code className="text-sm font-mono block p-2 bg-white dark:bg-zinc-800 rounded border">Area = (L * A) * Quantidade</code>
                </Card>
                <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">Agrupamento</p>
                  <p className="text-xs">Os materiais são normalizados para letras maiúsculas e espaços extras são removidos para evitar duplicidade.</p>
                </Card>
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 font-bold text-sm uppercase text-primary"><Terminal className="w-4 h-4" /> Log de Processamento (Simulado)</h3>
              <div className="bg-zinc-900 rounded-lg p-4 font-mono text-[10px] text-zinc-300 leading-relaxed shadow-inner">
                <p className="text-emerald-400">[info] Iniciando análise: {dataInicio} até {dataFim}</p>
                <p>[data] Buscando itens na base de dados...</p>
                <p>[proc] Calculando metragem para {stats.kpis.total_itens} registros registrados...</p>
                <p className="text-blue-400 ml-2">item_idx_01: 2.00x1.50 (x1) {'\u2192'} 3.00m²</p>
                <p className="text-blue-400 ml-2">item_idx_02: 1.00x1.00 (x5) {'\u2192'} 5.00m²</p>
                <p>[aggreg] Consolidando categorias de materiais...</p>
                <p className="text-emerald-400 font-bold">[done] {stats?.kpis?.total_area_m2?.toFixed(2) || '0.00'}m² totalizados com sucesso.</p>
              </div>
            </section>
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose} variant="secondary" className="font-bold">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ProductionTypeCard = ({ tipo, itens, colorIndex, onViewDetails }: any) => {
  const totalArea = itens.reduce((acc: number, curr: any) => acc + curr.area_total_m2, 0);
  const color = materialPalette[colorIndex % materialPalette.length];
  // Pegamos os 3 materiais com mais área para o resumo do card
  const topItens = [...itens].sort((a: any, b: any) => b.area_total_m2 - a.area_total_m2).slice(0, 3);
  const othersCount = itens.length - 3;
  const dominantPercent = itens.length > 0 ? ((topItens[0].area_total_m2 / totalArea) * 100).toFixed(1) : '0';

  return (
    <Card 
      className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group bg-white dark:bg-zinc-900 overflow-hidden border-t-2"
      style={{ borderTopColor: color.hex }}
      onClick={onViewDetails}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-zinc-500">{tipo}</h3>
            <p className="text-xl font-black text-primary leading-none mt-1">{totalArea.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground uppercase">m²</span></p>
          </div>
          <Badge variant="secondary" className={cn("text-[9px] font-bold px-1.5 py-0", color.bg, "text-white border-none")}>
            {itens.length} MATERIAIS
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-4 pt-0 space-y-4">
        <div className="space-y-3">
          {topItens.map((item: any) => {
            const percent = ((item.area_total_m2 / totalArea) * 100);
            return (
              <div key={item.nome} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-600 truncate max-w-[150px]">{item.nome}</span>
                  <span className="font-black text-zinc-900 dark:text-zinc-100">{item.area_total_m2.toFixed(1)} m²</span>
                </div>
                <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", color.bg)} 
                    style={{ width: `${percent}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>

        {othersCount > 0 && (
          <p className="text-[10px] text-muted-foreground font-medium italic text-center">
            + {othersCount} materiais nesta categoria
          </p>
        )}

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", color.bg)} />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Dominância</span>
            </div>
            <span className="text-xs font-black text-primary">{dominantPercent}%</span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
            Percentual do material líder em relação ao total desta categoria.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const CategoriaDetalhesModal = ({ category, onClose }: any) => {
  if (!category) return null;
  const totalArea = category.itens.reduce((acc: number, curr: any) => acc + curr.area_total_m2, 0);
  
  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-zinc-900 text-white shrink-0">
          <div className="flex justify-between items-start w-full pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Package className="w-5 h-5 text-primary" /> {category.nome}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 font-medium">
                Detalhamento dos materiais processados em "{category.nome}".
              </DialogDescription>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black text-primary uppercase tracking-widest">Área Consolidada</p>
               <p className="text-2xl font-black">{totalArea.toFixed(1)} <span className="text-sm font-normal">m²</span></p>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6 bg-white dark:bg-zinc-950">
          <div className="space-y-3">
            {category.itens.map((item: any, i: number) => (
              <div key={item.nome} className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border group hover:border-primary/50 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-black text-[10px]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-sm tracking-tight">{item.nome}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{item.quantidade_itens} ocorrências registradas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-primary">{item.area_total_m2.toLocaleString()} m²</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {((item.area_total_m2 / totalArea) * 100).toFixed(1)}% da fatia
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex justify-end bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <Button onClick={onClose} variant="secondary" className="font-bold flex items-center gap-2">
            Fechar Detalhes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AnalysisSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
    <div className="grid gap-6 md:grid-cols-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
    </div>
    <Skeleton className="h-[400px] w-full rounded-xl" />
    <div className="grid gap-6 md:grid-cols-3">
      <Skeleton className="h-[300px] md:col-span-2 rounded-xl" />
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  </div>
);
