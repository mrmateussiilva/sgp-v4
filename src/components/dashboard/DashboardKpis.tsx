import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardKpisProps {
    stats: {
        totalVendido: number;
        nPedidos: number;
        ticketMedio: number;
        melhorDia: { data: string; total: number; count: number } | null;
        piorDia: { data: string; total: number; count: number } | null;
        porcentagemProntos: number;
        porcentagemAltaPrioridade: number;
    } | null;
    loading: boolean;
}

export function DashboardKpis({ stats, loading }: DashboardKpisProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="shadow-sm border-slate-200">
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-20" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Total Vendido */}
            <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Venda Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(stats.totalVendido)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Faturamento bruto</p>
                </CardContent>
            </Card>

            {/* Nº de Pedidos */}
            <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Volume</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{stats.nPedidos}</div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Total de pedidos</p>
                </CardContent>
            </Card>

            {/* Ticket Médio */}
            <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ticket Médio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.ticketMedio)}</div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Média por pedido</p>
                </CardContent>
            </Card>

            {/* Melhor Dia */}
            <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Melhor Dia</CardTitle>
                    <Calendar className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">
                        {stats.melhorDia ? formatCurrency(stats.melhorDia.total) : 'R$ 0,00'}
                    </div>
                    {stats.melhorDia && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">
                            em {formatDate(stats.melhorDia.data)} • {stats.melhorDia.count} {stats.melhorDia.count === 1 ? 'ped' : 'peds'}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Pior Dia */}
            <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Menor Dia</CardTitle>
                    <Calendar className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">
                        {stats.piorDia ? formatCurrency(stats.piorDia.total) : 'R$ 0,00'}
                    </div>
                    {stats.piorDia && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">
                            em {formatDate(stats.piorDia.data)} • {stats.piorDia.count} {stats.piorDia.count === 1 ? 'ped' : 'peds'}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* % Alta Prioridade */}
            <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Urgência</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight text-red-600">
                        {stats.porcentagemAltaPrioridade.toFixed(1)}%
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Prioridade ALTA</p>
                </CardContent>
            </Card>
        </div>
    );
}
