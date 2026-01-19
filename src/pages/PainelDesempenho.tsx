import { useState, useEffect } from 'react';
import { Loader2, Calendar, Search, TrendingUp, Filter, Lightbulb, DollarSign, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Dashboard Components
import { DashboardKpis } from '@/components/dashboard/DashboardKpis';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';

// Service
import {
  DateMode,
  filterOrdersByPeriod,
  calculateStats,
  generateInsights,
  DashboardStats
} from '@/services/dashboardService';
import { OrderWithItems } from '@/types';

export default function PainelDesempenho() {
  const { toast } = useToast();

  // Estados de Filtro com persistência no localStorage
  const [startDate, setStartDate] = useState<string>(() => {
    return localStorage.getItem('dashboard_startDate') || '';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return localStorage.getItem('dashboard_endDate') || '';
  });
  const [dateMode, setDateMode] = useState<DateMode>(() => {
    return (localStorage.getItem('dashboard_dateMode') as DateMode) || 'entrada';
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<OrderWithItems[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [isSearched, setIsSearched] = useState<boolean>(false);

  // Persistir filtros
  useEffect(() => {
    localStorage.setItem('dashboard_startDate', startDate);
    localStorage.setItem('dashboard_endDate', endDate);
    localStorage.setItem('dashboard_dateMode', dateMode);
  }, [startDate, endDate, dateMode]);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, preencha as datas de início e fim.',
        variant: 'destructive',
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: 'Erro de validação',
        description: 'A data final não pode ser anterior à data inicial.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.getOrders();
      setRawData(response);
      processData(response);
      setIsSearched(true);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
      setError('Não foi possível carregar os pedidos da API. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Processa os dados brutos de acordo com os filtros
  const processData = (allOrders: OrderWithItems[]) => {
    const filteredOrders = filterOrdersByPeriod(allOrders, startDate, endDate, dateMode);
    const calculatedStats = calculateStats(filteredOrders);
    const generatedInsights = generateInsights(calculatedStats);

    setStats(calculatedStats);
    setInsights(generatedInsights);
  };

  // Recalcular se o modo de data mudar sem precisar de nova busca completa (se já temos dados)
  useEffect(() => {
    if (rawData.length > 0 && isSearched) {
      processData(rawData);
    }
  }, [dateMode]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateShort = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-8 pb-12 overflow-x-hidden">
      {/* Header com estilo SaaS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Business Intelligence</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">Painel de Desempenho</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium">
            Métricas estratégicas e insights automáticos para sua produção.
          </p>
        </div>
      </div>

      {/* Filtros Refinados */}
      <Card className="border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3">
          <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Filter className="h-3 w-3" />
            filtros de análise
          </CardTitle>
        </div>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-12">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="start_date" className="text-xs font-bold text-slate-700">Data Inicial</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 h-10 border-slate-200 focus:ring-blue-500 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="end_date" className="text-xs font-bold text-slate-700">Data Final</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10 h-10 border-slate-200 focus:ring-blue-500 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="date_mode" className="text-xs font-bold text-slate-700">Referência Cronológica</Label>
              <Select value={dateMode} onValueChange={(v: DateMode) => setDateMode(v)}>
                <SelectTrigger id="date_mode" className="h-10 border-slate-200 focus:ring-blue-500 rounded-lg">
                  <SelectValue placeholder="Selecione o modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Data de Entrada</SelectItem>
                  <SelectItem value="entrega">Data de Entrega</SelectItem>
                  <SelectItem value="criacao">Data de Criação</SelectItem>
                  <SelectItem value="atualizacao">Última Atualização</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end md:col-span-3">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-200"
                type="button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Atualizar Dashboard
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estados Vazios, Erros e Resultados */}
      {error ? (
        <Card className="border-red-100 bg-red-50/50 p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Filter className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-red-900 mb-2">Ops! Algo deu errado.</h2>
          <p className="text-red-700 mb-6 max-w-md">{error}</p>
          <Button variant="outline" onClick={handleSearch} className="border-red-200 text-red-700 hover:bg-red-100 font-bold">
            Tentar novamente
          </Button>
        </Card>
      ) : !isSearched && !loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200 transition-all hover:bg-slate-50 group">
          <div className="h-20 w-20 bg-white shadow-2xl rounded-2xl flex items-center justify-center mb-6 transform group-hover:rotate-12 transition-transform duration-500">
            <TrendingUp className="h-10 w-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Análise Gerencial Pronta</h2>
          <p className="text-slate-500 max-w-sm text-center font-medium px-4">
            Selecione um período acima e escolha a referência de data para carregar seus dados.
          </p>
        </div>
      ) : stats?.nPedidos === 0 && !loading ? (
        <Card className="border-slate-100 p-24 flex flex-col items-center justify-center text-center transition-all">
          <div className="h-20 w-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
            <Search className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Nenhum pedido encontrado</h2>
          <p className="text-slate-500 mb-8 max-w-sm">Não localizamos nenhum registro para o período e modo de data selecionados.</p>
          <Button variant="outline" className="font-bold border-slate-200" onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            setStartDate(d.toISOString().split('T')[0]);
            handleSearch();
          }}>
            Ampliar período (últimos 30 dias)
          </Button>
        </Card>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Insights Region */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <DashboardInsights
                insights={insights}
                loading={loading}
                periodMetadata={{ start: startDate, end: endDate, mode: dateMode }}
              />
            </div>
          </div>

          {/* KPIs Section */}
          <DashboardKpis stats={stats} loading={loading} />

          {/* Seção Principal - Gráficos e Tabela */}
          <Tabs defaultValue="charts" className="w-full">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <TabsList className="bg-slate-100/80 p-1 rounded-xl h-11 border border-slate-200">
                <TabsTrigger value="charts" className="rounded-lg px-8 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all">
                  Gráficos de Tendência
                </TabsTrigger>
                <TabsTrigger value="table" className="rounded-lg px-8 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all">
                  Consolidado Diário
                </TabsTrigger>
              </TabsList>
              {isSearched && !loading && (
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Atualizado em {new Date().toLocaleTimeString()}
                </div>
              )}
            </div>

            <TabsContent value="charts" className="mt-0 focus-visible:outline-none">
              <DashboardCharts data={stats?.dailyData || []} loading={loading} />
            </TabsContent>

            <TabsContent value="table" className="mt-0 focus-visible:outline-none">
              <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Métricas Detalhadas por Dia</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-100">
                        <TableHead className="w-[150px] font-bold text-slate-700 h-12">Data</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 h-12">Total Vendido</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 h-12">Nº Pedidos</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 h-12">Ticket Médio</TableHead>
                        <TableHead className="text-right font-bold text-emerald-600 h-12">% Eficiência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : stats?.dailyData && stats.dailyData.length > 0 ? (
                        stats.dailyData.map((day) => (
                          <TableRow key={day.data} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                            <TableCell className="font-bold text-slate-600">{formatDateShort(day.data)}</TableCell>
                            <TableCell className="text-right text-slate-900 font-bold">{formatCurrency(day.totalVendido)}</TableCell>
                            <TableCell className="text-right text-slate-600 font-medium">{day.quantidadePedidos}</TableCell>
                            <TableCell className="text-right text-slate-600 font-medium">{formatCurrency(day.ticketMedio)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 font-black text-emerald-600">
                                {day.quantidadePedidos > 0
                                  ? ((day.prontos / day.quantidadePedidos) * 100).toFixed(0)
                                  : 0}%
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                            Sem dados disponíveis para exibição.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Top Customers Card */}
            <Card className="lg:col-span-7 border-slate-200 border-l-4 border-l-blue-500 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  Top 5 Clientes Fidelizados
                  <span className="text-[9px] text-slate-400 normal-case font-medium bg-slate-100 px-2 py-0.5 rounded-full">Por faturamento Bruto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <div className="p-4" key={i}><Skeleton className="h-10 w-full" /></div>)
                  ) : stats?.topClientes && stats.topClientes.length > 0 ? (
                    stats.topClientes.map((cliente, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 font-black text-slate-400 border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{cliente.nome}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Faturamento Direto</p>
                          </div>
                        </div>
                        <span className="font-black text-blue-600 text-lg tabular-nums">{formatCurrency(cliente.valor)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 opacity-50 grayscale">
                      <Search className="h-10 w-10 mb-2" />
                      <p className="text-sm font-bold">Sem dados de clientes.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actionable Radar Card */}
            <Card className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-2xl rounded-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                <TrendingUp className="h-64 w-64 text-white" />
              </div>
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <Lightbulb className="h-3 w-3" />
                  análise de oportunidade
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center text-center p-8 text-white relative z-10">
                <div className="h-16 w-16 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-900/40 transform rotate-3">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight">Potencial de Crescimento</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                  Seu ticket médio de <strong className="text-white underline underline-offset-4 font-black">{stats ? formatCurrency(stats.ticketMedio) : '...'}</strong> sugere que pacotes promocionais (combos) podem elevar seu faturamento em até 12%.
                </p>
                <div className="w-full h-px bg-white/10 mb-6" />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic tracking-tighter">
                  Baseado no fluxo de {stats?.nPedidos} pedidos do período
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
