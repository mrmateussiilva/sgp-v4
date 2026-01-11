import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface TrendPoint {
  period: string;
  pedidos: number;
  revenue: number;
}

interface FechamentoHeatmapProps {
  trends: TrendPoint[] | null;
  loading: boolean;
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const getColorByIntensity = (value: number, maxValue: number) => {
  if (maxValue === 0) return '#f1f5f9';
  const intensity = value / maxValue;
  if (intensity === 0) return '#f1f5f9';
  if (intensity < 0.2) return '#cfe2ff';
  if (intensity < 0.4) return '#9ec5fe';
  if (intensity < 0.6) return '#6ea8fe';
  if (intensity < 0.8) return '#3b82f6';
  return '#2563eb';
};

export function FechamentoHeatmap({ trends, loading }: FechamentoHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (!trends || trends.length === 0) return null;

    // Organizar por dia da semana
    const weeklyData: Map<number, { total: number; count: number }> = new Map();

    trends.forEach((trend) => {
      try {
        const date = new Date(trend.period);
        const dayOfWeek = date.getDay();
        const current = weeklyData.get(dayOfWeek) || { total: 0, count: 0 };
        weeklyData.set(dayOfWeek, {
          total: current.total + trend.revenue,
          count: current.count + 1,
        });
      } catch (e) {
        // Ignorar datas inválidas
      }
    });

    const result = Array.from({ length: 7 }, (_, index) => {
      const data = weeklyData.get(index);
      const avgRevenue = data ? data.total / data.count : 0;
      return {
        day: DAYS_OF_WEEK[index],
        dayIndex: index,
        revenue: avgRevenue,
        count: data?.count || 0,
      };
    });

    const maxRevenue = Math.max(...result.map((r) => r.revenue));

    return result.map((item) => ({
      ...item,
      color: getColorByIntensity(item.revenue, maxRevenue),
    }));
  }, [trends]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade por Dia da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!heatmapData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade por Dia da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade por Dia da Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {heatmapData.map((item) => (
              <div
                key={item.dayIndex}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-full h-16 rounded-lg border-2 border-slate-200 transition-all hover:scale-105 cursor-pointer"
                  style={{ backgroundColor: item.color }}
                  title={`${item.day}: ${currencyFormatter.format(item.revenue)} (média)`}
                />
                <span className="text-xs font-medium text-slate-600">{item.day}</span>
                {item.count > 0 && (
                  <span className="text-xs text-slate-500">{item.count}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t">
            <span>Média de receita por dia da semana</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">Menor</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded bg-slate-200" />
                <div className="w-4 h-4 rounded bg-blue-200" />
                <div className="w-4 h-4 rounded bg-blue-400" />
                <div className="w-4 h-4 rounded bg-blue-600" />
                <div className="w-4 h-4 rounded bg-blue-800" />
              </div>
              <span className="text-xs">Maior</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
