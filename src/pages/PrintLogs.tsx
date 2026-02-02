import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '@/services/api';
import { PrintLog, PrintLogStatus } from '@/types';
import { MachineEntity } from '@/api/types';

export default function PrintLogsPage() {
    const [machines, setMachines] = useState<MachineEntity[]>([]);
    const [selectedMachine, setSelectedMachine] = useState<number | null>(null); // null = Todas
    const [logs, setLogs] = useState<PrintLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMachines, setLoadingMachines] = useState(true);

    useEffect(() => {
        loadMachines();
    }, []);

    useEffect(() => {
        loadLogs();
    }, [selectedMachine]);

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
                data = await api.getAllLogs(100, 0);
            } else {
                data = await api.getPrinterLogs(selectedMachine, 100, 0);
            }
            setLogs(data);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    <p className="text-muted-foreground">Histórico detalhado por item e máquina</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Printer className="w-5 h-5 text-primary" />
                        Filtro por Máquina
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <Select
                            value={selectedMachine?.toString() || 'all'}
                            onValueChange={(value) => setSelectedMachine(value === 'all' ? null : parseInt(value))}
                        >
                            <SelectTrigger className="w-full md:w-80">
                                <SelectValue placeholder="Selecione uma impressora" />
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
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="mt-1 p-2 rounded-lg bg-muted">
                                            {getStatusIcon(log.status)}
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg">
                                                        Pedido #{log.pedido_numero || log.pedido_id}
                                                    </span>
                                                    {log.item_id && (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                                                            Item {log.item_id}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <span>{formatDate(log.created_at)}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:items-end justify-center space-y-1">
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                    <Printer className="w-4 h-4 text-muted-foreground" />
                                                    <span>{log.printer_name}</span>
                                                </div>
                                                {log.error_message && (
                                                    <div className="text-xs text-red-500 font-medium px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/30">
                                                        {log.error_message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <p className="text-center text-sm text-muted-foreground py-4">
                        Exibindo os últimos 100 registros
                    </p>
                </div>
            )}
        </div>
    );
}
