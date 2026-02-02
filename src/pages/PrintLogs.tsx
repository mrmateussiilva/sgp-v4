import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    Printer,
    AlertCircle,
    CheckCircle2,
    RotateCcw,
    Calendar,
    Search,
    FilterX,
    ExternalLink,
    Download,
    BarChart3,
    TrendingUp,
    Zap,
    History
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import Papa from 'papaparse';
import { api } from '@/services/api';
import { PrintLog, PrintLogStatus, OrderWithItems } from '@/types';
import { MachineEntity } from '@/api/types';
import { useLazyImage } from '@/hooks/useLazyImage';
import { OrderViewModal } from '@/components/OrderViewModal';
import { useToast } from '@/hooks/use-toast';

export default function PrintLogsPage() {
    const [machines, setMachines] = useState<MachineEntity[]>([]);
    const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [materialFilter, setMaterialFilter] = useState<string>('all');
    const [refreshInterval, setRefreshInterval] = useState<string>('off');

    const [logs, setLogs] = useState<PrintLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<PrintLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMachines, setLoadingMachines] = useState(true);

    // Estados para o Modal de Pedido
    const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        loadMachines();
    }, []);

    useEffect(() => {
        loadLogs();
    }, [selectedMachine, startDate, endDate]);

    useEffect(() => {
        applyFilters();
    }, [logs, searchQuery, statusFilter, materialFilter]);

    // Lógica de Atualização Automática
    useEffect(() => {
        if (refreshInterval === 'off') return;
        const interval = setInterval(() => {
            loadLogs();
        }, parseInt(refreshInterval) * 1000);
        return () => clearInterval(interval);
    }, [refreshInterval]);

    const loadMachines = async () => {
        try {
            setLoadingMachines(true);
            const data = await api.getMaquinasAtivas();
            setMachines(data);
        } catch (error) {
            console.error('Erro ao carregar máquinas:', error);
        } finally {
            setLoadingMachines(false);
        }
    };

    const loadLogs = async () => {
        try {
            if (!loading) setLoading(true);
            let data: PrintLog[];
            if (selectedMachine === null) {
                data = await api.getAllLogs(1000, 0, undefined, startDate, endDate);
            } else {
                data = await api.getPrinterLogs(selectedMachine, 1000, 0, undefined, startDate, endDate);
            }
            setLogs(data);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...logs];

        if (statusFilter !== 'all') {
            result = result.filter(log => log.status === statusFilter);
        }

        if (materialFilter !== 'all') {
            result = result.filter(log => log.item_material === materialFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(log =>
                log.pedido_numero?.toLowerCase().includes(query) ||
                log.pedido_id.toString().includes(query) ||
                log.cliente?.toLowerCase().includes(query) ||
                log.item_descricao?.toLowerCase().includes(query)
            );
        }

        setFilteredLogs(result);
    };

    // Cálculos de Estatísticas
    const stats = useMemo(() => {
        const total = filteredLogs.length;
        const success = filteredLogs.filter(l => l.status === PrintLogStatus.SUCCESS).length;
        const errors = filteredLogs.filter(l => l.status === PrintLogStatus.ERROR).length;
        const reprints = filteredLogs.filter(l => l.status === PrintLogStatus.REPRINT).length;

        // Máquina mais ativa
        const machineCounts = filteredLogs.reduce((acc, log) => {
            acc[log.printer_name] = (acc[log.printer_name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topMachine = Object.entries(machineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

        return {
            total,
            successRate: total > 0 ? Math.round((success / total) * 100) : 0,
            errors,
            reprints,
            topMachine
        };
    }, [filteredLogs]);

    // Dados para o Gráfico
    const chartData = useMemo(() => {
        const groups = filteredLogs.reduce((acc, log) => {
            const date = new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(groups)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => {
                const [da, ma] = a.name.split('/').map(Number);
                const [db, mb] = b.name.split('/').map(Number);
                return (mb * 100 + db) - (ma * 100 + da);
            })
            .reverse()
            .slice(-7);
    }, [filteredLogs]);

    const materials = useMemo(() => {
        return Array.from(new Set(logs.map(l => l.item_material).filter(Boolean))) as string[];
    }, [logs]);

    const exportToCSV = () => {
        if (filteredLogs.length === 0) return;

        const data = filteredLogs.map(log => ({
            Data: new Date(log.created_at).toLocaleString('pt-BR'),
            Máquina: log.printer_name,
            Pedido: log.pedido_numero || log.pedido_id,
            Cliente: log.cliente || 'Consumidor Final',
            Item: log.item_descricao || '',
            Medidas: log.item_medidas || '',
            Material: log.item_material || '',
            Status: log.status.toUpperCase(),
            Detalhes_Erro: log.error_message || ''
        }));

        const csv = Papa.unparse(data);
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Producao_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Relatório Exportado",
            description: `${filteredLogs.length} registros salvos com sucesso.`
        });
    };

    const handleOpenOrder = async (orderId: number) => {
        try {
            setLoadingOrder(true);
            const order = await api.getOrderById(orderId);
            setSelectedOrder(order);
            setIsModalOpen(true);
        } catch (error) {
            toast({
                title: "Erro ao abrir pedido",
                description: "Não foi possível carregar os detalhes do pedido.",
                variant: "destructive"
            });
        } finally {
            setLoadingOrder(false);
        }
    };

    const clearFilters = () => {
        setSelectedMachine(null);
        setStartDate('');
        setEndDate('');
        setSearchQuery('');
        setStatusFilter('all');
        setMaterialFilter('all');
    };

    const getStatusInfo = (statusLabel: PrintLogStatus) => {
        switch (statusLabel) {
            case PrintLogStatus.SUCCESS:
                return {
                    icon: <CheckCircle2 className="w-4 h-4" />,
                    label: 'Sucesso',
                    variant: 'success' as const,
                    bg: 'bg-green-500/10 text-green-600 border-green-500/20'
                };
            case PrintLogStatus.ERROR:
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    label: 'Erro',
                    variant: 'destructive' as const,
                    bg: 'bg-red-500/10 text-red-600 border-red-500/20'
                };
            case PrintLogStatus.REPRINT:
                return {
                    icon: <RotateCcw className="w-4 h-4" />,
                    label: 'Reimpressão',
                    variant: 'warning' as const,
                    bg: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                };
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month} às ${hours}:${minutes}`;
        } catch {
            return dateString;
        }
    };

    const groupLogsByDate = (logs: PrintLog[]) => {
        const groups: Record<string, PrintLog[]> = {};
        logs.forEach(log => {
            try {
                const date = new Date(log.created_at);
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(log);
            } catch {
                if (!groups['invalid']) groups['invalid'] = [];
                groups['invalid'].push(log);
            }
        });
        return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    };

    const formatGroupDate = (dateKey: string) => {
        if (dateKey === 'invalid') return 'Data inválida';
        try {
            const [year, month, day] = dateKey.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            if (date.toDateString() === today.toDateString()) return 'Hoje';
            if (date.toDateString() === yesterday.toDateString()) return 'Ontem';

            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${day} ${monthNames[parseInt(month) - 1]} ${year}`;
        } catch {
            return dateKey;
        }
    };

    if (loadingMachines) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const groupedLogs = groupLogsByDate(filteredLogs);

    return (
        <div className="container mx-auto p-4 space-y-4 max-w-7xl">
            {/* Header com Ações Globais */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Printer className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Gestão de Produção</h1>
                        <p className="text-sm text-muted-foreground">Monitoramento inteligente e indicadores</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                        <SelectTrigger className="w-[140px] h-9 bg-muted/50 border-none text-xs font-bold">
                            <Zap className="w-3 h-3 mr-2 text-yellow-500" />
                            <SelectValue placeholder="Auto-refresh" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="off">Atualização Off</SelectItem>
                            <SelectItem value="60">A cada 1 min</SelectItem>
                            <SelectItem value="300">A cada 5 min</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToCSV}
                        disabled={filteredLogs.length === 0}
                        className="h-9 font-bold border-primary/20 hover:bg-primary/5"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => loadLogs()}
                        disabled={loading}
                        className="h-9 px-4 font-bold"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Dashboards e Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Stats Cards */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-none shadow-sm bg-muted/20">
                    <CardContent className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Produção Total</p>
                            <p className="text-2xl font-black tracking-tighter">{stats.total}</p>
                            <div className="flex items-center gap-1 text-[10px] font-medium text-blue-500">
                                <History className="w-3 h-3" />
                                {filteredLogs.length} registros
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Taxa Sucesso</p>
                            <p className="text-2xl font-black tracking-tighter text-green-600">{stats.successRate}%</p>
                            <div className="h-1 w-full bg-green-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${stats.successRate}%` }} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Alertas/Erros</p>
                            <p className="text-2xl font-black tracking-tighter text-red-600">{stats.errors + stats.reprints}</p>
                            <p className="text-[10px] font-medium text-muted-foreground">Requerem atenção</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Top Máquina</p>
                            <p className="text-xl font-black tracking-tighter truncate" title={stats.topMachine}>{stats.topMachine}</p>
                            <p className="text-[10px] font-medium text-primary">Líder de volume</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Gráfico de Volume */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-none shadow-sm bg-primary/5 overflow-hidden">
                    <CardContent className="p-3 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="w-3 h-3 text-primary" />
                                Volume de Impressão (7 dias)
                            </h3>
                        </div>
                        <div className="flex-1 min-h-[80px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#64748B', fontWeight: 600 }}
                                    />
                                    <YAxis
                                        fontSize={9}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#64748B' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                        cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                    />
                                    <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={24}>
                                        {chartData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#2563EB' : '#94A3B8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar de Filtros Avançada */}
            <Card className="border-none shadow-sm bg-muted/40 p-1">
                <CardContent className="p-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Busca */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar pedido, cliente, item..."
                                className="pl-9 h-9 bg-card border-none shadow-none text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Máquina */}
                        <div className="w-[160px]">
                            <Select
                                value={selectedMachine?.toString() || 'all'}
                                onValueChange={(value) => setSelectedMachine(value === 'all' ? null : parseInt(value))}
                            >
                                <SelectTrigger className="h-9 bg-card border-none text-xs font-bold">
                                    <SelectValue placeholder="Máquina" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas Máquinas</SelectItem>
                                    {machines.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="w-[130px]">
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger className="h-9 bg-card border-none text-xs font-bold">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Status</SelectItem>
                                    <SelectItem value={PrintLogStatus.SUCCESS}>✅ Sucessos</SelectItem>
                                    <SelectItem value={PrintLogStatus.ERROR}>❌ Erros</SelectItem>
                                    <SelectItem value={PrintLogStatus.REPRINT}>🔄 Reimpressões</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Material */}
                        <div className="w-[150px]">
                            <Select
                                value={materialFilter}
                                onValueChange={setMaterialFilter}
                            >
                                <SelectTrigger className="h-9 bg-card border-none text-xs font-bold">
                                    <SelectValue placeholder="Material" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Materiais</SelectItem>
                                    {materials.map((mat) => (
                                        <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Datas Compacto */}
                        <div className="flex items-center gap-1 bg-card rounded-lg px-2 border-none h-9 group transition-all hover:ring-1 hover:ring-primary/10">
                            <Calendar className="w-4 h-4 text-muted-foreground mr-1" />
                            <input
                                type="date"
                                className="bg-transparent text-[11px] font-bold outline-none border-none py-1 w-[100px]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-muted-foreground/30 text-[10px] mx-1">→</span>
                            <input
                                type="date"
                                className="bg-transparent text-[11px] font-bold outline-none border-none py-1 w-[100px]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                            {(startDate || endDate) && (
                                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1 hover:bg-muted rounded ml-1">
                                    <FilterX className="w-3 h-3 text-red-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Listagem com layout refinado */}
            {loading && logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                    <p className="text-sm font-semibold text-muted-foreground animate-pulse">Sincronizando com a linha de produção...</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted/10 rounded-3xl border-2 border-dashed border-muted">
                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                        <BarChart3 className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Nenhum dado para exibir</h3>
                        <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                            Tente reduzir os filtros ou selecione um período de data diferente.
                        </p>
                        <Button variant="link" onClick={clearFilters} className="mt-4 text-primary font-bold">
                            Resetar todos os filtros
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 pb-20">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                            Histórico Cronológico ({filteredLogs.length} itens)
                        </p>
                    </div>

                    {groupedLogs.map(([dateKey, dateLogs]) => (
                        <div key={dateKey} className="space-y-2">
                            <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-md py-3 z-10">
                                <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm">
                                    {formatGroupDate(dateKey)}
                                </span>
                                <div className="h-px w-full bg-gradient-to-r from-border to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {dateLogs.map((log) => (
                                    <PrintLogItem
                                        key={log.id}
                                        log={log}
                                        formatDate={formatDate}
                                        getStatusInfo={getStatusInfo}
                                        onOpenOrder={handleOpenOrder}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Pedido */}
            <OrderViewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                order={selectedOrder}
            />

            {/* Overlay de carregamento global */}
            {loadingOrder && (
                <div className="fixed inset-0 bg-background/40 backdrop-blur-[3px] z-[100] flex items-center justify-center transition-all">
                    <div className="bg-card p-8 rounded-3xl shadow-2xl border border-primary/20 flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            <Zap className="w-4 h-4 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="font-bold text-lg tracking-tight">Recuperando Pedido...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function PrintLogItem({
    log,
    formatDate,
    getStatusInfo,
    onOpenOrder
}: {
    log: PrintLog;
    formatDate: (d: string) => string;
    getStatusInfo: (s: PrintLogStatus) => any;
    onOpenOrder: (id: number) => void;
}) {
    const { imageSrc, isLoading, imgRef } = useLazyImage(log.item_imagem, { eager: false });
    const status = getStatusInfo(log.status);

    return (
        <div
            onClick={() => onOpenOrder(log.pedido_id)}
            className="group flex items-center gap-4 p-3 rounded-2xl border bg-card hover:bg-accent/5 hover:border-primary/50 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer transition-all duration-300"
        >
            {/* Imagem de Preview Compacta */}
            <div
                ref={imgRef as any}
                className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted border-2 border-transparent group-hover:border-primary/30 flex items-center justify-center relative shadow-inner transition-all"
            >
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={log.item_descricao || 'Item'}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-125"
                    />
                ) : (
                    <Printer className="w-6 h-6 text-muted-foreground/10" />
                )}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
                        <Loader2 className="w-4 h-4 animate-spin text-primary/40" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Identificação */}
                <div className="col-span-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${log.status === PrintLogStatus.SUCCESS ? 'bg-green-500' : log.status === PrintLogStatus.ERROR ? 'bg-red-500' : 'bg-yellow-500'} shadow-[0_0_8px_rgba(34,197,94,0.3)] animate-pulse`} />
                        <span className="font-black text-sm tracking-tight text-foreground">#{log.pedido_numero || log.pedido_id}</span>
                        <div className={`p-0.5 rounded-full ${status.bg} border border-current/10 ml-auto md:ml-0`}>
                            {status.icon}
                        </div>
                    </div>
                    <div className="text-[11px] font-bold text-primary truncate pl-4" title={log.cliente || ''}>
                        {log.cliente || 'Consumidor Final'}
                    </div>
                </div>

                {/* Descrição do Item */}
                <div className="col-span-1 md:col-span-2 min-w-0 pr-4 border-l border-transparent md:group-hover:border-primary/10 pl-0 md:pl-4 transition-all">
                    <div className="text-sm font-bold leading-tight mb-2 truncate text-foreground/80" title={log.item_descricao || ''}>
                        {log.item_descricao || `Item ${log.item_id}`}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px] h-4 py-0 px-2 font-black uppercase tracking-widest bg-muted/80">
                            {log.printer_name}
                        </Badge>
                        {log.item_medidas && (
                            <Badge variant="outline" className="text-[9px] h-4 py-0 px-2 border-primary/20 bg-primary/5 text-primary font-bold">
                                {log.item_medidas}
                            </Badge>
                        )}
                        {log.item_material && (
                            <Badge variant="outline" className="text-[9px] h-4 py-0 px-2 border-foreground/10 bg-muted/30 text-foreground/70 font-bold uppercase overflow-hidden max-w-[100px] truncate">
                                {log.item_material}
                            </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground font-black ml-auto flex items-center bg-muted/30 px-2 py-0.5 rounded-full">
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            {formatDate(log.created_at)}
                        </span>
                    </div>
                </div>

                {/* Ações e Status */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className={`text-[9px] font-black px-3 py-1 rounded-full border ${status.bg} uppercase tracking-widest hidden md:block shadow-sm`}>
                            {status.label}
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-2xl bg-muted/20 md:opacity-0 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </Button>
                    </div>
                    {log.error_message && (
                        <p className="text-[10px] text-red-500 font-bold line-clamp-1 italic max-w-full text-right bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                            "{log.error_message}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
