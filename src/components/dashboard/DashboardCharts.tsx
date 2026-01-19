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

interface DashboardChartsProps {
    data: DailyAggregation[];
    loading: boolean;
}

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
                <Card className="h-[400px]">
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        <Skeleton className="h-full w-full" />
                    </CardContent>
                </Card>
                <Card className="h-[400px]">
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

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Vendas por Dia */}
            <Card className="h-[400px]">
                <CardHeader>
                    <CardTitle className="text-lg">Vendas por Dia (R$)</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px] pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="data"
                                tickFormatter={formatDate}
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={formatCurrency}
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Total']}
                                labelFormatter={formatDate}
                            />
                            <Bar dataKey="totalVendido" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Pedidos por Dia */}
            <Card className="h-[400px]">
                <CardHeader>
                    <CardTitle className="text-lg">Volume de Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px] pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="data"
                                tickFormatter={formatDate}
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                labelFormatter={formatDate}
                            />
                            <Legend />
                            <Bar dataKey="prontos" stackId="a" name="Prontos" fill="#10b981" />
                            <Bar dataKey="pendentes" stackId="a" name="Pendentes" fill="#f59e0b" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Ticket Médio por Dia */}
            <Card className="h-[400px] lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg">Ticket Médio por Dia</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px] pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="data"
                                tickFormatter={formatDate}
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={formatCurrency}
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Ticket Médio']}
                                labelFormatter={formatDate}
                            />
                            <Line
                                type="monotone"
                                dataKey="ticketMedio"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
