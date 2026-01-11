import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AnalyticsSummary, AnalyticsTopProduct } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

interface AnalyticsPieChartProps {
  summary: AnalyticsSummary | null;
  topProducts: AnalyticsTopProduct[] | null;
  loading: boolean;
}

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold mb-2">{data.name}</p>
        <p className="text-sm text-green-600">
          {data.payload.format === 'currency'
            ? currencyFormatter.format(data.value)
            : data.value.toLocaleString('pt-BR')}
        </p>
        <p className="text-sm text-slate-500">
          {((data.payload.percent || 0) * 100).toFixed(1)}% do total
        </p>
      </div>
    );
  }
  return null;
};

export function AnalyticsPieChart({ summary, topProducts, loading }: AnalyticsPieChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || !topProducts || topProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular total de itens para distribuição
  const data = topProducts.slice(0, 5).map((product) => ({
    name: product.product_name.length > 20 
      ? product.product_name.substring(0, 20) + '...' 
      : product.product_name,
    fullName: product.product_name,
    value: product.quantity,
    format: 'number' as const,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Produtos (Top 5)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(_value, entry: any) => (
                <span style={{ color: entry.color }}>
                  {entry.payload.fullName}: {entry.payload.value.toLocaleString('pt-BR')} itens
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {item.value.toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
