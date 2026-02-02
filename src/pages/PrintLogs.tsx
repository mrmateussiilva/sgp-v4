import { useState, useEffect } from 'react';
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
    ExternalLink
} from 'lucide-react';
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
    }, [logs, searchQuery, statusFilter]);

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
            setLoading(true);
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
            {/* Header Compacto */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        <Printer className="w-7 h-7 text-primary" />
                        Relatório de Produção
                    </h1>
                    <p className="text-sm text-muted-foreground">Monitore o que está saindo em tempo real</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="h-9 px-3 text-muted-foreground"
                    >
                        <FilterX className="w-4 h-4 mr-2" />
                        Limpar
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => loadLogs()}
                        disabled={loading}
                        className="h-9 px-4"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Toolbar de Filtros */}
            <Card className="border-none shadow-sm bg-muted/30">
                <CardContent className="p-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Busca */}
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Pedido, cliente ou item..."
                                className="pl-9 bg-card border-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Máquina */}
                        <div className="w-[180px]">
                            <Select
                                value={selectedMachine?.toString() || 'all'}
                                onValueChange={(value) => setSelectedMachine(value === 'all' ? null : parseInt(value))}
                            >
                                <SelectTrigger className="bg-card border-none">
                                    <SelectValue placeholder="Todas Máquinas" />
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
                        <div className="w-[140px]">
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger className="bg-card border-none">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Status</SelectItem>
                                    <SelectItem value={PrintLogStatus.SUCCESS}>Sucessos</SelectItem>
                                    <SelectItem value={PrintLogStatus.ERROR}>Erros</SelectItem>
                                    <SelectItem value={PrintLogStatus.REPRINT}>Reimpressões</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Datas */}
                        <div className="flex items-center gap-2 bg-card rounded-md px-2 border-none h-10">
                            <Calendar className="w-4 h-4 text-muted-foreground ml-1" />
                            <input
                                type="date"
                                className="bg-transparent text-sm outline-none border-none py-1"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-muted-foreground/30 text-xs">até</span>
                            <input
                                type="date"
                                className="bg-transparent text-sm outline-none border-none py-1"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Listagem */}
            {loading && logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Consultando banco de dados...</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3 bg-card rounded-2xl border border-dashed">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Nenhum log encontrado</h3>
                        <p className="text-sm text-muted-foreground">Tente ajustar seus filtros ou busca.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 pb-10">
                    {groupedLogs.map(([dateKey, dateLogs]) => (
                        <div key={dateKey} className="space-y-3">
                            <div className="flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-sm p-1 z-10">
                                <span className="bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider">
                                    {formatGroupDate(dateKey)}
                                </span>
                                <div className="h-px w-full bg-border" />
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

            {/* Modais */}
            <OrderViewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                order={selectedOrder}
            />

            {/* Overlay de carregamento global */}
            {loadingOrder && (
                <div className="fixed inset-0 bg-background/30 backdrop-blur-[2px] z-[100] flex items-center justify-center">
                    <div className="bg-card p-6 rounded-2xl shadow-2xl border border-primary/20 flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="font-semibold text-sm">Acessando registro...</p>
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
            className="group flex items-center gap-4 p-3 rounded-xl border bg-card hover:bg-accent/5 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-300"
        >
            {/* Imagem de Preview Compacta */}
            <div
                ref={imgRef as any}
                className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted border flex items-center justify-center relative shadow-inner"
            >
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={log.item_descricao || 'Item'}
                        className="w-full h-full object-contain transition-transform group-hover:scale-110"
                    />
                ) : (
                    <Printer className="w-6 h-6 text-muted-foreground/20" />
                )}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                        <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Identificação */}
                <div className="col-span-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm tracking-tight text-foreground">#{log.pedido_numero || log.pedido_id}</span>
                        <div className={`p-0.5 rounded-full ${status.bg} border`}>
                            {status.icon}
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-primary truncate" title={log.cliente || ''}>
                        {log.cliente || 'Consumidor Final'}
                    </div>
                </div>

                {/* Descrição do Item */}
                <div className="col-span-1 md:col-span-2 min-w-0 pr-4 border-l border-transparent md:group-hover:border-primary/20 pl-0 md:pl-4 transition-colors">
                    <div className="text-sm font-medium leading-tight mb-1 truncate text-foreground/90" title={log.item_descricao || ''}>
                        {log.item_descricao || `Item ${log.item_id}`}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[9px] h-4 py-0 px-1.5 font-bold uppercase tracking-tighter">
                            {log.printer_name}
                        </Badge>
                        {log.item_medidas && (
                            <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5 border-primary/20 bg-primary/5 text-primary">
                                {log.item_medidas}
                            </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground font-medium ml-1 flex items-center">
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            {formatDate(log.created_at)}
                        </span>
                    </div>
                </div>

                {/* Ações e Status */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.bg} uppercase tracking-wider hidden md:block`}>
                            {status.label}
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full md:opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                    {log.error_message && (
                        <p className="text-[10px] text-red-500 font-medium line-clamp-1 italic max-w-full text-right">
                            "{log.error_message}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
