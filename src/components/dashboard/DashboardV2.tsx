import {
    ShoppingCart,
    CheckCircle,
    Clock,
    AlertTriangle,
    Zap,
    Calendar,
    Eye,
    Edit,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrderWithItems } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/utils/date';
import { cn } from '@/lib/utils';

interface DashboardStats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    urgentOrders: number;
    overdueOrders: number;
    todayOrders: number;
    completedTodayOrders: number;
}

interface RecentOrder extends OrderWithItems {
    isOverdue?: boolean;
    daysUntilDelivery?: number;
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

    // Combine urgent and overdue for alerts
    const alerts = [...urgentOrders];

    // Sort alerts by urgency (overdue first, then delivery date)
    const sortedAlerts = alerts.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return 0; // Keep existing order for same status
    }).slice(0, 6);

    const pipelineItems = [
        { label: 'Financeiro', count: productionCounts.financeiro, color: 'bg-gray-500' },
        { label: 'Conferência', count: productionCounts.conferencia, color: 'bg-yellow-500' },
        { label: 'Sublimação', count: productionCounts.sublimacao, color: 'bg-orange-500' },
        { label: 'Costura', count: productionCounts.costura, color: 'bg-purple-500' },
        { label: 'Expedição', count: productionCounts.expedicao, color: 'bg-blue-500' },
        { label: 'Pronto', count: productionCounts.pronto, color: 'bg-green-500' },
    ];

    const maxPipelineCount = Math.max(...pipelineItems.map(i => i.count), 1);

    return (
        <div className="space-y-6">
            {/* SECTION 1: MAIN METRICS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pedidos Hoje</p>
                                <h3 className="text-3xl font-bold mt-1">{stats.todayOrders}</h3>
                            </div>
                            <div className="bg-blue-100 p-2 rounded-lg dark:bg-blue-900/30">
                                <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Em Produção</p>
                                <h3 className="text-3xl font-bold mt-1 text-orange-600">{stats.pendingOrders}</h3>
                            </div>
                            <div className="bg-orange-100 p-2 rounded-lg dark:bg-orange-900/30">
                                <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Concluídos Hoje</p>
                                <h3 className="text-3xl font-bold mt-1 text-green-600">{stats.completedTodayOrders}</h3>
                            </div>
                            <div className="bg-green-100 p-2 rounded-lg dark:bg-green-900/30">
                                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm transition-all hover:shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Atrasados</p>
                                <h3 className="text-3xl font-bold mt-1 text-red-600">{stats.overdueOrders}</h3>
                            </div>
                            <div className="bg-red-100 p-2 rounded-lg dark:bg-red-900/30">
                                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* SECTION 2: PRODUCTION PIPELINE */}
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Pipeline de Produção
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-2">
                            {pipelineItems.map((item) => (
                                <div key={item.label} className="group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-semibold text-foreground/80 lowercase first-letter:uppercase">{item.label}</span>
                                        <span className="text-sm font-bold bg-muted px-2 py-0.5 rounded-md">{item.count}</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500 ease-in-out", item.color)}
                                            style={{ width: `${(item.count / maxPipelineCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-6 text-muted-foreground hover:text-primary"
                            onClick={() => navigate('/dashboard/orders')}
                        >
                            Ver fluxo completo <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                {/* SECTION 3: ALERTS */}
                <Card className="shadow-sm border-red-100 dark:border-red-900/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Precisa de Atenção
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sortedAlerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <CheckCircle className="h-10 w-10 text-green-500 mb-2 opacity-20" />
                                <p className="text-sm text-muted-foreground font-medium">Tudo em dia!</p>
                            </div>
                        ) : (
                            <div className="space-y-3 pt-2">
                                {sortedAlerts.map((order) => (
                                    <div
                                        key={order.id}
                                        className="group relative flex flex-col p-3 border rounded-xl bg-card hover:bg-accent/50 transition-all cursor-pointer overflow-hidden"
                                        onClick={() => handleViewOrder(order)}
                                    >
                                        {order.isOverdue && (
                                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-[10px] font-bold text-white rounded-bl-lg">
                                                ATRASADO
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-bold">#{order.numero || order.id}</span>
                                            <Badge className={cn("text-[10px] h-5", getProductionStatusColor(order))}>
                                                {getProductionStatus(order)}
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-medium text-foreground/80 truncate mb-1">
                                            {order.cliente || order.customer_name}
                                        </p>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">
                                                Entrega: {formatDateForDisplay(order.data_entrega, '-')}
                                            </span>
                                            {order.prioridade === 'ALTA' && (
                                                <span className="text-red-500 font-bold">URGENTE</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* SECTION 4: RECENT ORDERS */}
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        Pedidos Recentes
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/orders')}>
                        Ver todos
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground text-left">
                                    <th className="pb-3 pt-0 font-medium px-2">Número</th>
                                    <th className="pb-3 pt-0 font-medium px-2">Cliente</th>
                                    <th className="pb-3 pt-0 font-medium px-2">Etapa</th>
                                    <th className="pb-3 pt-0 font-medium px-2 text-right">Prazo</th>
                                    <th className="pb-3 pt-0 font-medium px-2 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="group hover:bg-accent/50 transition-colors">
                                        <td className="py-3 px-2 font-bold text-primary">#{order.numero || order.id}</td>
                                        <td className="py-3 px-2">
                                            <div className="font-medium">{order.cliente || order.customer_name}</div>
                                            {order.prioridade === 'ALTA' && <span className="text-[10px] font-bold text-red-500">ALTA PRIORIDADE</span>}
                                        </td>
                                        <td className="py-3 px-2">
                                            <Badge variant="outline" className={cn("text-[10px] font-semibold", getProductionStatusColor(order))}>
                                                {getProductionStatus(order)}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-2 text-right text-muted-foreground">
                                            {formatDateForDisplay(order.data_entrega, '-')}
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => handleViewOrder(order)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => handleEditOrder(order)}
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

            {/* QUICK LAUNCHER */}
            <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => navigate('/dashboard/orders/new')} className="bg-primary hover:bg-primary/90">
                    <ShoppingCart className="mr-2 h-4 w-4" /> Novo Pedido
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard/clientes')}>
                    Clientes
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard/relatorios-envios')}>
                    Relatórios
                </Button>
            </div>
        </div>
    );
}
