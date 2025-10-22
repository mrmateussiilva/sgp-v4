import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TrendingUp
} from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { OrderWithItems } from '../types';
import { useToast } from '@/hooks/use-toast';
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
}

interface RecentOrder extends OrderWithItems {
  isOverdue?: boolean;
  daysUntilDelivery?: number;
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { orders } = useOrderStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    urgentOrders: 0,
    overdueOrders: 0,
    avgProductionTime: 0,
    avgDelayTime: 0,
    todayOrders: 0,
    efficiencyRate: 0,
  });

  useEffect(() => {
    calculateStats();
  }, [orders]);

  const calculateStats = () => {
    setLoading(true);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => !order.pronto).length;
    const completedOrders = orders.filter(order => order.pronto).length;
    const urgentOrders = orders.filter(order => order.prioridade === 'ALTA').length;
    
    // Calcular pedidos atrasados
    const overdueOrders = orders.filter(order => {
      if (order.pronto) return false;
      const deliveryDate = order.data_entrega ? new Date(order.data_entrega) : null;
      return deliveryDate && deliveryDate < today;
    }).length;
    
    // Calcular tempo médio de produção (apenas pedidos concluídos)
    const completedOrdersWithDates = orders.filter(order => {
      return order.pronto && order.data_entrada && order.created_at;
    });
    
    let totalProductionTime = 0;
    completedOrdersWithDates.forEach(order => {
      const startDate = new Date(order.data_entrada || order.created_at || '');
      const endDate = new Date();
      const productionDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      totalProductionTime += productionDays;
    });
    
    const avgProductionTime = completedOrdersWithDates.length > 0 
      ? Math.round(totalProductionTime / completedOrdersWithDates.length) 
      : 0;
    
    // Calcular tempo médio de atraso
    const overdueOrdersWithDates = orders.filter(order => {
      if (order.pronto) return false;
      const deliveryDate = order.data_entrega ? new Date(order.data_entrega) : null;
      return deliveryDate && deliveryDate < today;
    });
    
    let totalDelayTime = 0;
    overdueOrdersWithDates.forEach(order => {
      const deliveryDate = new Date(order.data_entrega || '');
      const delayDays = Math.ceil((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDelayTime += delayDays;
    });
    
    const avgDelayTime = overdueOrdersWithDates.length > 0 
      ? Math.round(totalDelayTime / overdueOrdersWithDates.length) 
      : 0;
    
    const todayOrders = orders.filter(order => {
      const orderDate = order.data_entrada || order.created_at;
      return orderDate && orderDate.startsWith(todayStr);
    }).length;

    // Calcular taxa de eficiência (pedidos no prazo vs total)
    const onTimeOrders = orders.filter(order => {
      if (!order.pronto) return false;
      const deliveryDate = order.data_entrega ? new Date(order.data_entrega) : null;
      const completedDate = order.updated_at ? new Date(order.updated_at) : new Date();
      return deliveryDate && completedDate <= deliveryDate;
    }).length;
    
    const efficiencyRate = completedOrders > 0 
      ? Math.round((onTimeOrders / completedOrders) * 100) 
      : 0;

    setStats({
      totalOrders,
      pendingOrders,
      completedOrders,
      urgentOrders,
      overdueOrders,
      avgProductionTime,
      avgDelayTime,
      todayOrders,
      efficiencyRate,
    });
    
    setLoading(false);
  };

  const getRecentOrders = (): RecentOrder[] => {
    return orders
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.data_entrada || '');
        const dateB = new Date(b.created_at || b.data_entrada || '');
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5)
      .map(order => {
        const deliveryDate = order.data_entrega ? new Date(order.data_entrega) : null;
        const today = new Date();
        const isOverdue = deliveryDate && deliveryDate < today && !order.pronto;
        const daysUntilDelivery = deliveryDate 
          ? Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...order,
          isOverdue,
          daysUntilDelivery,
        };
      });
  };

  const getUrgentOrders = (): RecentOrder[] => {
    return orders
      .filter(order => order.prioridade === 'ALTA' && !order.pronto)
      .sort((a, b) => {
        const dateA = new Date(a.data_entrega || '');
        const dateB = new Date(b.data_entrega || '');
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  };

  const formatDays = (days: number): string => {
    if (days === 1) return '1 dia';
    return `${days} dias`;
  };

  const getProductionStatus = (order: OrderWithItems): string => {
    if (order.pronto) return 'Pronto';
    if (order.expedicao) return 'Expedição';
    if (order.costura) return 'Costura';
    if (order.sublimacao) return 'Sublimação';
    if (order.conferencia) return 'Conferência';
    if (order.financeiro) return 'Financeiro';
    return 'Pendente';
  };

  const getProductionStatusColor = (order: OrderWithItems): string => {
    if (order.pronto) return 'bg-green-100 text-green-800';
    if (order.expedicao) return 'bg-blue-100 text-blue-800';
    if (order.costura) return 'bg-purple-100 text-purple-800';
    if (order.sublimacao) return 'bg-orange-100 text-orange-800';
    if (order.conferencia) return 'bg-yellow-100 text-yellow-800';
    if (order.financeiro) return 'bg-gray-100 text-gray-800';
    return 'bg-red-100 text-red-800';
  };

  const recentOrders = getRecentOrders();
  const urgentOrders = getUrgentOrders();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de gerenciamento de pedidos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/dashboard/orders/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/orders')}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Todos
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayOrders} pedidos hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Em produção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Prontos para entrega
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueOrders}</div>
            <p className="text-xs text-muted-foreground">
              Fora do prazo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time-based Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Produção</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatDays(stats.avgProductionTime)}</div>
            <p className="text-xs text-muted-foreground">
              Do início ao fim
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atraso Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatDays(stats.avgDelayTime)}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos atrasados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Eficiência</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.efficiencyRate}%</div>
            <p className="text-xs text-muted-foreground">
              Entregas no prazo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Production Efficiency */}
      <Card>
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
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{Math.round((orders.filter(o => o.financeiro).length / Math.max(orders.length, 1)) * 100)}%</div>
              <div className="text-sm text-muted-foreground">Financeiro</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-gray-600 h-2 rounded-full" 
                  style={{ width: `${(orders.filter(o => o.financeiro).length / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{Math.round((orders.filter(o => o.conferencia).length / Math.max(orders.length, 1)) * 100)}%</div>
              <div className="text-sm text-muted-foreground">Conferência</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${(orders.filter(o => o.conferencia).length / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.round((orders.filter(o => o.sublimacao).length / Math.max(orders.length, 1)) * 100)}%</div>
              <div className="text-sm text-muted-foreground">Sublimação</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${(orders.filter(o => o.sublimacao).length / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round((orders.filter(o => o.costura).length / Math.max(orders.length, 1)) * 100)}%</div>
              <div className="text-sm text-muted-foreground">Costura</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${(orders.filter(o => o.costura).length / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round((orders.filter(o => o.expedicao).length / Math.max(orders.length, 1)) * 100)}%</div>
              <div className="text-sm text-muted-foreground">Expedição</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(orders.filter(o => o.expedicao).length / Math.max(orders.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Orders */}
        <Card>
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
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                    <div className="text-right">
                      <Badge className={cn("text-xs", getProductionStatusColor(order))}>
                        {getProductionStatus(order)}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate('/dashboard/orders')}
                >
                  Ver Todos os Pedidos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
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
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                    <div className="text-right">
                      <Badge className={cn("text-xs", getProductionStatusColor(order))}>
                        {getProductionStatus(order)}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate('/dashboard/orders')}
                >
                  Ver Todos os Pedidos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/dashboard/orders/new')}
            >
              <Plus className="h-6 w-6" />
              <span>Novo Pedido</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/dashboard/orders')}
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Gerenciar Pedidos</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/dashboard/clientes')}
            >
              <Users className="h-6 w-6" />
              <span>Clientes</span>
            </Button>
            
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
