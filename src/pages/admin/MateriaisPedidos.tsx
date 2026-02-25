import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, ArrowUp, ArrowDown, FileDown, Package, Ruler, TrendingUp, Info, Users, ChevronDown, ChevronUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { OrderWithItems, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible } from '@/components/ui/collapsible';
import { formatDateForDisplay, isDateExpired } from '@/utils/date';

const ROWS_PER_PAGE = 50;
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

type SortColumn = 'numero' | 'cliente' | 'tipoProducao' | 'material' | 'descricao' | 'medida' | 'dataEntrada' | 'dataEntrega' | null;

export interface MaterialRow {
  orderId: number;
  numero: string;
  cliente: string;
  tipoProducao: string;
  material: string;
  descricao: string;
  medida: string;
  dataEntrada: string;
  dataEntrega: string;
  /** Metros lineares (comprimento × quantidade) para acumuladora */
  linearMeters: number;
}

function parseDimension(s: string | undefined): number {
  if (!s || typeof s !== 'string') return 0;
  const n = parseFloat(String(s).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Metros lineares do item: usa altura ou largura como comprimento × quantidade */
function getLinearMetersFromItem(item: OrderItem): number {
  const qty = Math.max(1, Number(item.quantity) || 1);
  const comprimento = parseDimension(item.altura) || parseDimension(item.largura);
  return comprimento * qty;
}

function getMaterialFromItem(item: OrderItem): string {
  const v =
    item.tecido ||
    item.tipo_producao ||
    item.material_gasto ||
    item.composicao_tecidos;
  return (v && String(v).trim()) || '—';
}

function getMedidaFromItem(item: OrderItem): string {
  const largura = (item.largura && String(item.largura).trim()) || '';
  const altura = (item.altura && String(item.altura).trim()) || '';
  const m2 = (item.metro_quadrado && String(item.metro_quadrado).trim()) || '';
  const parts: string[] = [];
  if (largura && altura) {
    parts.push(`${largura} x ${altura}`);
  }
  if (m2) {
    parts.push(parts.length ? `= ${m2} m²` : `${m2} m²`);
  }
  return parts.length ? parts.join(' ') : '—';
}

function ordersToRows(orders: OrderWithItems[]): MaterialRow[] {
  const rows: MaterialRow[] = [];
  for (const order of orders) {
    const numero = order.numero ?? String(order.id);
    const cliente = order.cliente ?? order.customer_name ?? '—';
    const dataEntrada = order.data_entrada ?? '';
    const dataEntrega = order.data_entrega ?? '';
    const items = order.items ?? [];
    for (const item of items) {
      rows.push({
        orderId: order.id,
        numero,
        cliente,
        tipoProducao: (item.tipo_producao && String(item.tipo_producao).trim()) || '—',
        material: getMaterialFromItem(item),
        descricao: (item.descricao && String(item.descricao).trim()) || item.item_name || '—',
        medida: getMedidaFromItem(item),
        dataEntrada,
        dataEntrega,
        linearMeters: getLinearMetersFromItem(item),
      });
    }
  }
  return rows;
}

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const QUICK_RANGES = [
  { label: 'Últimos 30 dias', getValue: () => ({ from: toYYYYMMDD(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), to: toYYYYMMDD(new Date()) }) },
  {
    label: 'Este mês',
    getValue: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toYYYYMMDD(first), to: toYYYYMMDD(now) };
    },
  },
  {
    label: 'Mês passado',
    getValue: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toYYYYMMDD(first), to: toYYYYMMDD(last) };
    },
  },
];

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function MateriaisPedidos() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeMaterialTab, setActiveMaterialTab] = useState<string>('Todos');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let all: OrderWithItems[] = [];
      if (dateFrom || dateTo) {
        const dataInicio = dateFrom || undefined;
        const dataFim = dateTo || undefined;
        let currentPage = 1;
        const pageSize = 100;
        while (true) {
          const result = await api.getOrdersPaginated(currentPage, pageSize, undefined, undefined, dataInicio, dataFim);
          all = [...all, ...result.orders];
          if (currentPage >= result.total_pages || result.orders.length === 0) break;
          currentPage++;
        }
        setOrders(all);
      } else {
        const data = await api.getOrders();
        setOrders(Array.isArray(data) ? data : []);
      }
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar pedidos.';
      setError(message);
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, dateFrom, dateTo]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const allRows = useMemo(() => ordersToRows(orders), [orders]);

  const filteredRows = useMemo(() => {
    let list = allRows;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.material.toLowerCase().includes(term) ||
          r.descricao.toLowerCase().includes(term) ||
          r.cliente.toLowerCase().includes(term) ||
          r.numero.toLowerCase().includes(term) ||
          r.tipoProducao.toLowerCase().includes(term)
      );
    }
    if (sortColumn) {
      list = [...list].sort((a, b) => {
        const aVal = a[sortColumn] ?? '';
        const bVal = b[sortColumn] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [allRows, searchTerm, sortColumn, sortDirection]);

  /** Lista de materiais únicos (para abas), ordenada, sem "—" no início */
  const materialsList = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => { if (r.material && r.material !== '—') set.add(r.material); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [allRows]);

  /** Linhas da aba atual (Todos ou um material) */
  const rowsForTab = useMemo(() => {
    if (activeMaterialTab === 'Todos') return filteredRows;
    return filteredRows.filter((r) => r.material === activeMaterialTab);
  }, [filteredRows, activeMaterialTab]);

  /** Total de metros lineares na aba atual */
  const totalLinearMetersTab = useMemo(
    () => rowsForTab.reduce((s, r) => s + r.linearMeters, 0),
    [rowsForTab]
  );

  const totalPages = Math.max(1, Math.ceil(rowsForTab.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(
    () => rowsForTab.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE),
    [rowsForTab, page]
  );

  /** Métricas para o Dashboard */
  const dashboardMetrics = useMemo(() => {
    const list = rowsForTab;
    const totalMeters = list.reduce((s, r) => s + r.linearMeters, 0);
    const uniqueOrders = new Set(list.map((r) => r.orderId)).size;
    const uniqueCustomers = new Set(list.map((r) => r.cliente)).size;
    const totalItems = list.length;

    // Material mais usado
    const materialCounts: Record<string, number> = {};
    list.forEach((r) => {
      materialCounts[r.material] = (materialCounts[r.material] || 0) + r.linearMeters;
    });
    const topMaterial = Object.entries(materialCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalMeters,
      uniqueOrders,
      uniqueCustomers,
      totalItems,
      topMaterial: topMaterial ? { name: topMaterial[0], value: topMaterial[1] } : null,
    };
  }, [rowsForTab]);

  /** Dados para Gráfico de Barras: Consumo por Material */
  const barChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    rowsForTab.forEach((r) => {
      counts[r.material] = (counts[r.material] || 0) + r.linearMeters;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [rowsForTab]);

  /** Dados para Gráfico Donut: Distribuição por Tipo */
  const pieChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    rowsForTab.forEach((r) => {
      counts[r.tipoProducao] = (counts[r.tipoProducao] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [rowsForTab]);

  /** Dados para Gráfico de Linha: Consumo por Dia */
  const lineChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    rowsForTab.forEach((r) => {
      const date = r.dataEntrada ? r.dataEntrada.split('T')[0] : 'Indefinida';
      counts[date] = (counts[date] || 0) + r.linearMeters;
    });
    return Object.entries(counts)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rowsForTab]);

  /** Resetar para primeira página ao trocar de aba */
  const handleTabChange = (value: string) => {
    setActiveMaterialTab(value);
    setPage(0);
  };

  const handleSort = (column: SortColumn) => {
    if (!column) return;
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setPage(0);
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };

  const handleExportCsv = () => {
    const headers = ['Pedido', 'Cliente', 'Tipo', 'Material', 'Descrição', 'Medida', 'm lineares', 'Data entrada', 'Data entrega'];
    const lines = [headers.map(escapeCsvCell).join(';')];
    for (const r of rowsForTab) {
      lines.push([
        r.numero,
        r.cliente,
        r.tipoProducao,
        r.material,
        r.descricao,
        r.medida,
        String(r.linearMeters),
        formatDateForDisplay(r.dataEntrada || null, ''),
        formatDateForDisplay(r.dataEntrega || null, ''),
      ].map(escapeCsvCell).join(';'));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `materiais-pedidos-${toYYYYMMDD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exportado', description: 'CSV gerado com sucesso.' });
  };

  const handleQuickRange = (getValue: () => { from: string; to: string }) => {
    const { from, to } = getValue();
    setDateFrom(from);
    setDateTo(to);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Inline Compacto */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
            Gestão de Materiais
          </h1>
          <p className="text-sm text-slate-500">
            Painel analítico de consumo por pedido
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            {QUICK_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => handleQuickRange(range.getValue)}
                className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                {range.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1 shadow-sm">
            <Label className="text-[10px] uppercase text-slate-400 font-bold whitespace-nowrap">De</Label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="text-xs border-none focus:ring-0 p-0 w-28"
            />
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <Label className="text-[10px] uppercase text-slate-400 font-bold whitespace-nowrap">Até</Label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="text-xs border-none focus:ring-0 p-0 w-28"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              className="pl-9 h-9 w-[200px] bg-white border-slate-200 shadow-sm"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={loadOrders}
            className="h-9 w-9 bg-white border-slate-200 shadow-sm"
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-600", loading && "animate-spin")} />
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCsv}
            disabled={loading || rowsForTab.length === 0}
            className="h-9 bg-slate-900 hover:bg-slate-800 shadow-sm"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna de KPIs (Esquerda) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card className="border-none shadow-elevation bg-white h-full flex flex-col justify-between p-1">
              {[
                { label: 'Total m Lineares', value: `${dashboardMetrics.totalMeters.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}m`, icon: Ruler, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Pedidos Únicos', value: dashboardMetrics.uniqueOrders, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Clientes Atendidos', value: dashboardMetrics.uniqueCustomers, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Top Material', value: dashboardMetrics.topMaterial?.name || '—', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', sub: `${dashboardMetrics.topMaterial?.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}m totais` },
              ].map((kpi, i) => (
                <div key={i} className={cn("p-4 flex flex-col gap-1 rounded-xl transition-all hover:bg-slate-50", i !== 3 && "border-b border-slate-50")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">{kpi.label}</span>
                    <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-800 tracking-tight">{kpi.value}</span>
                    {kpi.sub && <span className="text-[10px] text-slate-400 font-medium">{kpi.sub}</span>}
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Gráfico Principal (Direita - 70%) */}
          <Card className="lg:col-span-3 border-none shadow-elevation bg-white flex flex-col">
            <CardHeader className="py-4 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 font-mono">Consumo por Material (Top 10)</CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold border-slate-100 uppercase text-slate-400">Metros Lineares</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" strokeOpacity={0.6} />
                    <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 600 }} />
                    <YAxis dataKey="name" type="category" fontSize={11} width={120} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontWeight: 700 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#colorBar)"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    />
                    <defs>
                      <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos Secundários */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-elevation bg-white overflow-hidden h-full">
              <CardHeader className="py-4 border-b border-slate-50 bg-slate-50/30">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Mix de Produção</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {pieChartData.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-3 border-none shadow-elevation bg-white">
            <CardHeader className="py-4 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Tendência de Consumo Semanal</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">M Lineares</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-1 pt-6 pb-2">
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineChartData} margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                      tick={{ fill: '#94A3B8', fontWeight: 600 }}
                    />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 600 }} tickFormatter={(v) => `${v}m`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, shadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela Colapsável */}
      <div className="pt-2">
        <Collapsible
          defaultOpen={true}
          trigger={
            <div className="flex items-center gap-4">
              <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">Detalhes da Produção</span>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-none">
                  {rowsForTab.length} itens encontrados
                </Badge>
                {activeMaterialTab !== 'Todos' && (
                  <Badge className="bg-blue-600 text-white font-bold border-none uppercase text-[10px]">
                    Filtro: {activeMaterialTab}
                  </Badge>
                )}
              </div>
            </div>
          }
          className="border-none shadow-elevation bg-white"
        >
          <div className="bg-white">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between overflow-x-auto gap-2 scrollbar-hide">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTabChange('Todos')}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-full transition-all uppercase tracking-tight whitespace-nowrap",
                    activeMaterialTab === 'Todos' ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  Todos Materiais
                </button>
                {materialsList.map((mat) => (
                  <button
                    key={mat}
                    onClick={() => handleTabChange(mat)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-full transition-all uppercase tracking-tight whitespace-nowrap",
                      activeMaterialTab === mat ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    {[
                      { id: 'numero', label: 'PEDIDO' },
                      { id: 'cliente', label: 'CLIENTE' },
                      { id: 'tipoProducao', label: 'TIPO' },
                      { id: 'material', label: 'MATERIAL' },
                      { id: 'descricao', label: 'DESCRIÇÃO' },
                      { id: 'medida', label: 'MEDIDA' },
                      { id: 'linear', label: 'METROS', align: 'text-right' },
                      { id: 'dataEntrada', label: 'ENTRADA' },
                      { id: 'dataEntrega', label: 'ENTREGA' },
                    ].map((col) => (
                      <TableHead key={col.id} className={cn("text-[10px] font-black text-slate-400 tracking-widest py-3", col.align)}>
                        <button
                          type="button"
                          className="hover:text-slate-800 transition-colors inline-flex items-center gap-1 uppercase"
                          onClick={() => col.id !== 'linear' && handleSort(col.id as any)}
                        >
                          {col.label}
                          {col.id !== 'linear' && getSortIcon(col.id as any)}
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row, idx) => (
                    <TableRow key={`${row.orderId}-${row.descricao}-${page}-${idx}`} className="group hover:bg-blue-50/30 transition-colors">
                      <TableCell className="py-3">
                        <button
                          onClick={() => navigate(`/dashboard/pedido/editar/${row.orderId}`)}
                          className="text-xs font-black text-blue-600 hover:underline tracking-tight"
                        >
                          #{row.numero.padStart(4, '0')}
                        </button>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate py-3">
                        <span className="text-xs font-bold text-slate-700 uppercase">{row.cliente}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 text-slate-500 bg-slate-50">
                          {row.tipoProducao}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className="text-[9px] font-black uppercase bg-blue-600 text-white border-none shadow-sm shadow-blue-100">
                          {row.material}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate py-3">
                        <span className="text-[11px] text-slate-500 font-medium">{row.descricao}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-3">
                        <span className="text-[11px] font-mono font-bold text-slate-400">{row.medida}</span>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span className="text-xs font-black text-slate-800 tabular-nums">
                          {row.linearMeters.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-3">
                        <span className="text-[11px] font-bold text-slate-400">
                          {formatDateForDisplay(row.dataEntrada || null, '—')}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-3">
                        <span className={cn(
                          "text-[11px] font-black px-2 py-1 rounded-md",
                          isDateExpired(row.dataEntrega)
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        )}>
                          {formatDateForDisplay(row.dataEntrega || null, '—')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação Compacta */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Página {page + 1} / {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-800"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-800"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
