import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, AlertCircle, CheckCircle2, RotateCcw, FileText } from 'lucide-react';
import { api } from '@/services/api';
import { PrintLog, PrintLogStatus } from '@/types';
import { MachineEntity } from '@/api/types';

export default function PrintLogsPage() {
    const [machines, setMachines] = useState<MachineEntity[]>([]);
    const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
    const [logs, setLogs] = useState<PrintLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMachines, setLoadingMachines] = useState(true);
    const [statusFilter, setStatusFilter] = useState<PrintLogStatus | 'all'>('all');

    useEffect(() => {
        loadMachines();
    }, []);

    useEffect(() => {
        if (selectedMachine) {
            loadLogs();
        }
    }, [selectedMachine, statusFilter]);

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
            const filter = statusFilter === 'all' ? undefined : statusFilter;
            const data = await api.getPrinterLogs(selectedMachine, 100, 0, filter);
            setLogs(data);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: PrintLogStatus) => {
        switch (status) {
            case PrintLogStatus.SUCCESS:
                return (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Sucesso
                    </Badge>
                );
            case PrintLogStatus.ERROR:
                return (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Erro
                    </Badge>
                );
            case PrintLogStatus.REPRINT:
                return (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reimpressão
                    </Badge>
                );
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

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Logs de Impressão</h1>
                    <p className="text-muted-foreground">Histórico completo de impressões por máquina</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Impressora</label>
                            <Select
                                value={selectedMachine?.toString()}
                                onValueChange={(value) => setSelectedMachine(parseInt(value))}
                            >
                                <SelectTrigger>
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) => setStatusFilter(value as PrintLogStatus | 'all')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value={PrintLogStatus.SUCCESS}>Sucesso</SelectItem>
                                    <SelectItem value={PrintLogStatus.ERROR}>Erro</SelectItem>
                                    <SelectItem value={PrintLogStatus.REPRINT}>Reimpressão</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : logs.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                        <FileText className="w-16 h-16 text-muted-foreground" />
                        <h3 className="text-xl font-semibold">Nenhum log encontrado</h3>
                        <p className="text-muted-foreground text-center">
                            Não há registros de impressão para esta máquina
                            {statusFilter !== 'all' && ' com o filtro selecionado'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {groupedLogs.map(([dateKey, dateLogs]) => (
                        <Card key={dateKey}>
                            <CardHeader>
                                <CardTitle className="text-lg">{formatGroupDate(dateKey)}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {dateLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">Pedido #{log.pedido_numero || log.pedido_id}</span>
                                                    {log.item_id && (
                                                        <span className="text-sm text-muted-foreground">• Item {log.item_id}</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {formatDate(log.created_at)}
                                                </div>
                                                {log.error_message && (
                                                    <div className="text-sm text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                                                        <strong>Erro:</strong> {log.error_message}
                                                    </div>
                                                )}
                                            </div>
                                            <div>{getStatusBadge(log.status)}</div>
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
