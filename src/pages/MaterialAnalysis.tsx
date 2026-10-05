import { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Settings2, 
  TrendingUp,
  Zap,
  Layers,
  MousePointer2,
  Info,
  Calculator,
  Terminal,
  BookOpen,
  Calendar,
  Filter,
  BarChart,
  Settings,
  FileText,
  Search,
  Copy,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  RefreshCw,
  Pencil,
  RotateCcw,
  Sparkles,
  Undo2
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { apiClient } from '@/api/client';
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


export interface MaterialConfig {
  medida: 'm2' | 'linear' | 'unidade';
  larguraRolo: number;
}
export type MaterialConfigMap = Record<string, MaterialConfig>;

export const calculateSmartLinearMeters = (
  largura: number,
  altura: number,
  quantidade: number,
  areaM2: number,
  larguraRolo: number,
  mode: 'encaixe' | 'area' = 'encaixe'
): number => {
  const rolo = larguraRolo > 0 ? larguraRolo : 1.5;
  const qtd = quantidade > 0 ? quantidade : 1;

  if (mode === 'area' || largura <= 0 || altura <= 0) {
    return Number(((areaM2 || 0) / rolo).toFixed(2));
  }

  // Se a largura cabe na largura do rolo, o rolo avança pela altura da peça
  if (largura <= rolo && altura <= rolo) {
    // Cabe em qualquer orientação, escolhe a que consome menos metragem linear
    return Number((Math.min(largura, altura) * qtd).toFixed(2));
  } else if (largura <= rolo) {
    return Number((altura * qtd).toFixed(2));
  } else if (altura <= rolo) {
    // Girada 90 graus para caber na largura do rolo
    return Number((largura * qtd).toFixed(2));
  } else {
    // Ambos maiores que a largura do rolo -> Necessita de emenda
    // Calcula o número de passadas pelo menor lado e multiplica pelo maior
    const menorLado = Math.min(largura, altura);
    const maiorLado = Math.max(largura, altura);
    const passadas = Math.ceil(menorLado / rolo);
    return Number((passadas * maiorLado * qtd).toFixed(2));
  }
};

export const getConsumo = (nome: string, area_m2: number, quantidade_itens: number, configs?: MaterialConfigMap) => {
  const safeConfigs = configs || {};
  const safeNome = nome || '';
  const config = safeConfigs[safeNome] || safeConfigs[safeNome.toUpperCase()];
  if (!config || config.medida === 'm2') {
    return { value: area_m2 || 0, text: `${(area_m2 || 0).toLocaleString(undefined, {maximumFractionDigits:2})} m²`, label: 'm²' };
  }
  if (config.medida === 'unidade') {
    return { value: quantidade_itens || 0, text: `${(quantidade_itens || 0).toLocaleString()} un`, label: 'unidades' };
  }
  if (config.medida === 'linear') {
    const largura = config.larguraRolo || 1;
    const lineares = (area_m2 || 0) / (largura || 1);
    return { value: lineares, text: `${lineares.toLocaleString(undefined, {maximumFractionDigits:2})} m lin.`, label: 'm linear' };
  }
  return { value: area_m2 || 0, text: `${(area_m2 || 0).toLocaleString(undefined, {maximumFractionDigits:2})} m²`, label: 'm²' };
};

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
            variant="default" size="sm" 
            onClick={() => setSelectedCategory({ nome: 'Todos os Materiais', itens: stats?.ranking_materiais || [], tipoFiltro: 'todos' })}
            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Ver Fichas Detalhadas</span>
          </Button>

          <Button 
            variant="outline" size="sm" 
            onClick={() => { fetchMateriais(); setIsConfigModalOpen(true); }}
            className="h-9 border-primary/20 hover:bg-primary/5 text-primary font-bold"
          >
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Configurar Medidas</span>
          </Button>

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
                        <Card key={item.nome} className="border-none shadow-none bg-zinc-50 dark:bg-zinc-800/50 p-3 hover:bg-zinc-100 transition-colors cursor-pointer" onClick={() => setSelectedCategory({ nome: item.nome, itens: [item], tipoFiltro: 'material' })}>
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

          
          <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
              <DialogHeader className="p-6 bg-zinc-900 text-white shrink-0">
                <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Configuração de Medidas dos Materiais</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Defina se um material é contabilizado em Metros Quadrados (m²), Metros Lineares ou Unidades.
                  Isso ajustará os valores estimados mostrados nos cards e rankings, enquanto a área total continua sendo medida em m².
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materiaisList.map((mat) => {
                    const cfg = materialConfigs[mat.nome] || { medida: 'm2', larguraRolo: 1.5 };
                    return (
                      <Card key={mat.id} className="p-4 shadow-sm border-none bg-white dark:bg-zinc-900">
                        <div className="font-bold text-sm mb-2 truncate" title={mat.nome}>{mat.nome}</div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Unidade de Medida</label>
                            <Select 
                              value={cfg.medida} 
                              onValueChange={(val: any) => handleUpdateConfig(mat.nome, val, cfg.larguraRolo)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-zinc-50 border border-zinc-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="m2">Metros Quadrados (m²)</SelectItem>
                                <SelectItem value="linear">Metro Linear</SelectItem>
                                <SelectItem value="unidade">Unidades</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {cfg.medida === 'linear' && (
                            <div className="space-y-1 mt-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Largura do Rolo (m)</label>
                              <Input 
                                type="number" step="0.01" min="0.1" 
                                className="h-8 text-xs bg-zinc-50 border border-zinc-200"
                                value={cfg.larguraRolo} 
                                onChange={(e) => handleUpdateConfig(mat.nome, cfg.medida, parseFloat(e.target.value) || 1)}
                              />
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                  {materiaisList.length === 0 && (
                    <div className="col-span-full py-10 text-center text-muted-foreground text-sm font-medium">
                      Carregando materiais...
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t flex justify-end bg-white dark:bg-zinc-950 shrink-0">
                <Button onClick={() => setIsConfigModalOpen(false)} className="font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                  Concluir
                </Button>
              </div>
            </DialogContent>
          </Dialog>

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

const ProductionTypeCard = ({ tipo, itens, colorIndex, onViewDetails, configs }: any) => {
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
                  <span className="font-black text-zinc-900 dark:text-zinc-100">{getConsumo(item.nome, item.area_total_m2, item.quantidade_itens || 0, configs).text}</span>
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

interface FichaItemDetail {
  id: string;
  pedidoNumero: string;
  cliente: string;
  dataEntrada: string;
  dataEntrega?: string;
  tipoProducao: string;
  material: string;
  materialRaw: string;
  descricao: string;
  largura: string;
  altura: string;
  larguraNum: number;
  alturaNum: number;
  quantidade: number;
  areaItemM2: number;
  areaTotalM2: number;
  acabamentos: string[];
  designer?: string;
  observacao?: string;
  isAlerta: boolean;
  alertaMotivo: string;
}

const parseDecimalVal = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const raw = String(val).trim();
  if (!raw) return 0;
  let filtered = raw.replace(/\s+/g, '');
  if (filtered.includes(',') && filtered.includes('.')) {
    if (filtered.lastIndexOf(',') > filtered.lastIndexOf('.')) {
      filtered = filtered.replace(/\./g, '').replace(',', '.');
    } else {
      filtered = filtered.replace(/,/g, '');
    }
  } else if (filtered.includes(',')) {
    filtered = filtered.replace(',', '.');
  }
  const clean = filtered.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const calculateItemAreaM2 = (item: any): number => {
  const m2 = parseDecimalVal(item.metro_quadrado);
  if (m2 > 0) return m2;
  const l = parseDecimalVal(item.largura);
  const a = parseDecimalVal(item.altura);
  const calc = l * a;
  if (calc > 0) return calc;
  return 1.0;
};

const getItemQuantidade = (item: any): number => {
  for (const field of ['quantidade_paineis', 'quantidade_lona', 'quantidade_adesivo', 'quantidade_totem', 'quantidade']) {
    const q = parseDecimalVal(item[field]);
    if (q > 0) return q;
  }
  return 1.0;
};

const getItemAcabamentos = (item: any): string[] => {
  const list: string[] = [];
  if (item.acabamento) {
    if (item.acabamento.overloque) list.push('Overloque');
    if (item.acabamento.elastico) list.push('Elástico');
    if (item.acabamento.ilhos) {
      const q = parseDecimalVal(item.quantidade_ilhos);
      list.push(q > 0 ? `Ilhós (${q})` : 'Ilhós');
    }
  }
  if (item.emenda && item.emenda !== 'sem-emenda' && item.emenda !== 'nenhuma') {
    list.push(`Emenda ${item.emenda}`);
  }
  if (item.acabamento_totem && item.acabamento_totem !== 'sem_pe') {
    list.push(item.acabamento_totem === 'com_pe' ? 'Com Pé' : item.acabamento_totem);
  }
  if (item.acabamento_lona) {
    list.push(item.acabamento_lona);
  }
  return list;
};

const CategoriaDetalhesModal = ({ 
  category, 
  onClose, 
  configs,
  dataInicio,
  dataFim,
  tipoProducaoFiltro,
  onUpdateConfig
}: {
  category: { nome: string; itens: RankingItem[]; tipoFiltro?: 'material' | 'tipo_producao' | 'todos' } | null;
  onClose: () => void;
  configs: MaterialConfigMap;
  dataInicio: string;
  dataFim: string;
  tipoProducaoFiltro?: string;
  onUpdateConfig?: (nome: string, measure: 'm2' | 'linear' | 'unidade', width: number) => void;
}) => {
  const [fichas, setFichas] = useState<FichaItemDetail[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState<'fichas' | 'resumo' | 'diagnostico'>('fichas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedTipo, setSelectedTipo] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 40;

  // Manual linear meters overrides stored in localStorage
  const [linearOverrides, setLinearOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sgp_linear_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [calcMode, setCalcMode] = useState<'encaixe' | 'area'>('encaixe');
  const [onlyOverrides, setOnlyOverrides] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>('');

  const handleSaveOverride = (itemId: string, val: number) => {
    if (isNaN(val) || val < 0) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um número válido maior ou igual a zero.',
        variant: 'destructive',
      });
      return;
    }
    const updated = { ...linearOverrides, [itemId]: val };
    setLinearOverrides(updated);
    try {
      localStorage.setItem('sgp_linear_overrides', JSON.stringify(updated));
    } catch (e) {
      logger.error('Erro ao salvar override no localStorage', e);
    }
    toast({
      title: 'Metragem linear ajustada!',
      description: `Item definido manualmente como ${val.toFixed(2)} m linear.`,
    });
    setEditingItemId(null);
  };

  const handleResetOverride = (itemId: string) => {
    const updated = { ...linearOverrides };
    delete updated[itemId];
    setLinearOverrides(updated);
    try {
      localStorage.setItem('sgp_linear_overrides', JSON.stringify(updated));
    } catch (e) {
      logger.error('Erro ao atualizar localStorage', e);
    }
    toast({
      title: 'Cálculo restaurado',
      description: 'O item voltou a usar o cálculo automático.',
    });
  };

  const handleClearAllOverrides = () => {
    setLinearOverrides({});
    try {
      localStorage.removeItem('sgp_linear_overrides');
    } catch {}
    toast({
      title: 'Ajustes limpos',
      description: 'Todos os itens voltaram ao cálculo automático.',
    });
  };

  useEffect(() => {
    if (!category) {
      setFichas([]);
      setSearchQuery('');
      setCurrentPage(1);
      return;
    }

    // Determine initial material & production type filters
    if (category.tipoFiltro === 'material') {
      if (category.nome.toUpperCase() === 'OUTROS') {
        setSelectedMaterial('all');
      } else {
        setSelectedMaterial(category.nome.toUpperCase());
      }
      setSelectedTipo('all');
    } else if (category.tipoFiltro === 'tipo_producao') {
      setSelectedTipo(category.nome.toUpperCase());
      setSelectedMaterial('all');
    } else {
      setSelectedMaterial('all');
      if (tipoProducaoFiltro && tipoProducaoFiltro !== 'all') {
        setSelectedTipo(tipoProducaoFiltro.toUpperCase());
      } else {
        setSelectedTipo('all');
      }
    }

    let active = true;
    setLoadingOrders(true);

    const loadOrders = async () => {
      try {
        const params: Record<string, any> = {
          data_inicio: dataInicio,
          data_fim: dataFim,
          limit: 2000,
        };

        const response = await apiClient.get<any>('/pedidos/', { params });
        if (!active) return;

        // Axios stores the payload inside response.data
        const rawData: any = response?.data;
        const pedidosList: any[] = Array.isArray(rawData) ? rawData : (rawData?.pedidos || rawData?.items || []);
        const parsed: FichaItemDetail[] = [];

        for (const ped of pedidosList) {
          const statusLower = (ped.status || '').toLowerCase();
          if (statusLower === 'cancelado') continue;

          const num = ped.numero ? String(ped.numero).padStart(6, '0') : (ped.id ? String(ped.id) : 'S/N');
          const cliente = ped.cliente || 'Sem Cliente';
          const dataEntrada = ped.data_entrada || '';
          const dataEntrega = ped.data_entrega || '';

          const rawItems = ped.items || ped.itens || [];
          let items: any[] = [];
          try {
            if (typeof rawItems === 'string') {
              items = JSON.parse(rawItems);
            } else if (Array.isArray(rawItems)) {
              items = rawItems;
            }
          } catch {
            items = [];
          }

          items.forEach((it: any, idx: number) => {
            const tecRaw = (it.tecido || '').trim();
            const tecNorm = (tecRaw || 'NÃO INFORMADO').toUpperCase();
            const tpRaw = (it.tipo_producao || 'GERAL').trim().toUpperCase();
            const qtd = getItemQuantidade(it);
            const areaItem = calculateItemAreaM2(it);
            const areaTot = areaItem * qtd;
            const largNum = parseDecimalVal(it.largura);
            const altNum = parseDecimalVal(it.altura);

            let isAlerta = false;
            let alertaMotivo = '';
            if (!tecRaw || tecNorm === 'NÃO INFORMADO') {
              isAlerta = true;
              alertaMotivo = 'Material/tecido não preenchido';
            } else if (areaItem <= 0) {
              isAlerta = true;
              alertaMotivo = 'Área do item zerada ou inválida';
            } else if (largNum > 50 || altNum > 50) {
              isAlerta = true;
              alertaMotivo = 'Dimensão atípica (> 50m)';
            }

            parsed.push({
              id: `${num}-${idx}-${it.id || ''}`,
              pedidoNumero: num,
              cliente,
              dataEntrada,
              dataEntrega,
              tipoProducao: tpRaw,
              material: tecNorm,
              materialRaw: tecRaw,
              descricao: it.descricao || 'Sem descrição',
              largura: it.largura || '',
              altura: it.altura || '',
              larguraNum: largNum,
              alturaNum: altNum,
              quantidade: qtd,
              areaItemM2: areaItem,
              areaTotalM2: areaTot,
              acabamentos: getItemAcabamentos(it),
              designer: it.designer,
              observacao: it.observacao,
              isAlerta,
              alertaMotivo,
            });
          });
        }

        setFichas(parsed);
      } catch (err) {
        logger.error('Erro ao carregar fichas detalhadas:', err);
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os detalhes dos pedidos.',
          variant: 'destructive',
        });
      } finally {
        if (active) setLoadingOrders(false);
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [category, dataInicio, dataFim, tipoProducaoFiltro]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMaterial, selectedTipo, searchQuery, onlyOverrides]);

  // Active roll width for selected material
  const currentMaterialConfig = useMemo(() => {
    if (selectedMaterial === 'all') return null;
    return configs[selectedMaterial] || configs[selectedMaterial.toUpperCase()] || { medida: 'm2', larguraRolo: 1.5 };
  }, [configs, selectedMaterial]);

  const activeRollWidth = currentMaterialConfig?.larguraRolo || 1.5;

  const handleUpdateRollWidth = (newWidth: number) => {
    if (selectedMaterial !== 'all' && onUpdateConfig) {
      const currentMedida = currentMaterialConfig?.medida || 'linear';
      onUpdateConfig(selectedMaterial, currentMedida, newWidth);
      toast({
        title: 'Largura do rolo atualizada',
        description: `${selectedMaterial}: rolo configurado para ${newWidth}m.`,
      });
    }
  };

  // Helper to compute metrics for any item
  const getItemMetrics = (item: FichaItemDetail) => {
    const matConfig = configs[item.material] || configs[item.material.toUpperCase()] || { medida: 'm2', larguraRolo: 1.5 };
    const rWidth = (selectedMaterial === item.material && currentMaterialConfig) ? activeRollWidth : (matConfig.larguraRolo || 1.5);
    const autoLinear = calculateSmartLinearMeters(item.larguraNum, item.alturaNum, item.quantidade, item.areaTotalM2, rWidth, calcMode);
    
    const isOverridden = linearOverrides[item.id] !== undefined;
    const effectiveLinear = isOverridden ? linearOverrides[item.id] : autoLinear;

    return {
      autoLinear,
      effectiveLinear,
      isOverridden,
      rollWidth: rWidth,
      medida: matConfig.medida,
    };
  };

  // Aggregate stats across all loaded fichas
  const materialAggregates = useMemo(() => {
    const map: Record<string, { count: number; area: number; pecas: number; linear: number; overrides: number }> = {};
    for (const f of fichas) {
      if (!map[f.material]) {
        map[f.material] = { count: 0, area: 0, pecas: 0, linear: 0, overrides: 0 };
      }
      const { effectiveLinear, isOverridden } = getItemMetrics(f);
      map[f.material].count++;
      map[f.material].area += f.areaTotalM2;
      map[f.material].pecas += f.quantidade;
      map[f.material].linear += effectiveLinear;
      if (isOverridden) map[f.material].overrides++;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].area - a[1].area)
      .map(([nome, d]) => ({ nome, ...d }));
  }, [fichas, linearOverrides, calcMode, configs, activeRollWidth]);

  const tipoProducaoList = useMemo(() => {
    const set = new Set<string>();
    for (const f of fichas) {
      if (f.tipoProducao) set.add(f.tipoProducao);
    }
    return Array.from(set).sort();
  }, [fichas]);

  // Filtered fichas
  const filteredFichas = useMemo(() => {
    return fichas.filter((f) => {
      if (onlyOverrides && linearOverrides[f.id] === undefined) {
        return false;
      }
      if (selectedMaterial !== 'all') {
        const mat = (f.material || '').toUpperCase().trim();
        const sel = selectedMaterial.toUpperCase().trim();
        if (mat !== sel && !mat.includes(sel) && !sel.includes(mat)) {
          return false;
        }
      }
      if (selectedTipo !== 'all') {
        const norm = (s: string) => (s || '').toUpperCase().replace(/[\s_-]+/g, '');
        if (norm(f.tipoProducao) !== norm(selectedTipo)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mNum = f.pedidoNumero.toLowerCase().includes(q);
        const mCli = f.cliente.toLowerCase().includes(q);
        const mDesc = f.descricao.toLowerCase().includes(q);
        const mMat = f.material.toLowerCase().includes(q);
        const mAcab = f.acabamentos.some(a => a.toLowerCase().includes(q));
        if (!mNum && !mCli && !mDesc && !mMat && !mAcab) {
          return false;
        }
      }
      return true;
    });
  }, [fichas, selectedMaterial, selectedTipo, searchQuery, onlyOverrides, linearOverrides]);

  const filteredAlertas = useMemo(() => {
    return filteredFichas.filter(f => f.isAlerta);
  }, [filteredFichas]);

  // KPIs for filtered fichas
  const kpis = useMemo(() => {
    let area = 0;
    let pecas = 0;
    let totalLinear = 0;
    let overridesCount = 0;

    for (const f of filteredFichas) {
      area += f.areaTotalM2;
      pecas += f.quantidade;
      const { effectiveLinear, isOverridden } = getItemMetrics(f);
      totalLinear += effectiveLinear;
      if (isOverridden) overridesCount++;
    }

    return {
      fichasCount: filteredFichas.length,
      pecasCount: pecas,
      areaTotalM2: area,
      totalLinearMeters: totalLinear,
      overridesCount,
    };
  }, [filteredFichas, linearOverrides, calcMode, configs, activeRollWidth]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFichas.length / pageSize));
  const paginatedFichas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFichas.slice(start, start + pageSize);
  }, [filteredFichas, currentPage, pageSize]);

  // Export to TSV / Clipboard
  const handleCopyTSV = () => {
    if (filteredFichas.length === 0) return;
    const headers = [
      'Pedido', 'Cliente', 'Data Entrada', 'Tipo Produção', 
      'Material', 'Descrição', 'Largura (m)', 'Altura (m)', 
      'Quantidade', 'Área Item (m²)', 'Área Total (m²)', 
      'Metros Lineares (m)', 'Cálculo Linear', 'Acabamentos'
    ];
    const rows = filteredFichas.map(f => {
      const { effectiveLinear, isOverridden } = getItemMetrics(f);
      return [
        f.pedidoNumero,
        `"${f.cliente.replace(/"/g, '""')}"`,
        f.dataEntrada,
        f.tipoProducao,
        f.material,
        `"${f.descricao.replace(/"/g, '""')}"`,
        f.largura,
        f.altura,
        f.quantidade,
        f.areaItemM2.toFixed(2),
        f.areaTotalM2.toFixed(2),
        effectiveLinear.toFixed(2),
        isOverridden ? 'Manual (Ajustado)' : `Automático (${calcMode === 'encaixe' ? 'Encaixe Real' : 'Área ÷ Rolo'})`,
        `"${f.acabamentos.join(', ')}"`
      ];
    });

    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      toast({
        title: 'Tabela copiada!',
        description: `${filteredFichas.length} registros copiados com as metragens lineares ajustadas.`,
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!category) return null;

  const totalAreaGeral = category.itens.reduce((acc: number, curr: any) => acc + curr.area_total_m2, 0);

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950 border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 bg-zinc-900 text-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-primary border-primary/30 uppercase text-[10px] font-black tracking-widest px-2 py-0.5">
                  Conferência & Edição de Metragem
                </Badge>
                <span className="text-zinc-400 text-xs font-mono">
                  {dataInicio.split('-').reverse().join('/')} → {dataFim.split('-').reverse().join('/')}
                </span>
                {kpis.overridesCount > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">
                    {kpis.overridesCount} {kpis.overridesCount === 1 ? 'item ajustado manualmente' : 'itens ajustados manualmente'}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                {category.nome}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                Valide e edite diretamente a metragem linear das fichas. Clique no lápis em qualquer linha para ajustar.
              </DialogDescription>
            </div>

            {/* Quick KPI Strip in Header */}
            <div className="flex items-center gap-3 bg-zinc-800/80 p-2.5 rounded-xl border border-zinc-700/50">
              <div className="text-right px-2 border-r border-zinc-700">
                <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Fichas</span>
                <span className="text-lg font-black text-white">{kpis.fichasCount}</span>
              </div>
              <div className="text-right px-2 border-r border-zinc-700">
                <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Área Total</span>
                <span className="text-lg font-black text-white">{kpis.areaTotalM2.toFixed(1)} <span className="text-xs font-normal">m²</span></span>
              </div>
              <div className="text-right px-2">
                <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                  M. Linear Total
                </span>
                <span className="text-lg font-black text-amber-400">
                  {kpis.totalLinearMeters.toFixed(2)} <span className="text-xs font-normal">m lin.</span>
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs Bar */}
        <div className="border-b bg-zinc-50 dark:bg-zinc-900/60 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full sm:w-auto">
            <TabsList className="bg-zinc-200/70 dark:bg-zinc-800">
              <TabsTrigger value="fichas" className="gap-2 text-xs font-bold">
                <FileText className="w-3.5 h-3.5" />
                Fichas Detalhadas ({filteredFichas.length})
              </TabsTrigger>
              <TabsTrigger value="resumo" className="gap-2 text-xs font-bold">
                <BarChart className="w-3.5 h-3.5" />
                Resumo por Material ({materialAggregates.length})
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="gap-2 text-xs font-bold">
                <AlertTriangle className={cn("w-3.5 h-3.5", filteredAlertas.length > 0 ? "text-amber-500" : "text-zinc-400")} />
                Diagnóstico {filteredAlertas.length > 0 && `(${filteredAlertas.length})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTSV}
              disabled={filteredFichas.length === 0}
              className="h-8 text-xs font-bold gap-1.5 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar p/ Excel'}
            </Button>
          </div>
        </div>

        {/* Tab 1: Fichas Detalhadas */}
        {activeTab === 'fichas' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
            {/* Search and Filters Bar */}
            <div className="p-4 border-b bg-white dark:bg-zinc-950 space-y-2.5 shrink-0">
              {/* Row 1: Primary Search & Selects */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por pedido #, cliente, descrição, acabamento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-zinc-50/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Material Dropdown Filter */}
                <div className="w-[200px] shrink-0">
                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Material / Tecido" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      <SelectItem value="all" className="text-xs font-bold">
                        Todos os Materiais ({fichas.length})
                      </SelectItem>
                      {materialAggregates.map(mat => (
                        <SelectItem key={mat.nome} value={mat.nome} className="text-xs">
                          <span className="font-semibold">{mat.nome}</span>
                          <span className="text-muted-foreground ml-1.5 text-[11px]">({mat.count})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo Produção Filter */}
                <div className="w-[170px] shrink-0">
                  <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Tipo de Produção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs font-bold">Todos os Tipos ({fichas.length})</SelectItem>
                      {tipoProducaoList.map(tp => (
                        <SelectItem key={tp} value={tp} className="text-xs">
                          {tp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manual Overrides Quick Filter */}
                {Object.keys(linearOverrides).length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={onlyOverrides ? "default" : "outline"}
                      onClick={() => setOnlyOverrides(!onlyOverrides)}
                      className={cn(
                        "cursor-pointer font-bold px-2.5 py-1.5 text-xs transition-colors gap-1.5 border-amber-500/40 select-none",
                        onlyOverrides ? "bg-amber-600 text-white" : "text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                      )}
                    >
                      <Pencil className="w-3 h-3" />
                      Apenas Ajustados ({Object.keys(linearOverrides).length})
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllOverrides}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-rose-600 font-medium gap-1"
                      title="Restaurar todos para cálculo automático"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Restaurar
                    </Button>
                  </div>
                )}
              </div>

              {/* Row 2: Secondary Settings Strip (Calculation Mode + Roll Width) */}
              <div className="bg-zinc-50/90 dark:bg-zinc-900/60 rounded-lg px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Calculation Engine Mode */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Cálculo:
                  </span>
                  <div className="inline-flex rounded-md bg-zinc-200/70 dark:bg-zinc-800 p-0.5 text-xs">
                    <button
                      onClick={() => setCalcMode('encaixe')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1",
                        calcMode === 'encaixe'
                          ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Cálculo de avanço real de rolo (considera rotação para minimizar perda)"
                    >
                      ⚡ Encaixe Real (Avanço)
                    </button>
                    <button
                      onClick={() => setCalcMode('area')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                        calcMode === 'area'
                          ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Fórmula clássica: Área Total ÷ Largura do Rolo"
                    >
                      Área ÷ Rolo
                    </button>
                  </div>
                </div>

                {/* Roll Width Quick Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {selectedMaterial !== 'all' ? `Largura Rolo (${selectedMaterial}):` : 'Largura Padrão do Rolo:'}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1.50, 1.60, 1.80, 3.20].map((w) => (
                      <Button
                        key={w}
                        variant={activeRollWidth === w ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUpdateRollWidth(w)}
                        className={cn(
                          "h-6 px-2 text-[10px] font-bold",
                          activeRollWidth === w && "bg-primary text-primary-foreground font-black shadow-xs"
                        )}
                      >
                        {w.toFixed(2)}m
                      </Button>
                    ))}
                    <div className="flex items-center gap-1 ml-1 bg-white dark:bg-zinc-900 border rounded px-1.5 py-0.5">
                      <Input
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={activeRollWidth}
                        onChange={(e) => handleUpdateRollWidth(parseFloat(e.target.value) || 1.5)}
                        className="h-5 w-12 text-center font-bold text-xs p-0 border-none focus-visible:ring-0"
                      />
                      <span className="text-[10px] font-bold text-muted-foreground">m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick shortcuts for Top 5 Materials only (1 neat line, never wrapping!) */}
              {materialAggregates.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar pt-0.5">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 shrink-0">Top Materiais:</span>
                  <Badge
                    variant={selectedMaterial === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedMaterial('all')}
                    className={cn(
                      "cursor-pointer font-bold px-2 py-0.5 text-[10px] shrink-0 transition-colors",
                      selectedMaterial === 'all' ? "bg-primary text-primary-foreground" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    TODOS ({fichas.length})
                  </Badge>
                  {materialAggregates.slice(0, 5).map(mat => (
                    <Badge
                      key={mat.nome}
                      variant={selectedMaterial === mat.nome ? 'default' : 'outline'}
                      onClick={() => setSelectedMaterial(mat.nome)}
                      className={cn(
                        "cursor-pointer font-bold px-2 py-0.5 text-[10px] shrink-0 transition-colors gap-1 max-w-[170px] truncate",
                        selectedMaterial === mat.nome 
                          ? "bg-primary text-primary-foreground shadow-xs" 
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                      title={mat.nome}
                    >
                      <span className="truncate">{mat.nome}</span>
                      <span className="opacity-70 text-[9px]">({mat.count})</span>
                    </Badge>
                  ))}
                  {materialAggregates.length > 5 && (
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      +{materialAggregates.length - 5} outros no menu acima
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
              {loadingOrders ? (
                <div className="p-8 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm font-medium">Carregando itens de fichas dos pedidos...</span>
                  </div>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : filteredFichas.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground space-y-2">
                  <Package className="w-10 h-10 mx-auto opacity-30" />
                  <p className="font-bold text-sm">Nenhum item de ficha encontrado com os filtros atuais.</p>
                  <p className="text-xs">Tente alterar os termos de busca ou remover o filtro de material.</p>
                </div>
              ) : (
                <Table className="w-full">
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10 shadow-xs border-b">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[95px] text-xs font-black text-zinc-700 dark:text-zinc-300">Pedido</TableHead>
                      <TableHead className="w-[180px] max-w-[210px] text-xs font-black text-zinc-700 dark:text-zinc-300">Cliente / Tipo</TableHead>
                      <TableHead className="text-xs font-black text-zinc-700 dark:text-zinc-300">Descrição da Ficha</TableHead>
                      <TableHead className="w-[125px] text-xs font-black text-center text-zinc-700 dark:text-zinc-300">Medidas & Qtd</TableHead>
                      <TableHead className="w-[160px] text-xs font-black text-right text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center justify-end gap-1">
                          <span>M. Linear & Área</span>
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[130px] text-xs font-black text-zinc-700 dark:text-zinc-300">Acabamentos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFichas.map((item) => {
                      const metrics = getItemMetrics(item);
                      const isEditing = editingItemId === item.id;

                      return (
                        <TableRow 
                          key={item.id} 
                          className={cn(
                            "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors text-xs border-b border-zinc-100 dark:border-zinc-800/60",
                            item.isAlerta && "bg-amber-500/5 hover:bg-amber-500/10",
                            metrics.isOverridden && "bg-amber-500/[0.03]"
                          )}
                        >
                          {/* Pedido & Data */}
                          <TableCell className="font-mono font-bold text-zinc-900 dark:text-zinc-100 py-2.5">
                            <div>#{item.pedidoNumero}</div>
                            {item.dataEntrada && (
                              <div className="text-[10px] text-muted-foreground font-normal">
                                {item.dataEntrada.split('-').reverse().join('/')}
                              </div>
                            )}
                          </TableCell>
                          
                          {/* Cliente & Tipo Produção */}
                          <TableCell className="py-2.5 max-w-[210px]">
                            <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate text-xs" title={item.cliente}>
                              {item.cliente}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {item.tipoProducao}
                              </Badge>
                              {selectedMaterial === 'all' && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[9px] font-bold uppercase px-1 py-0 border-zinc-200 text-zinc-500",
                                    item.material === 'TACTEL' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                                    item.material === 'MALHA' && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                                    item.material.startsWith('MDF') && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                  )}
                                >
                                  {item.material}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Descrição da Ficha */}
                          <TableCell className="py-2.5">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 text-xs leading-snug" title={item.descricao}>
                              {item.descricao}
                            </div>
                            {item.observacao && (
                              <div className="text-[10px] text-muted-foreground italic truncate max-w-[320px] mt-0.5" title={item.observacao}>
                                Obs: {item.observacao}
                              </div>
                            )}
                            {item.isAlerta && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {item.alertaMotivo}
                              </div>
                            )}
                          </TableCell>

                          {/* Medidas & Quantidade */}
                          <TableCell className="text-center font-mono py-2.5">
                            {item.largura && item.altura ? (
                              <span className="inline-block bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px] font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                {item.largura} × {item.altura}m
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">-</span>
                            )}
                            <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              {item.quantidade} {item.quantidade === 1 ? 'peça' : 'peças'}
                            </div>
                          </TableCell>

                          {/* Editable Linear Meters & Area Cell */}
                          <TableCell className="text-right font-mono py-2.5">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={tempEditValue}
                                  onChange={(e) => setTempEditValue(e.target.value)}
                                  className="h-7 w-20 text-xs text-right font-bold font-mono px-1.5 bg-white dark:bg-zinc-900 border-primary"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveOverride(item.id, parseFloat(tempEditValue) || 0);
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                                />
                                <span className="text-[10px] text-muted-foreground font-bold">m</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                  onClick={() => handleSaveOverride(item.id, parseFloat(tempEditValue) || 0)}
                                  title="Salvar metragem linear"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  onClick={() => setEditingItemId(null)}
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="group/cell relative flex items-center justify-end gap-1.5">
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {metrics.isOverridden && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-black">
                                        Manual
                                      </Badge>
                                    )}
                                    <span className={cn(
                                      "font-black text-[13px]",
                                      metrics.isOverridden ? "text-amber-600 dark:text-amber-400 font-extrabold" : "text-primary"
                                    )}>
                                      {metrics.effectiveLinear.toFixed(2)} m lin.
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-medium">
                                    {item.areaTotalM2.toFixed(2)} m²
                                  </div>
                                </div>

                                <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setTempEditValue(String(metrics.effectiveLinear.toFixed(2)));
                                    }}
                                    title="Editar metragem linear deste item"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  {metrics.isOverridden && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                                      onClick={() => handleResetOverride(item.id)}
                                      title={`Restaurar cálculo automático (${metrics.autoLinear.toFixed(2)}m)`}
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </TableCell>

                          {/* Acabamentos */}
                          <TableCell className="py-2.5">
                            <div className="flex flex-wrap gap-1 max-w-[130px]">
                              {item.acabamentos.length > 0 ? (
                                item.acabamentos.map((acab, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 text-zinc-600 dark:text-zinc-400 font-medium">
                                    {acab}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-normal">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination & Summary Footer */}
            <div className="p-3 border-t bg-zinc-50 dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
              <div className="text-muted-foreground font-medium">
                Mostrando <span className="font-bold text-foreground">{Math.min(filteredFichas.length, (currentPage - 1) * pageSize + 1)}</span> até{' '}
                <span className="font-bold text-foreground">{Math.min(filteredFichas.length, currentPage * pageSize)}</span> de{' '}
                <span className="font-bold text-foreground">{filteredFichas.length}</span> fichas
                {' • '}
                <span className="font-bold text-foreground">{kpis.totalLinearMeters.toFixed(2)} m lineares</span> totalizados
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-xs font-bold"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
                </Button>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-xs font-bold"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Resumo por Material */}
        {activeTab === 'resumo' && (
          <ScrollArea className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Consolidação dos Materiais ({materialAggregates.length} encontrados)
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Modo ativo: <strong className="text-primary">{calcMode === 'encaixe' ? 'Encaixe Real' : 'Área ÷ Rolo'}</strong>
                  </span>
                </div>
                <div className="space-y-3">
                  {materialAggregates.map((mat, i) => {
                    const percent = totalAreaGeral > 0 ? (mat.area / totalAreaGeral * 100) : 0;
                    return (
                      <div 
                        key={mat.nome} 
                        onClick={() => {
                          setSelectedMaterial(mat.nome);
                          setActiveTab('fichas');
                        }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border hover:border-primary/50 cursor-pointer hover:shadow-sm transition-all gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-sm">{mat.nome}</p>
                              {mat.overrides > 0 && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                  {mat.overrides} {mat.overrides === 1 ? 'ajuste manual' : 'ajustes manuais'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">
                              {mat.count} fichas registradas • {mat.pecas} peças produzidas
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center justify-between sm:justify-end gap-4">
                          <div>
                            <p className="text-sm font-black text-amber-500">
                              {mat.linear.toFixed(2)} m lin.
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground">
                              {mat.area.toFixed(2)} m² ({percent.toFixed(1)}% da área total)
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-bold hover:bg-primary hover:text-white transition-colors">
                            Ver Fichas →
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {/* Tab 3: Diagnóstico de Alertas */}
        {activeTab === 'diagnostico' && (
          <ScrollArea className="flex-1 p-6 bg-white dark:bg-zinc-950">
            <div className="max-w-4xl mx-auto space-y-4">
              {filteredAlertas.length === 0 ? (
                <div className="p-12 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
                  <h4 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                    Tudo certo com os dados!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto">
                    Todas as {filteredFichas.length} fichas do período possuem material/tecido especificado, metragens válidas e dimensões normais.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      {filteredAlertas.length} fichas precisam de atenção ou conferência
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Itens com metragem zerada, material ausente ou dimensões anormais podem distorcer o consumo total de m².
                    </p>
                  </div>

                  {filteredAlertas.map(alerta => (
                    <Card key={alerta.id} className="p-4 border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-zinc-900">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">Pedido #{alerta.pedidoNumero}</span>
                            <Badge variant="destructive" className="text-[10px] font-bold">
                              {alerta.alertaMotivo}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Cliente: {alerta.cliente}</p>
                          <p className="text-xs font-medium text-foreground mt-1">{alerta.descricao}</p>
                        </div>
                        <div className="text-right font-mono text-xs">
                          <p className="font-bold">Medidas: {alerta.largura || '?'} × {alerta.altura || '?'}</p>
                          <p className="text-muted-foreground">Qtd: {alerta.quantidade} un</p>
                          <p className="text-primary font-bold">{alerta.areaTotalM2.toFixed(2)} m²</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Você pode ajustar manualmente a metragem linear de qualquer ficha clicando no ícone do lápis. Os ajustes ficam salvos no seu navegador.
          </div>
          <Button onClick={onClose} variant="secondary" className="font-bold px-6">
            Fechar Detalhes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
