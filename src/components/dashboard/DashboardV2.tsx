import {
    ShoppingCart,
    CheckCircle,
    AlertTriangle,
    Zap,
    Calendar,
    Eye,
    Edit,
    Flame,
    Layers,
    Truck,
    CreditCard,
    ChevronRight,
    ClipboardCheck,
    Bike,
    Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrderWithItems } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/utils/date';
import { cn } from '@/lib/utils';

// Ensure the properties we use are recognized
interface RecentOrder extends OrderWithItems {
    isOverdue?: boolean;
    daysUntilDelivery?: number;
}

interface DashboardStats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    urgentOrders: number;
    overdueOrders: number;
    todayOrders: number;
    completedTodayOrders: number;
    shippingMethods: Array<{ name: string; count: number; percentage: number }>;
}

interface DashboardV2Props {
    stats: DashboardStats;
    productionCounts: {
        financeiro: number;
        conferencia: number;
        sublimacao: number;
        costura: number;
        expedicao: number;
        pronto: number;
    };
    urgentOrders: RecentOrder[];
    recentOrders: RecentOrder[];
    getProductionStatusColor: (order: OrderWithItems) => string;
    getProductionStatus: (order: OrderWithItems) => string;
    handleViewOrder: (order: OrderWithItems) => void;
    handleEditOrder: (order: OrderWithItems) => void;
}

export function DashboardV2({
    stats,
    productionCounts,
    urgentOrders,
    recentOrders,
    getProductionStatusColor,
    getProductionStatus,
    handleViewOrder,
    handleEditOrder
}: DashboardV2Props) {
    const navigate = useNavigate();

    // Alerts are specifically for overdue or high priority that need action
    const overdueOrdersCount = stats.overdueOrders;

    // Sort alerts by urgency
    const sortedAlerts = [...urgentOrders].sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return 0;
    }).slice(0, 5);

    const pipelineItems = [
        { label: 'Financeiro', count: productionCounts.financeiro, icon: CreditCard, color: 'bg-slate-500', textColor: 'text-slate-600', hoverBg: 'hover:bg-slate-50' },
        { label: 'Conferência', count: productionCounts.conferencia, icon: ClipboardCheck, color: 'bg-amber-500', textColor: 'text-amber-600', hoverBg: 'hover:bg-amber-50' },
        { label: 'Sublimação', count: productionCounts.sublimacao, icon: Flame, color: 'bg-orange-500', textColor: 'text-orange-600', hoverBg: 'hover:bg-orange-50' },
        { label: 'Costura', count: productionCounts.costura, icon: Layers, color: 'bg-purple-500', textColor: 'text-purple-600', hoverBg: 'hover:bg-purple-50' },
        { label: 'Expedição', count: productionCounts.expedicao, icon: Truck, color: 'bg-blue-500', textColor: 'text-blue-600', hoverBg: 'hover:bg-blue-50' },
        { label: 'Pronto', count: productionCounts.pronto, icon: CheckCircle, color: 'bg-emerald-500', textColor: 'text-emerald-600', hoverBg: 'hover:bg-emerald-50' },
    ];

    const maxPipelineCount = Math.max(...pipelineItems.map(i => i.count), 1);

    return (
        <div className="space-y-6">
            {/* 1. ALERTAS NO TOPO (BARRA CONCISA) */}
            {overdueOrdersCount > 0 ? (
                <div
                    className="flex items-center justify-between p-4 bg-red-600 text-white rounded-lg shadow-md cursor-pointer hover:bg-red-700 transition-all active:scale-[0.99]"
                    onClick={() => navigate('/dashboard/orders?overdue=true')}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2.5 rounded-full animate-pulse">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-black text-xl tracking-tight uppercase">{overdueOrdersCount} {overdueOrdersCount === 1 ? 'pedido atrasado' : 'pedidos atrasados'}</p>
                            <p className="text-xs font-bold uppercase opacity-80 tracking-widest">Atenção imediata requerida</p>
                        </div>
                    </div>
                    <ChevronRight className="h-6 w-6 opacity-50" />
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg shadow-sm">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-bold text-sm tracking-tight uppercase">Status: Produção em dia</span>
                </div>
            )}

            {/* 3. MELHORAR OS CARDS (MÉTRICAS PRINCIPAIS) - INDUSTRIAL LOOK */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Pedidos Hoje', value: stats.todayOrders, icon: ShoppingCart, color: 'text-blue-600', borderColor: 'border-blue-200' },
                    { label: 'Em Produção', value: stats.pendingOrders, icon: Zap, color: 'text-orange-600', borderColor: 'border-orange-200' },
                    { label: 'Concluídos Hoje', value: stats.completedTodayOrders, icon: CheckCircle, color: 'text-emerald-600', borderColor: 'border-emerald-200' },
                    { label: 'Atrasados', value: stats.overdueOrders, icon: AlertTriangle, color: 'text-red-600', borderColor: 'border-red-200' }
                ].map((stat, i) => (
                    <Card key={i} className={cn("border bg-card shadow-sm hover:shadow-md transition-shadow", stat.borderColor)}>
                        <CardContent className="p-5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-2">{stat.label}</span>
                                <div className="flex items-baseline justify-between">
                                    <h3 className={cn("text-4xl font-black tracking-tighter tabular-nums", stat.color)}>{stat.value}</h3>
                                    <stat.icon className={cn("h-5 w-5 opacity-40", stat.color)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* 2. PRODUÇÃO AGORA (FLUXO OPERACIONAL) */}
                <Card className="lg:col-span-8 shadow-sm border bg-card overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b py-4">
                        <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-[0.2em] text-foreground/70">
                            <Zap className="h-4 w-4 text-orange-500" />
                            Painel de Produção em Tempo Real
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="grid gap-3">
                            {pipelineItems.map((item) => (
                                <div
                                    key={item.label}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-lg border border-transparent transition-all cursor-default",
                                        item.hoverBg,
                                        "hover:border-muted hover:shadow-sm"
                                    )}
                                >
                                    <div className={cn("p-2.5 rounded-md shrink-0 border shadow-inner", item.color, "bg-opacity-10 border-current border-opacity-20")}>
                                        <item.icon className={cn("h-5 w-5", item.textColor)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-black text-foreground uppercase tracking-tight">{item.label}</span>
                                            <span className="text-sm font-black text-foreground bg-muted/80 px-2 py-0.5 rounded border tabular-nums">
                                                {item.count} <span className="text-[10px] text-muted-foreground font-bold">{item.count === 1 ? 'UN' : 'UNS'}</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-1000 ease-in-out", item.color)}
                                                style={{ width: `${(item.count / maxPipelineCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. REDUZIR O PAINEL "PRECISA DE ATENÇÃO" (CONDICIONAL) */}
                <div className="lg:col-span-4 space-y-6">
                    {sortedAlerts.length > 0 && (
                        <Card className="shadow-md border-red-500/20 bg-red-50/20 dark:bg-red-950/20 overflow-hidden">
                            <CardHeader className="bg-red-500/10 border-b border-red-500/10 py-3">
                                <CardTitle className="text-xs font-black flex items-center gap-2 text-red-600 uppercase tracking-widest">
                                    <AlertTriangle className="h-4 w-4" />
                                    Prioridade de Ação
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2">
                                {sortedAlerts.map((order) => (
                                    <div
                                        key={order.id}
                                        className="group relative flex flex-col p-3 border border-red-200 dark:border-red-900/30 rounded-md bg-card hover:border-red-500 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                                        onClick={() => handleViewOrder(order)}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-black tracking-tighter">#{order.numero || order.id}</span>
                                            {order.isOverdue && (
                                                <Badge variant="destructive" className="text-[8px] h-3.5 px-1 font-black uppercase tracking-tighter">Atrasado</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-foreground truncate uppercase tracking-tighter">{order.cliente || order.customer_name}</p>
                                        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-dashed border-muted">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Entrega: {formatDateForDisplay(order.data_entrega, '-')}</span>
                                            <span className="text-[9px] font-black text-red-600 uppercase italic">{(order as any).prioridade || 'Normal'}</span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* 5. MONITORAMENTO DE LOGÍSTICA (NOVA SEÇÃO) */}
                    <Card className="shadow-sm border bg-card overflow-hidden">
                        <CardHeader className="py-3 border-b bg-muted/20">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Truck className="h-3 w-3" />
                                Monitoramento de Logística
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {stats.shippingMethods.length > 0 ? (
                                    stats.shippingMethods.map((method) => {
                                        let ShippingIcon = Truck;
                                        const name = method.name.toLowerCase();
                                        if (name.includes('motoboy') || name.includes('motos') || name.includes('entregador')) ShippingIcon = Bike;
                                        if (name.includes('pac') || name.includes('sedex') || name.includes('correios') || name.includes('postagem') || name.includes('caixa')) ShippingIcon = Package;

                                        return (
                                            <div key={method.name} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                                                <div className="bg-muted p-1.5 rounded text-muted-foreground">
                                                    <ShippingIcon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate uppercase tracking-tight">{method.name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium">
                                                        {method.count} {method.count === 1 ? 'pedido aguardando' : 'pedidos aguardando'}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-black tabular-nums border-none bg-muted px-1.5 h-5">
                                                    {method.percentage}%
                                                </Badge>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 text-center text-xs text-muted-foreground italic">
                                        Nenhum envio programado
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ACESSO RÁPIDO - OPERATIONAL BUTTONS */}
                    <Card className="shadow-sm border bg-card">
                        <CardHeader className="py-3 border-b bg-muted/20">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Terminal de Comando</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 grid gap-2">
                            <Button
                                onClick={() => navigate('/dashboard/orders/new')}
                                className="w-full justify-start font-black uppercase tracking-wider bg-primary hover:bg-primary/90 h-12 shadow-sm border-b-4 border-primary-dark active:border-b-0 active:translate-y-1 transition-all"
                            >
                                <ShoppingCart className="mr-3 h-5 w-5" /> Novo Lote
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/dashboard/orders')}
                                className="w-full justify-start font-black uppercase tracking-wider h-12 border-2 hover:bg-muted/50"
                            >
                                <Calendar className="mr-3 h-5 w-5 text-blue-500" /> Registro Geral
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SECTION 4: RECENT ORDERS (TABELA OPERACIONAL) */}
            <Card className="shadow-sm border bg-card overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b bg-muted/20">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">Últimas Movimentações</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/dashboard/orders')}
                        className="text-[10px] font-black text-primary hover:bg-primary/10 tracking-widest"
                    >
                        VER TODOS OS REGISTROS
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-muted/40 text-[9px] text-muted-foreground text-left uppercase font-black tracking-[0.15em] border-b">
                                    <th className="py-3 px-6">ID Lote</th>
                                    <th className="py-3 px-6">Identificador Cliente</th>
                                    <th className="py-3 px-6">Status Atual</th>
                                    <th className="py-3 px-6 text-right">Data Limite</th>
                                    <th className="py-3 px-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y border-b">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="group hover:bg-muted/30 transition-colors border-l-2 border-l-transparent hover:border-l-primary">
                                        <td className="py-4 px-6 font-black text-primary tabular-nums">#{order.numero || order.id}</td>
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-foreground tracking-tight uppercase">{order.cliente || order.customer_name}</div>
                                            {(order as any).prioridade === 'ALTA' && <span className="text-[8px] font-black text-red-500 bg-red-500/10 px-1 py-0.5 rounded leading-none uppercase tracking-tighter">Alta Prioridade</span>}
                                        </td>
                                        <td className="py-4 px-6">
                                            <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-2 h-5 rounded-sm border-current border-opacity-30 antialiased", getProductionStatusColor(order))}>
                                                {getProductionStatus(order)}
                                            </Badge>
                                        </td>
                                        <td className="py-4 px-6 text-right text-muted-foreground font-bold tabular-nums">
                                            {formatDateForDisplay(order.data_entrega, '-')}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded border shadow-sm hover:bg-muted hover:text-primary transition-all"
                                                    onClick={() => handleViewOrder(order)}
                                                    title="Visualizar Detalhes"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded border shadow-sm hover:bg-muted hover:text-primary transition-all"
                                                    onClick={() => handleEditOrder(order)}
                                                    title="Editar Pedido"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
