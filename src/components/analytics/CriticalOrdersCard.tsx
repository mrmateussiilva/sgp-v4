import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { OrderWithItems } from '@/types';

interface CriticalOrdersCardProps {
  orders: OrderWithItems[];
  loading: boolean;
}

interface CriticalOrder {
  id: number;
  numero?: string;
  customer_name: string;
  data_entrega?: string;
  daysUntilDelivery: number;
  status: 'atrasado' | 'critico' | 'atencao';
  statusLabel: string;
}

export function CriticalOrdersCard({
  orders,
  loading,
}: CriticalOrdersCardProps) {
  const criticalOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const critical: CriticalOrder[] = [];

    orders.forEach((order) => {
      if (!order.data_entrega) return;
      if (order.pronto) return; // Ignorar pedidos já prontos

      const deliveryDate = new Date(order.data_entrega);
      deliveryDate.setHours(0, 0, 0, 0);
      const daysUntilDelivery = Math.ceil(
        (deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let status: 'atrasado' | 'critico' | 'atencao' = 'atencao';
      let statusLabel = '';

      if (daysUntilDelivery < 0) {
        status = 'atrasado';
        statusLabel = `Atrasado ${Math.abs(daysUntilDelivery)} dia(s)`;
      } else if (daysUntilDelivery <= 2) {
        status = 'critico';
        statusLabel = `${daysUntilDelivery} dia(s) restante(s)`;
      } else if (daysUntilDelivery <= 5) {
        status = 'atencao';
        statusLabel = `${daysUntilDelivery} dia(s) restante(s)`;
      } else {
        return; // Não é crítico
      }

      critical.push({
        id: order.id,
        numero: order.numero,
        customer_name: order.customer_name,
        data_entrega: order.data_entrega,
        daysUntilDelivery,
        status,
        statusLabel,
      });
    });

    // Ordenar: atrasados primeiro, depois por dias restantes
    return critical.sort((a, b) => {
      if (a.status === 'atrasado' && b.status !== 'atrasado') return -1;
      if (a.status !== 'atrasado' && b.status === 'atrasado') return 1;
      return a.daysUntilDelivery - b.daysUntilDelivery;
    });
  }, [orders]);

  const stats = useMemo(() => {
    return {
      atrasados: criticalOrders.filter((o) => o.status === 'atrasado').length,
      criticos: criticalOrders.filter((o) => o.status === 'critico').length,
      atencao: criticalOrders.filter((o) => o.status === 'atencao').length,
      total: criticalOrders.length,
    };
  }, [criticalOrders]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos que Precisam Atenção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'atrasado':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'critico':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'atencao':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'atrasado':
        return <AlertCircle className="h-4 w-4" />;
      case 'critico':
        return <Clock className="h-4 w-4" />;
      case 'atencao':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos que Precisam Atenção</CardTitle>
        {stats.total > 0 && (
          <div className="mt-2 flex items-center gap-4 text-sm">
            {stats.atrasados > 0 && (
              <span className="text-red-600 font-semibold">
                🔴 {stats.atrasados} atrasado(s)
              </span>
            )}
            {stats.criticos > 0 && (
              <span className="text-orange-600 font-semibold">
                🟡 {stats.criticos} crítico(s)
              </span>
            )}
            {stats.atencao > 0 && (
              <span className="text-yellow-600 font-semibold">
                ⚠️ {stats.atencao} atenção
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {criticalOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-sm font-medium text-slate-700">
              Nenhum pedido crítico no momento
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Todos os pedidos estão dentro do prazo
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {criticalOrders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(order.status)}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(order.status)}
                    <span className="text-sm font-semibold">
                      {order.numero || `#${order.id}`}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{order.customer_name}</p>
                  {order.data_entrega && (
                    <p className="text-xs text-slate-500 mt-1">
                      Entrega: {new Date(order.data_entrega).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${getStatusColor(order.status).split(' ')[0]}`}>
                    {order.statusLabel}
                  </p>
                </div>
              </div>
            ))}
            {criticalOrders.length > 10 && (
              <p className="text-xs text-center text-slate-500 pt-2">
                + {criticalOrders.length - 10} pedido(s) adicional(is)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
