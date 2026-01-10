import { DollarSign, ShoppingBag, Package, TrendingUp, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GrowthIndicator } from './GrowthIndicator';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface FechamentoStats {
  total_pedidos: number;
  total_items: number;
  total_revenue: number;
  total_frete: number;
  total_servico: number;
  average_ticket: number;
}

interface FechamentoStatsCardsProps {
  stats: FechamentoStats | null;
  previousStats: FechamentoStats | null;
  loading: boolean;
}

export function FechamentoStatsCards({
  stats,
  previousStats,
  loading,
}: FechamentoStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-slate-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    {
      title: 'Total de Pedidos',
      value: stats.total_pedidos.toLocaleString('pt-BR'),
      icon: <ShoppingBag className="h-5 w-5 text-blue-600" />,
      className: 'border-blue-200 bg-blue-50/30',
      current: stats.total_pedidos,
      previous: previousStats?.total_pedidos ?? null,
    },
    {
      title: 'Total de Itens',
      value: stats.total_items.toLocaleString('pt-BR'),
      icon: <Package className="h-5 w-5 text-purple-600" />,
      className: 'border-purple-200 bg-purple-50/30',
      current: stats.total_items,
      previous: previousStats?.total_items ?? null,
    },
    {
      title: 'Receita Total',
      value: currencyFormatter.format(stats.total_revenue),
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      className: 'border-green-200 bg-green-50/30',
      current: stats.total_revenue,
      previous: previousStats?.total_revenue ?? null,
    },
    {
      title: 'Total Frete',
      value: currencyFormatter.format(stats.total_frete),
      icon: <Truck className="h-5 w-5 text-orange-600" />,
      className: 'border-orange-200 bg-orange-50/30',
      current: stats.total_frete,
      previous: previousStats?.total_frete ?? null,
    },
    {
      title: 'Total Serviços',
      value: currencyFormatter.format(stats.total_servico),
      icon: <Package className="h-5 w-5 text-indigo-600" />,
      className: 'border-indigo-200 bg-indigo-50/30',
      current: stats.total_servico,
      previous: previousStats?.total_servico ?? null,
    },
    {
      title: 'Ticket Médio',
      value: currencyFormatter.format(stats.average_ticket),
      icon: <TrendingUp className="h-5 w-5 text-teal-600" />,
      className: 'border-teal-200 bg-teal-50/30',
      current: stats.average_ticket,
      previous: previousStats?.average_ticket ?? null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => (
        <Card key={index} className={card.className}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{card.value}</div>
              {card.previous !== null && (
                <GrowthIndicator
                  current={card.current}
                  previous={card.previous}
                  label="período anterior"
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
