import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface TrendPoint {
  period: string;
  pedidos: number;
  revenue: number;
  frete: number;
  servico: number;
}

interface FechamentoComposedChartProps {
  trends: TrendPoint[] | null;
  loading: boolean;
}

export function FechamentoComposedChart({
  trends,
  loading,
}: FechamentoComposedChartProps) {
  const chartData = useMemo(() => {
    if (!trends) return [];
    return trends.map((trend) => ({
      ...trend,
      period: trend.period,
      receita: trend.revenue,
    }));
  }, [trends]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos vs Receita (Combinado)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos vs Receita (Combinado)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível para o período selecionado.
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}:{' '}
              {entry.dataKey === 'pedidos'
                ? entry.value
                : currencyFormatter.format(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos vs Receita (Combinado)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis yAxisId="left" label={{ value: 'Pedidos', angle: -90, position: 'insideLeft' }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Receita (R$)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="pedidos"
              fill="#3b82f6"
              name="Pedidos"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="receita"
              stroke="#10b981"
              strokeWidth={3}
              name="Receita"
              dot={{ fill: '#10b981', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
