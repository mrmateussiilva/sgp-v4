import {
    ShoppingCart,
    CheckCircle,
    Clock,
    AlertTriangle,
    Timer,
    Users,
    Calendar,
    Plus,
    Eye,
    Zap,
    FileText,
    Truck,
    Target,
    Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrderWithItems } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/utils/date';
import { cn } from '@/lib/utils';

interface DashboardStats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    urgentOrders: number;
    overdueOrders: number;
    avgProductionTime: number;
    avgDelayTime: number;
    todayOrders: number;
    efficiencyRate: number;
    shippingMethods: Array<{ name: string; count: number; percentage: number }>;
}

interface RecentOrder extends OrderWithItems {
    isOverdue?: boolean;
    daysUntilDelivery?: number;
}

interface DashboardV1Props {
    stats: DashboardStats;
    productionEfficiency: any;
    urgentOrders: RecentOrder[];
    recentOrders: RecentOrder[];
    isPwa: boolean;
    getProductionStatusColor: (order: OrderWithItems) => string;
    getProductionStatus: (order: OrderWithItems) => string;
    formatDays: (days: number) => string;
    handleViewOrder: (order: OrderWithItems) => void;
    handleEditOrder: (order: OrderWithItems) => void;
    handleCardClick: (filterType: 'all' | 'pending' | 'completed' | 'overdue' | 'urgent') => void;
}

export function DashboardV1({
    stats,
    productionEfficiency,
    urgentOrders,
    recentOrders,
    isPwa,
    getProductionStatusColor,
    getProductionStatus,
    formatDays,
    handleViewOrder,
    handleEditOrder,
    handleCardClick
}: DashboardV1Props) {
    const navigate = useNavigate();

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className={cn("grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4", isPwa && "gap-3")}>
                <Card
                    className={cn(
                        "cursor-pointer hover:bg-accent transition-colors",
                        isPwa && "pwa-card"
                    )}
                    onClick={() => handleCardClick('all')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold">{stats.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.todayOrders} pedidos hoje
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer hover:bg-accent transition-colors",
                        isPwa && "pwa-card"
                    )}
                    onClick={() => handleCardClick('pending')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
                        <p className="text-xs text-muted-foreground">
                            Em produção
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer hover:bg-accent transition-colors",
                        isPwa && "pwa-card"
                    )}
                    onClick={() => handleCardClick('completed')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completedOrders}</div>
                        <p className="text-xs text-muted-foreground">
                            Prontos para entrega
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className={cn(
                        "cursor-pointer hover:bg-accent transition-colors",
                        isPwa && "pwa-card"
                    )}
                    onClick={() => handleCardClick('overdue')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.overdueOrders}</div>
                        <p className="text-xs text-muted-foreground">
                            Fora do prazo
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Shipping Methods Distribution */}
            {stats.shippingMethods.length > 0 && (
                <Card className={isPwa ? "pwa-card" : undefined}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-blue-500" />
                            Formas de Envio
                        </CardTitle>
                        <CardDescription>
                            Distribuição de pedidos por forma de envio
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.shippingMethods.map((method) => (
                                <div key={method.name} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{method.name}</span>
                                        <span className="text-muted-foreground">
                                            {method.count} pedidos ({method.percentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                                            style={{ width: `${method.percentage}%` }}
                                            role="progressbar"
                                            aria-valuenow={method.percentage}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Time-based Stats */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className={isPwa ? "pwa-card" : undefined}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tempo Médio de Produção</CardTitle>
                        <Timer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatDays(stats.avgProductionTime)}</div>
                        <p className="text-xs text-muted-foreground">
                            Do início ao fim
                        </p>
                    </CardContent>
                </Card>

                <Card className={isPwa ? "pwa-card" : undefined}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Atraso Médio</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-red-600">{formatDays(stats.avgDelayTime)}</div>
                        <p className="text-xs text-muted-foreground">
                            Pedidos atrasados
                        </p>
                    </CardContent>
                </Card>

                <Card className={isPwa ? "pwa-card" : undefined}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa de Eficiência</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.efficiencyRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            Entregas no prazo
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Production Efficiency */}
            <Card className={isPwa ? "pwa-card" : undefined}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Eficiência por Etapa de Produção
                    </CardTitle>
                    <CardDescription>
                        Progresso médio dos pedidos por etapa de produção
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{productionEfficiency.financeiro}%</div>
                            <div className="text-sm text-muted-foreground">Financeiro</div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-gray-600 dark:bg-gray-500 h-2 rounded-full transition-all"
                                    style={{ width: `${productionEfficiency.financeiro}%` }}
                                    role="progressbar"
                                    aria-valuenow={productionEfficiency.financeiro}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                ></div>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{productionEfficiency.conferencia}%</div>
                            <div className="text-sm text-muted-foreground">Conferência</div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-yellow-600 dark:bg-yellow-500 h-2 rounded-full transition-all"
                                    style={{ width: `${productionEfficiency.conferencia}%` }}
                                    role="progressbar"
                                    aria-valuenow={productionEfficiency.conferencia}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                ></div>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">{productionEfficiency.sublimacao}%</div>
                            <div className="text-sm text-muted-foreground">Sublimação</div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: `${productionEfficiency.sublimacao}%` }}
                                    role="progressbar"
                                    aria-valuenow={productionEfficiency.sublimacao}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                ></div>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-500">{productionEfficiency.costura}%</div>
                            <div className="text-sm text-muted-foreground">Costura</div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all"
                                    style={{ width: `${productionEfficiency.costura}%` }}
                                    role="progressbar"
                                    aria-valuenow={productionEfficiency.costura}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                ></div>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{productionEfficiency.expedicao}%</div>
                            <div className="text-sm text-muted-foreground">Expedição</div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${productionEfficiency.expedicao}%` }}
                                    role="progressbar"
                                    aria-valuenow={productionEfficiency.expedicao}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                ></div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content Grid */}
            <div className={cn("grid gap-4 lg:grid-cols-2", isPwa ? "gap-4" : "lg:gap-6")}>
                {/* Urgent Orders */}
                <Card className={isPwa ? "pwa-card" : undefined}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Pedidos Urgentes
                        </CardTitle>
                        <CardDescription>
                            Pedidos com prioridade alta que precisam de atenção
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {urgentOrders.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <p className="text-muted-foreground">Nenhum pedido urgente no momento</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {urgentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">#{order.numero || order.id}</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    ALTA
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {order.cliente || order.customer_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Entrega: {formatDateForDisplay(order.data_entrega, '-')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right mr-2">
                                                <Badge className={cn("text-xs", getProductionStatusColor(order))}>
                                                    {getProductionStatus(order)}
                                                </Badge>
                                            </div>
                                            {!isPwa && (
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewOrder(order);
                                                        }}
                                                        aria-label="Visualizar pedido"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditOrder(order);
                                                        }}
                                                        aria-label="Editar pedido"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-4">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => navigate('/dashboard/orders')}
                                    >
                                        Ver Todos os Pedidos
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card className={isPwa ? "pwa-card" : undefined}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            Pedidos Recentes
                        </CardTitle>
                        <CardDescription>
                            Últimos pedidos adicionados ao sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentOrders.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">Nenhum pedido encontrado</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">#{order.numero || order.id}</span>
                                                {order.prioridade === 'ALTA' && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        ALTA
                                                    </Badge>
                                                )}
                                                {order.isOverdue && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        ATRASADO
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {order.cliente || order.customer_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDateForDisplay(order.data_entrada || order.created_at, '-')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right mr-2">
                                                <Badge className={cn("text-xs", getProductionStatusColor(order))}>
                                                    {getProductionStatus(order)}
                                                </Badge>
                                            </div>
                                            {!isPwa && (
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewOrder(order);
                                                        }}
                                                        aria-label="Visualizar pedido"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditOrder(order);
                                                        }}
                                                        aria-label="Editar pedido"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-4">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => navigate('/dashboard/orders')}
                                    >
                                        Ver Todos os Pedidos
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className={isPwa ? "pwa-card" : undefined}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-500" />
                        Ações Rápidas
                    </CardTitle>
                    <CardDescription>
                        Acesso rápido às funcionalidades principais
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className={cn(
                        "grid gap-4",
                        isPwa ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"
                    )}>
                        {!isPwa && (
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col gap-2"
                                onClick={() => navigate('/dashboard/orders/new')}
                            >
                                <Plus className="h-6 w-6" />
                                <span>Novo Pedido</span>
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2"
                            onClick={() => navigate('/dashboard/orders')}
                        >
                            <ShoppingCart className="h-6 w-6" />
                            <span>Gerenciar Pedidos</span>
                        </Button>

                        {!isPwa && (
                            <Button
                                variant="outline"
                                className="h-20 flex flex-col gap-2"
                                onClick={() => navigate('/dashboard/clientes')}
                            >
                                <Users className="h-6 w-6" />
                                <span>Clientes</span>
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            className="h-20 flex flex-col gap-2"
                            onClick={() => navigate('/dashboard/relatorios-envios')}
                        >
                            <Truck className="h-6 w-6" />
                            <span>Relatórios</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
