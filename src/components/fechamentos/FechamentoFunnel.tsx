import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface FechamentoFunnelProps {
  stats: {
    total_pedidos: number;
    total_items: number;
    total_revenue: number;
    total_frete: number;
    total_servico: number;
  } | null;
  loading: boolean;
}

interface FunnelStage {
  name: string;
  value: number;
  percentage: number;
  format?: (value: number) => string;
}

export function FechamentoFunnel({ stats, loading }: FechamentoFunnelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_revenue === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  const stages: FunnelStage[] = [
    {
      name: 'Receita Total',
      value: stats.total_revenue,
      percentage: 100,
      format: (v) => currencyFormatter.format(v),
    },
    {
      name: 'Serviços',
      value: stats.total_servico,
      percentage: (stats.total_servico / stats.total_revenue) * 100,
      format: (v) => currencyFormatter.format(v),
    },
    {
      name: 'Frete',
      value: stats.total_frete,
      percentage: (stats.total_frete / stats.total_revenue) * 100,
      format: (v) => currencyFormatter.format(v),
    },
    {
      name: 'Total de Itens',
      value: stats.total_items,
      percentage: (stats.total_items / stats.total_pedidos) * 100,
      format: (v) => v.toLocaleString('pt-BR'),
    },
    {
      name: 'Total de Pedidos',
      value: stats.total_pedidos,
      percentage: 100,
      format: (v) => v.toLocaleString('pt-BR'),
    },
  ].filter((stage) => stage.value > 0);

  const maxWidth = 100;
  const colors = [
    'from-blue-600 to-blue-500',
    'from-green-600 to-green-500',
    'from-orange-600 to-orange-500',
    'from-purple-600 to-purple-500',
    'from-indigo-600 to-indigo-500',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Receita</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const width = (stage.percentage / 100) * maxWidth;
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
                <div className="mt-1 text-sm text-slate-600 flex items-center justify-between">
                  <span>{stage.percentage.toFixed(1)}%</span>
                  {index < stages.length - 1 && (
                    <span className="text-xs text-slate-400">
                      ↓ {((stage.percentage / stages[index + 1].percentage) * 100).toFixed(0)}% do estágio anterior
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">
            <strong>Ticket médio:</strong>{' '}
            {currencyFormatter.format(stats.total_revenue / stats.total_pedidos)}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            <strong>Itens por pedido:</strong>{' '}
            {(stats.total_items / stats.total_pedidos).toFixed(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
