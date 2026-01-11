import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AnalyticsSummary } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface AnalyticsFunnelProps {
  summary: AnalyticsSummary | null;
  loading: boolean;
}

interface FunnelStage {
  name: string;
  value: number;
  percentage: number;
  format?: (value: number) => string;
}

export function AnalyticsFunnel({ summary, loading }: AnalyticsFunnelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.total_orders === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = summary.total_revenue;
  
  const stages: FunnelStage[] = [
    {
      name: 'Receita Total',
      value: summary.total_revenue,
      percentage: 100,
      format: (v) => currencyFormatter.format(v),
    },
    {
      name: 'Ticket Médio',
      value: summary.average_ticket,
      percentage: (summary.average_ticket / maxValue) * 100,
      format: (v) => currencyFormatter.format(v),
    },
    {
      name: 'Total de Itens',
      value: summary.total_items_produced,
      percentage: (summary.total_items_produced / summary.total_orders) * 100,
      format: (v) => v.toLocaleString('pt-BR'),
    },
    {
      name: 'Total de Pedidos',
      value: summary.total_orders,
      percentage: 100,
      format: (v) => v.toLocaleString('pt-BR'),
    },
  ].filter((stage) => stage.value > 0);

  const colors = [
    'from-blue-600 to-blue-500',
    'from-green-600 to-green-500',
    'from-purple-600 to-purple-500',
    'from-indigo-600 to-indigo-500',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const width = Math.min(stage.percentage, 100);
            const colorClass = colors[index % colors.length];

            return (
              <div key={index} className="relative">
                <div
                  className={`h-14 bg-gradient-to-r ${colorClass} rounded-lg text-white flex items-center justify-between px-4 shadow-md transition-all hover:shadow-lg`}
                  style={{ width: `${width}%` }}
                >
                  <span className="font-semibold">{stage.name}</span>
                  <span className="font-bold">
                    {stage.format ? stage.format(stage.value) : stage.value}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  <span>{stage.percentage.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">
            <strong>Ticket médio:</strong> {currencyFormatter.format(summary.average_ticket)}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            <strong>Itens por pedido:</strong>{' '}
            {(summary.total_items_produced / summary.total_orders).toFixed(1)}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            <strong>Receita por item:</strong>{' '}
            {currencyFormatter.format(summary.total_revenue / summary.total_items_produced)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
