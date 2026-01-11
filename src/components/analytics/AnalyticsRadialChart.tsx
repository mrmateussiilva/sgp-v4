import { RadialBarChart, RadialBar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AnalyticsSummary, AnalyticsLeaderboardEntry } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface AnalyticsRadialChartProps {
  summary: AnalyticsSummary | null;
  topSellers: AnalyticsLeaderboardEntry[] | null;
  loading: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold mb-2">{data.name}</p>
        <p className="text-sm text-green-600">
          {currencyFormatter.format(data.value)}
        </p>
        <p className="text-sm text-slate-500">{data.percentage.toFixed(1)}% do total</p>
      </div>
    );
  }
  return null;
};

export function AnalyticsRadialChart({ summary, topSellers, loading }: AnalyticsRadialChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição Percentual (Top Vendedores)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || !topSellers || topSellers.length === 0 || summary.total_revenue === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição Percentual (Top Vendedores)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  const top5 = topSellers.slice(0, 5);
  const data = top5.map((seller, index) => {
    const percentage = (seller.value / summary.total_revenue) * 100;
    return {
      name: seller.name.length > 15 ? seller.name.substring(0, 15) + '...' : seller.name,
      fullName: seller.name,
      value: percentage,
      amount: seller.value,
      percentage,
      fill: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'][index % 5],
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição Percentual (Top 5 Vendedores)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="90%"
            barSize={20}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar
              background
              dataKey="value"
              cornerRadius={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={12}
              formatter={(_value, entry: any) => (
                <span style={{ color: entry.color }}>
                  {entry.payload.fullName}: {entry.payload.percentage.toFixed(1)}%
                </span>
              )}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 bg-slate-50"
            >
              <div
                className="w-4 h-4 rounded mb-2"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm font-medium text-slate-600 text-center">{item.fullName}</span>
              <span className="text-lg font-bold text-slate-900">
                {item.percentage.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">
                {currencyFormatter.format(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
