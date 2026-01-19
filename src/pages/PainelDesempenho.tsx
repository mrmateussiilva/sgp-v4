import { useState, useMemo, useEffect } from 'react';
import { Loader2, Calendar, Search, TrendingUp, Filter } from 'lucide-react';
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
    try {
      // Pequeno tempo para garantir UX de loading se a API for muito rápida
      const [response] = await Promise.all([
        api.getOrders(), // Usando GET /pedidos conforme solicitado
        new Promise(resolve => setTimeout(resolve, 300))
      ]);

      setRawData(response);
      processData(response);
      setIsSearched(true);

      toast({
        title: 'Dashboard atualizado',
        description: 'Dados carregados e processados com sucesso.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: 'Falha ao carregar dados',
        description: 'Não foi possível carregar os pedidos da API.',
        variant: 'destructive',
      });
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
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel de Desempenho</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Acompanhe a performance de vendas e produção em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSearched && !loading && (
            <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">
              Última atualização: {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Configuração do Filtro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-10">
            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="start_date">Data Inicial</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="end_date">Data Final</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="date_mode">Referência</Label>
              <Select value={dateMode} onValueChange={(v: DateMode) => setDateMode(v)}>
                <SelectTrigger id="date_mode">
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

            <div className="flex items-end lg:col-span-2">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
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

      {!isSearched && !loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          < TrendingUp className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-600">Pronto para analisar?</h2>
          <p className="text-slate-500 max-w-md text-center">
            Selecione o período desejado acima e clique em "Atualizar Dashboard" para visualizar os KPIs e gráficos de desempenho.
          </p>
        </div>
      ) : (
        <>
          {/* Insights Section */}
          <DashboardInsights insights={insights} loading={loading} />

          {/* KPIs Section */}
          <DashboardKpis stats={stats} loading={loading} />

          {/* Charts Section */}
          <Tabs defaultValue="charts" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="charts" className="data-[state=active]:bg-white">Gráficos</TabsTrigger>
                <TabsTrigger value="table" className="data-[state=active]:bg-white">Tabela Resumo</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="charts" className="mt-0">
              <DashboardCharts data={stats?.dailyData || []} loading={loading} />
            </TabsContent>

            <TabsContent value="table" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo Diário</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-[120px]">Data</TableHead>
                        <TableHead className="text-right">Total Vendido</TableHead>
                        <TableHead className="text-right">Qtd Pedidos</TableHead>
                        <TableHead className="text-right">Ticket Médio</TableHead>
                        <TableHead className="text-right text-green-600 font-medium">% Prontos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : stats?.dailyData && stats.dailyData.length > 0 ? (
                        stats.dailyData.map((day) => (
                          <TableRow key={day.data}>
                            <TableCell className="font-medium">{formatDateShort(day.data)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(day.totalVendido)}</TableCell>
                            <TableCell className="text-right">{day.quantidadePedidos}</TableCell>
                            <TableCell className="text-right">{formatCurrency(day.ticketMedio)}</TableCell>
                            <TableCell className="text-right text-green-700 font-medium">
                              {day.quantidadePedidos > 0
                                ? ((day.prontos / day.quantidadePedidos) * 100).toFixed(0)
                                : 0}%
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Nenhum dado encontrado para o período.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Clientes e Outros Dados (Opcional se sobrar espaço) */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top 5 Clientes (R$)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                  ) : stats?.topClientes && stats.topClientes.length > 0 ? (
                    stats.topClientes.map((cliente, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                            {idx + 1}
                          </div>
                          <span className="font-medium truncate max-w-[200px]">{cliente.nome}</span>
                        </div>
                        <span className="font-bold text-blue-600">{formatCurrency(cliente.valor)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-center text-muted-foreground py-4">Sem dados de clientes.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dica de Desempenho</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center text-center p-6 bg-blue-50/20 rounded-lg">
                < TrendingUp className="h-10 w-10 text-blue-400 mb-3" />
                <p className="text-sm text-slate-600 mb-2">
                  Analise seu <strong>Ticket Médio</strong> para identificar oportunidades de cross-sell e up-sell.
                </p>
                <p className="text-xs text-muted-foreground">
                  Sua média atual de {stats ? formatCurrency(stats.ticketMedio) : '...'} indica o valor que cada cliente traz em média por pedido.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
