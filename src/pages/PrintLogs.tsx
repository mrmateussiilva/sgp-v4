import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Printer, AlertCircle, CheckCircle2, RotateCcw, Calendar } from 'lucide-react';
import { api } from '@/services/api';
import { PrintLog, PrintLogStatus } from '@/types';
import { MachineEntity } from '@/api/types';
import { useLazyImage } from '@/hooks/useLazyImage';

export default function PrintLogsPage() {
    const [machines, setMachines] = useState<MachineEntity[]>([]);
    const [selectedMachine, setSelectedMachine] = useState<number | null>(null); // null = Todas
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [logs, setLogs] = useState<PrintLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMachines, setLoadingMachines] = useState(true);

    useEffect(() => {
        loadMachines();
    }, []);

    useEffect(() => {
        loadLogs();
    }, [selectedMachine, startDate, endDate]);

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

    // ... (restante das funções auxiliares permanece igual)

    const getStatusIcon = (status: PrintLogStatus) => {
        switch (status) {
            case PrintLogStatus.SUCCESS:
                return <CheckCircle2 className="w-5 h-5 text-green-600" />;
            case PrintLogStatus.ERROR:
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case PrintLogStatus.REPRINT:
                return <RotateCcw className="w-5 h-5 text-yellow-600" />;
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} às ${hours}:${minutes}`;
        } catch {
            return dateString;
        }
    };

    const groupLogsByDate = (logs: PrintLog[]) => {
        const groups: Record<string, PrintLog[]> = {};

        logs.forEach(log => {
            try {
                const date = new Date(log.created_at);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;
                if (!groups[dateKey]) {
                    groups[dateKey] = [];
                }
                groups[dateKey].push(log);
            } catch {
                if (!groups['invalid']) {
                    groups['invalid'] = [];
                }
                groups['invalid'].push(log);
            }
        });

        return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    };

    const formatGroupDate = (dateKey: string) => {
        if (dateKey === 'invalid') return 'Data inválida';
        try {
            const [year, month, day] = dateKey.split('-');
            const monthNames = [
                'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
            ];
            const monthName = monthNames[parseInt(month) - 1];
            return `${day} de ${monthName} de ${year}`;
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

    const groupedLogs = groupLogsByDate(logs);
    const selectedMachineName = selectedMachine
        ? machines.find(m => m.id === selectedMachine)?.name || ''
        : 'Todas as Impressoras';

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Logs de Impressão</h1>
                    <p className="text-muted-foreground">Histórico detalhado da produção</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="w-5 h-5 text-primary" />
                        Filtros de Busca
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Máquina</label>
                            <Select
                                value={selectedMachine?.toString() || 'all'}
                                onValueChange={(value) => setSelectedMachine(value === 'all' ? null : parseInt(value))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Todas as Impressoras" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Impressoras</SelectItem>
                                    {machines.map((machine) => (
                                        <SelectItem key={machine.id} value={machine.id.toString()}>
                                            {machine.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Início</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Fim</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground animate-pulse">Carregando logs...</p>
                    </div>
                </div>
            ) : logs.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <div className="p-4 rounded-full bg-muted">
                            <Printer className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Sem registros encontrados</h3>
                            <p className="text-muted-foreground max-w-sm">
                                {selectedMachine
                                    ? `A impressora ${selectedMachineName} ainda não realizou nenhuma impressão.`
                                    : 'Ainda não foram registradas impressões em nenhuma máquina.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {groupedLogs.map(([dateKey, dateLogs]) => (
                        <div key={dateKey} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold min-w-max text-primary">
                                    {formatGroupDate(dateKey)}
                                </h2>
                                <div className="h-px w-full bg-border" />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {dateLogs.map((log) => (
                                    <PrintLogItem
                                        key={log.id}
                                        log={log}
                                        formatDate={formatDate}
                                        getStatusIcon={getStatusIcon}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PrintLogItem({
    log,
    formatDate,
    getStatusIcon
}: {
    log: PrintLog;
    formatDate: (d: string) => string;
    getStatusIcon: (s: PrintLogStatus) => React.ReactNode;
}) {
    const { imageSrc, isLoading, error, imgRef } = useLazyImage(log.item_imagem, { eager: false });

    return (
        <div
            className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200"
        >
            {/* Imagem de Preview */}
            <div
                ref={imgRef as any}
                className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted border flex items-center justify-center relative"
            >
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={log.item_descricao || 'Item'}
                        className="w-full h-full object-contain bg-white"
                    />
                ) : isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
                ) : (
                    <Printer className="w-8 h-8 text-muted-foreground/30" />
                )}
                {error && log.item_imagem && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <AlertCircle className="w-6 h-6 text-red-500/50" />
                    </div>
                )}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Detalhes do Pedido e Cliente */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="mt-0.5">
                            {getStatusIcon(log.status)}
                        </div>
                        <span className="font-bold text-lg">
                            Pedido #{log.pedido_numero || log.pedido_id}
                        </span>
                    </div>
                    <div className="font-semibold text-primary truncate max-w-[200px]" title={log.cliente || ''}>
                        {log.cliente || 'Consumidor Final'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        {formatDate(log.created_at)}
                    </div>
                </div>

                {/* Detalhes do Item */}
                <div className="space-y-2 flex flex-col justify-center border-l md:border-l-0 md:pl-0 pl-4 border-muted-foreground/20">
                    <div className="font-medium text-sm line-clamp-2 leading-tight" title={log.item_descricao || ''}>
                        {log.item_descricao || `Item ${log.item_id}`}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {log.item_medidas && (
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                                {log.item_medidas}
                            </span>
                        )}
                        {log.item_material && (
                            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium border border-border">
                                {log.item_material}
                            </span>
                        )}
                    </div>
                </div>

                {/* Máquina e Status */}
                <div className="flex flex-col md:items-end justify-center space-y-2 md:border-l md:border-muted-foreground/20 md:pl-4 pl-4 border-l">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{log.printer_name}</span>
                    </div>
                    {log.error_message && (
                        <div className="text-[10px] text-red-500 font-medium px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/30 line-clamp-2">
                            {log.error_message}
                        </div>
                    )}
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">
                        PRODUÇÃO CONCLUÍDA
                    </div>
                </div>
            </div>
        </div>
    );
}
