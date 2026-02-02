import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '@/services/api';
import { PrintLog, PrintLogStatus } from '@/types';
import { MachineEntity } from '@/api/types';

export default function PrintLogsPage() {
    const [machines, setMachines] = useState<MachineEntity[]>([]);
    const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
    const [logs, setLogs] = useState<PrintLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMachines, setLoadingMachines] = useState(true);

    useEffect(() => {
        loadMachines();
    }, []);

    useEffect(() => {
        if (selectedMachine) {
            loadLogs();
        }
    }, [selectedMachine]);

    const loadMachines = async () => {
        try {
            setLoadingMachines(true);
            const data = await api.getMaquinasAtivas();
            setMachines(data);
            if (data.length > 0) {
                setSelectedMachine(data[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar máquinas:', error);
        } finally {
            setLoadingMachines(false);
        }
    };

    const loadLogs = async () => {
        if (!selectedMachine) return;

        try {
            setLoading(true);
            const data = await api.getPrinterLogs(selectedMachine, 100, 0);
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

    if (machines.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <Printer className="w-16 h-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Nenhuma impressora cadastrada</h2>
                <p className="text-muted-foreground">Cadastre impressoras para visualizar os logs</p>
            </div>
        );
    }

    const groupedLogs = groupLogsByDate(logs);
    const selectedMachineName = machines.find(m => m.id === selectedMachine)?.name || '';

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Logs de Impressão</h1>
                    <p className="text-muted-foreground">Histórico de impressões por máquina</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        Selecione a Impressora
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Select
                            value={selectedMachine?.toString()}
                            onValueChange={(value) => setSelectedMachine(parseInt(value))}
                        >
                            <SelectTrigger className="w-full md:w-96">
                                <SelectValue placeholder="Selecione uma impressora" />
                            </SelectTrigger>
                            <SelectContent>
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
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : logs.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                        <Printer className="w-20 h-20 text-muted-foreground/50" />
                        <h3 className="text-xl font-semibold">Nenhuma impressão registrada</h3>
                        <p className="text-muted-foreground text-center max-w-md">
                            A impressora <strong>{selectedMachineName}</strong> ainda não realizou nenhuma impressão.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {groupedLogs.map(([dateKey, dateLogs]) => (
                        <Card key={dateKey}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-semibold">{formatGroupDate(dateKey)}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {dateLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                                        >
                                            <div className="mt-0.5">
                                                {getStatusIcon(log.status)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="font-medium">Pedido #{log.pedido_numero || log.pedido_id}</span>
                                                    {log.item_id && (
                                                        <span className="text-sm text-muted-foreground">Item {log.item_id}</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground mt-0.5">
                                                    {formatDate(log.created_at)}
                                                </div>
                                                {log.error_message && (
                                                    <div className="text-sm text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                                                        <strong>Erro:</strong> {log.error_message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
