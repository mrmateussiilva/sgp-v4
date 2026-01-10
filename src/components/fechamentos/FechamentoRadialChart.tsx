import { RadialBarChart, RadialBar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface FechamentoRadialChartProps {
  stats: {
    total_frete: number;
    total_servico: number;
    total_revenue: number;
  } | null;
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

export function FechamentoRadialChart({ stats, loading }: FechamentoRadialChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição Percentual</CardTitle>
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
          <CardTitle>Distribuição Percentual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  const servicoPercentage = (stats.total_servico / stats.total_revenue) * 100;
  const fretePercentage = (stats.total_frete / stats.total_revenue) * 100;

  const data = [
    {
      name: 'Serviços',
      value: servicoPercentage,
      fill: '#10b981',
      amount: stats.total_servico,
      percentage: servicoPercentage,
    },
    {
      name: 'Frete',
      value: fretePercentage,
      fill: '#f59e0b',
      amount: stats.total_frete,
      percentage: fretePercentage,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição Percentual (Rosca)</CardTitle>
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
              minAngle={15}
              background
              clockWise
              dataKey="value"
              cornerRadius={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={12}
              formatter={(value, entry: any) => (
                <span style={{ color: entry.color }}>
                  {value}: {entry.payload.percentage.toFixed(1)}%
                </span>
              )}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 bg-slate-50"
            >
              <div
                className="w-4 h-4 rounded mb-2"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm font-medium text-slate-600">{item.name}</span>
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
