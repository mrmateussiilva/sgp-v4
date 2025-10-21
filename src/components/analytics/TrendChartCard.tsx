import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsTrendPoint } from '@/types';

interface TrendChartCardProps {
  title: string;
  data: AnalyticsTrendPoint[];
  loading?: boolean;
  emptyMessage?: string;
}

const chartFormatter = new Intl.NumberFormat('pt-BR');

export function TrendChartCard({ title, data, loading, emptyMessage }: TrendChartCardProps) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Carregando gráficos...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyMessage ?? 'Sem dados para plotar o gráfico neste período.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="period" stroke="#475569" tickLine={false} />
              <YAxis
                yAxisId="left"
                stroke="#475569"
                tickFormatter={(value: number) => chartFormatter.format(value)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#475569"
                tickFormatter={(value: number) => `R$ ${chartFormatter.format(value)}`}
              />
              <Tooltip
                formatter={(value: number | string, name: string) => {
                  const numericValue = typeof value === 'number' ? value : Number(value);
                  if (name.toLowerCase().includes('produção')) {
                    return [chartFormatter.format(numericValue), 'Volume de produção'];
                  }
                  return [`R$ ${chartFormatter.format(numericValue)}`, 'Receita'];
                }}
              />
              <Legend />
              <Bar
                dataKey="production_volume"
                name="volume de produção"
                yAxisId="left"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="receita"
                stroke="#9333ea"
                strokeWidth={2}
                dot={{ r: 3 }}
                yAxisId="right"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
