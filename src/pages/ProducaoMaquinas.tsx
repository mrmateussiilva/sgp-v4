
import React, { useEffect, useState } from 'react';
import { maquinasApi } from '../api/endpoints/maquinas';
import { MachineDashboardData } from '../api/types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, Calendar, AlertCircle } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { RemoteImage } from '../components/RemoteImage';

export const ProducaoMaquinas: React.FC = () => {
    const [data, setData] = useState<MachineDashboardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const result = await maquinasApi.getDashboardOverview();
            setData(result);
        } catch (err) {
            console.error(err);
            setError("Erro ao carregar dados do dashboard.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-slate-500">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full flex-col bg-slate-50/50 p-6 overflow-hidden">
            <header className="mb-6 flex shrink-0 items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Produção por Máquina</h1>
                    <p className="text-sm text-slate-500">Acompanhamento de fila de impressão em tempo real</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">
                        {data.reduce((acc, curr) => acc + curr.total_items, 0)} Itens na fila
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                        {data.reduce((acc, curr) => acc + curr.total_area, 0).toFixed(2)} m² Total
                    </Badge>
                </div>
            </header>

            <ScrollArea className="flex-1 pb-4">
                <div className="flex gap-4 pb-4 w-max min-w-full">
                    {data.map((machine) => (
                        <Card key={machine.machine_id} className="w-[320px] shrink-0 border-slate-200 bg-slate-100/50 shadow-sm flex flex-col h-full max-h-[80vh]">
                            <CardHeader className="bg-white pb-3 pt-4 border-b border-slate-100 sticky top-0 z-10 rounded-t-xl">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-800">
                                        {machine.machine_name}
                                    </CardTitle>
                                    <Badge variant={machine.queue.length > 0 ? "default" : "secondary"} className="text-[10px]">
                                        {machine.queue.length > 0 ? "Ocupada" : "Livre"}
                                    </Badge>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                    <span>{machine.total_items} itens</span>
                                    <span className="font-medium text-slate-700">{machine.total_area.toFixed(2)} m²</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 flex-1 overflow-y-auto">
                                <div className="flex flex-col gap-3">
                                    {machine.queue.length === 0 ? (
                                        <div className="py-8 text-center text-xs text-slate-400">
                                            Fila vazia
                                        </div>
                                    ) : (
                                        machine.queue.map((item) => (
                                            <div
                                                key={`${item.order_id}-${item.item_index}`}
                                                className="group relative flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                        #{item.order_number || item.order_id}
                                                    </span>
                                                    {item.priority === 'ALTA' && (
                                                        <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full animate-pulse">
                                                            URGENTE
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex gap-3 mt-1">
                                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
                                                        <RemoteImage
                                                            src={item.preview_url}
                                                            alt="Preview"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                        <span className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight">
                                                            {item.item_name || "Item sem nome"}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {item.material} • {item.dimensions}
                                                        </span>
                                                        <div className="mt-auto pt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{item.date_due ? new Date(item.date_due).toLocaleDateString('pt-BR') : 'S/ Data'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
