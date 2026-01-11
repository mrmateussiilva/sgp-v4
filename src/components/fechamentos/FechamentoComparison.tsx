import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface ComparisonData {
  current: {
    total_pedidos: number;
    total_revenue: number;
    total_frete: number;
    total_servico: number;
  };
  previous: {
    total_pedidos: number;
    total_revenue: number;
    total_frete: number;
    total_servico: number;
  } | null;
}

interface FechamentoComparisonProps {
  data: ComparisonData | null;
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}:{' '}
            {entry.dataKey.includes('revenue') || entry.dataKey.includes('frete') || entry.dataKey.includes('servico')
              ? currencyFormatter.format(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function FechamentoComparison({ data, loading }: FechamentoComparisonProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Períodos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.previous) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Períodos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Dados do período anterior não disponíveis para comparação.
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    {
      name: 'Pedidos',
      Período_Atual: data.current.total_pedidos,
      Período_Anterior: data.previous.total_pedidos,
    },
    {
      name: 'Receita',
      Período_Atual: data.current.total_revenue,
      Período_Anterior: data.previous.total_revenue,
    },
    {
      name: 'Frete',
      Período_Atual: data.current.total_frete,
      Período_Anterior: data.previous.total_frete,
    },
    {
      name: 'Serviços',
      Período_Atual: data.current.total_servico,
      Período_Anterior: data.previous.total_servico,
    },
  ];

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const growths = {
    pedidos: calculateGrowth(data.current.total_pedidos, data.previous.total_pedidos),
    receita: calculateGrowth(data.current.total_revenue, data.previous.total_revenue),
    frete: calculateGrowth(data.current.total_frete, data.previous.total_frete),
    servico: calculateGrowth(data.current.total_servico, data.previous.total_servico),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação de Períodos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar yAxisId="right" dataKey="Período_Atual" fill="#10b981" name="Período Atual" />
            <Bar yAxisId="right" dataKey="Período_Anterior" fill="#94a3b8" name="Período Anterior" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(growths).map(([key, growth]) => {
            const isPositive = growth > 0;
            const Icon = isPositive ? TrendingUp : TrendingDown;
            const color = isPositive ? 'text-green-600' : 'text-red-600';
            const bgColor = isPositive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

            return (
              <div
                key={key}
                className={`flex flex-col items-center p-3 rounded-lg border ${bgColor}`}
              >
                <span className="text-sm font-medium text-slate-600 capitalize mb-1">
                  {key === 'pedidos' ? 'Pedidos' : key === 'receita' ? 'Receita' : key === 'frete' ? 'Frete' : 'Serviços'}
                </span>
                <div className="flex items-center gap-1">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className={`text-lg font-bold ${color}`}>
                    {isPositive ? '+' : ''}
                    {growth.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
