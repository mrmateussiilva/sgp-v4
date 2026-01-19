import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    LineChart,
    Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyAggregation } from '@/services/dashboardService';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';

interface DashboardChartsProps {
    data: DailyAggregation[];
    loading: boolean;
}

const CustomTooltip = ({ active, payload, label, isCurrency }: any) => {
    if (active && payload && payload.length) {
        const formatDate = (dateStr: string) => {
            const [, m, d] = dateStr.split('-');
            return `${d}/${m}`;
        };

        return (
            <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg outline-none">
                <p className="text-sm font-bold text-slate-900 mb-1">{formatDate(label)}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs flex items-center gap-2" style={{ color: entry.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="font-medium text-slate-600">{entry.name}:</span>
                        <span className="font-bold">
                            {isCurrency
                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)
                                : entry.value}
                        </span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function DashboardCharts({ data, loading }: DashboardChartsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            notation: 'compact',
            compactDisplay: 'short',
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        const [, m, d] = dateStr.split('-');
        return `${d}/${m}`;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="h-[400px] border-slate-200">
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        <Skeleton className="h-full w-full" />
                    </CardContent>
                </Card>
                <Card className="h-[400px] border-slate-200">
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        <Skeleton className="h-full w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isSingleton = data.length === 1;

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Vendas por Dia */}
            <Card className="h-[400px] border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground italic">Faturamento Diário</CardTitle>
                    {isSingleton && <Info className="h-4 w-4 text-blue-400" />}
                </CardHeader>
                <CardContent className="h-[320px] pb-4">
                    {isSingleton ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-blue-50/30 rounded-xl border border-dashed border-blue-100">
                            <p className="text-sm font-semibold text-blue-900 mb-1">Apenas {data[0].quantidadePedidos} {data[0].quantidadePedidos === 1 ? 'pedido' : 'pedidos'}</p>
                            <div className="text-3xl font-bold text-blue-600 mb-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data[0].totalVendido)}</div>
                            <p className="text-xs text-blue-600/70 italic">Poucos dias para gerar gráfico de tendência.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="data"
                                    tickFormatter={formatDate}
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    stroke="#94a3b8"
                                />
                                <YAxis
                                    tickFormatter={formatCurrency}
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    stroke="#94a3b8"
                                />
                                <Tooltip content={<CustomTooltip isCurrency />} />
                                <Bar dataKey="totalVendido" name="Vendido" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Volume de Pedidos - Stacked */}
            <Card className="h-[400px] border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground italic">Distribuição de Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px] pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="data"
                                tickFormatter={formatDate}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                stroke="#94a3b8"
                            />
                            <YAxis
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                stroke="#94a3b8"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar dataKey="prontos" stackId="a" name="Prontos" fill="#10b981" radius={[0, 0, 0, 0]} barSize={32} />
                            <Bar dataKey="pendentes" stackId="a" name="Pendentes" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Ticket Médio por Dia */}
            <Card className="h-[400px] lg:col-span-2 border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground italic">Evolução de Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px] pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="data"
                                tickFormatter={formatDate}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                stroke="#94a3b8"
                            />
                            <YAxis
                                tickFormatter={formatCurrency}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                stroke="#94a3b8"
                            />
                            <Tooltip content={<CustomTooltip isCurrency />} />
                            <Line
                                type="monotone"
                                dataKey="ticketMedio"
                                name="Ticket Médio"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
