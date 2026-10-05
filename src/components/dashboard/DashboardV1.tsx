import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Plus,
  Eye,
  Truck,
  Edit,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrderWithItems } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/utils/date';
import { cn } from '@/lib/utils';
import {
  DashboardStats,
  ProcessedOrder,
} from '@/utils/dashboardStats';

export interface DashboardV1Props {
  stats: DashboardStats;
  urgentOrders: ProcessedOrder[];
  recentOrders: ProcessedOrder[];
  isPwa: boolean;
  getProductionStatusColor: (order: OrderWithItems) => string;
  getProductionStatus: (order: OrderWithItems) => string;
  formatDays?: (days: number) => string;
  handleViewOrder: (order: OrderWithItems) => void;
  handleEditOrder: (order: OrderWithItems) => void;
  handleCardClick: (filterType: 'all' | 'pending' | 'completed' | 'overdue' | 'urgent') => void;
}

export function DashboardV1({
  stats,
  urgentOrders,
  recentOrders,
  isPwa,
  getProductionStatusColor,
  getProductionStatus,
  handleViewOrder,
  handleEditOrder,
  handleCardClick,
}: DashboardV1Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* 1. Cards Principais: 4 KPIs */}
      <div className={cn("grid gap-3.5 sm:gap-4 grid-cols-2 lg:grid-cols-4", isPwa && "gap-3")}>
        {/* Total de Pedidos */}
        <Card
          className="border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer bg-white dark:bg-card"
          onClick={() => handleCardClick('all')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Total de Pedidos
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {stats.totalOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
              {stats.todayOrders} pedidos hoje
            </p>
          </CardContent>
        </Card>

        {/* Pendentes */}
        <Card
          className="border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer bg-white dark:bg-card"
          onClick={() => handleCardClick('pending')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-500">
              {stats.pendingOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
              Em produção
            </p>
          </CardContent>
        </Card>

        {/* Concluidos */}
        <Card
          className="border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer bg-white dark:bg-card"
          onClick={() => handleCardClick('completed')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Concluidos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-500">
              {stats.completedOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
              Prontos para entrega
            </p>
          </CardContent>
        </Card>

        {/* Atrasados */}
        <Card
          className="border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer bg-white dark:bg-card"
          onClick={() => handleCardClick('overdue')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('overdue')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Atrasados
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-red-600 dark:text-red-500">
              {stats.overdueOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
              Fora do prazo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Formas de Envio - Gráfico de Distribuição Completo */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-card">
        <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-500 shrink-0" />
            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
              Formas de Envio
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Distribuição de pedidos por forma de envio
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 sm:px-6 pb-6 pt-1">
          {stats.shippingMethods.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Nenhuma forma de envio registrada
            </div>
          ) : (
            <div className="space-y-4">
              {stats.shippingMethods.map((method) => (
                <div key={method.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                      {method.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {method.count} pedidos ({method.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.max(method.percentage, 1)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Operação em Foco: Pedidos Urgentes & Pedidos Recentes */}
      <div className={cn("grid gap-4 lg:grid-cols-2", isPwa && "gap-4")}>
        {/* Pedidos Urgentes */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Pedidos Urgentes</CardTitle>
                  <CardDescription className="text-xs">
                    Pedidos com prioridade alta na fila
                  </CardDescription>
                </div>
                {urgentOrders.length > 0 && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2 py-0.5">
                    {urgentOrders.length} {urgentOrders.length === 1 ? 'urgente' : 'urgentes'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {urgentOrders.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-xs text-muted-foreground">Nenhum pedido com prioridade alta na fila.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {urgentOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => handleViewOrder(order)}
                      className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/40 transition-colors cursor-pointer rounded-sm"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            #{order.numero || order.id}
                          </span>
                          {/* Destaque de Prioridade ALTA em Âmbar */}
                          <Badge className="bg-amber-500 text-white font-extrabold text-[10px] px-1.5 py-0 h-4 border-transparent shadow-2xs">
                            ALTA
                          </Badge>
                          {order.forma_envio && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              • {order.forma_envio}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate mt-0.5">
                          {order.cliente || order.customer_name || 'Cliente não identificado'}
                        </p>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Entrega: {formatDateForDisplay(order.data_entrega, '-')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Semântico Colorido com Leveza */}
                        <Badge variant="outline" className={cn("text-[11px] font-semibold border", getProductionStatusColor(order))}>
                          {getProductionStatus(order)}
                        </Badge>

                        {!isPwa && (
                          <div className="flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewOrder(order);
                              }}
                              aria-label="Visualizar pedido"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditOrder(order);
                              }}
                              aria-label="Editar pedido"
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-3 pt-0">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-medium justify-between text-muted-foreground hover:text-foreground"
              onClick={() => handleCardClick('urgent')}
            >
              <span>Ver todos os urgentes</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>

        {/* Pedidos Recentes */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Pedidos Recentes</CardTitle>
                  <CardDescription className="text-xs">
                    Últimas entradas registradas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-xs text-muted-foreground">Nenhum pedido recente registrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => handleViewOrder(order)}
                      className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/40 transition-colors cursor-pointer rounded-sm"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            #{order.numero || order.id}
                          </span>
                          {/* Destaque se for ALTA */}
                          {order.prioridade === 'ALTA' && (
                            <Badge className="bg-amber-500 text-white font-extrabold text-[10px] px-1.5 py-0 h-4 border-transparent shadow-2xs">
                              ALTA
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate mt-0.5">
                          {order.cliente || order.customer_name || 'Cliente não identificado'}
                        </p>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Entrada: {formatDateForDisplay(order.data_entrada || order.created_at, '-')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Semântico Colorido com Leveza */}
                        <Badge variant="outline" className={cn("text-[11px] font-semibold border", getProductionStatusColor(order))}>
                          {getProductionStatus(order)}
                        </Badge>

                        {!isPwa && (
                          <div className="flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewOrder(order);
                              }}
                              aria-label="Visualizar pedido"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditOrder(order);
                              }}
                              aria-label="Editar pedido"
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-3 pt-0">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-medium justify-between text-muted-foreground hover:text-foreground"
              onClick={() => handleCardClick('all')}
            >
              <span>Ver todos os pedidos</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>


      </div>

      {/* 5. Ações Rápidas */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs">
        <CardHeader className="pb-3 border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold">
            Acessos Rápidos
          </CardTitle>
          <CardDescription className="text-xs">
            Atalhos para as rotinas operacionais
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className={cn("grid gap-3", isPwa ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4")}>
            {!isPwa && (
              <Button
                variant="outline"
                className="h-14 flex items-center justify-start gap-3 px-4 hover:bg-muted/50 border-slate-200 dark:border-slate-800"
                onClick={() => navigate('/dashboard/pedido/novo')}
              >
                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-xs text-foreground">Novo Pedido</div>
                  <div className="text-[10px] text-muted-foreground">Cadastrar ficha</div>
                </div>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-14 flex items-center justify-start gap-3 px-4 hover:bg-muted/50 border-slate-200 dark:border-slate-800"
              onClick={() => navigate('/dashboard/orders')}
            >
              <ShoppingCart className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs text-foreground">Pedidos</div>
                <div className="text-[10px] text-muted-foreground">Gerenciar fila</div>
              </div>
            </Button>

            {!isPwa && (
              <Button
                variant="outline"
                className="h-14 flex items-center justify-start gap-3 px-4 hover:bg-muted/50 border-slate-200 dark:border-slate-800"
                onClick={() => navigate('/dashboard/clientes')}
              >
                <Users className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-xs text-foreground">Clientes</div>
                  <div className="text-[10px] text-muted-foreground">Base cadastral</div>
                </div>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-14 flex items-center justify-start gap-3 px-4 hover:bg-muted/50 border-slate-200 dark:border-slate-800"
              onClick={() => navigate('/dashboard/relatorios-envios')}
            >
              <Truck className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-xs text-foreground">Envios</div>
                <div className="text-[10px] text-muted-foreground">Relatórios logísticos</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
