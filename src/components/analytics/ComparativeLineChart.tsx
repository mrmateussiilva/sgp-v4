import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AnalyticsTrendPoint } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface ComparativeLineChartProps {
  currentWeekData: AnalyticsTrendPoint[];
  previousWeekData: AnalyticsTrendPoint[];
  loading: boolean;
  title?: string;
}

export function ComparativeLineChart({
  currentWeekData,
  previousWeekData,
  loading,
  title = 'Receita: Esta Semana vs Semana Anterior',
}: ComparativeLineChartProps) {
  const chartData = useMemo(() => {
    // Criar um mapa para facilitar a comparação
    const currentMap = new Map(
      currentWeekData.map((item) => [item.period, item.revenue])
    );
    const previousMap = new Map(
      previousWeekData.map((item) => [item.period, item.revenue])
    );

    // Pegar todos os períodos únicos
    const allPeriods = new Set([
      ...currentWeekData.map((item) => item.period),
      ...previousWeekData.map((item) => item.period),
    ]);

    return Array.from(allPeriods)
      .sort()
      .map((period) => ({
        period: formatPeriodLabel(period),
        semanaAtual: currentMap.get(period) || 0,
        semanaAnterior: previousMap.get(period) || 0,
      }));
  }, [currentWeekData, previousWeekData]);

  const calculateTotalVariation = useMemo(() => {
    const currentTotal = currentWeekData.reduce((sum, item) => sum + item.revenue, 0);
    const previousTotal = previousWeekData.reduce((sum, item) => sum + item.revenue, 0);
    
    if (previousTotal === 0) return 0;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [currentWeekData, previousWeekData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível para comparação.
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const current = payload.find((p: any) => p.dataKey === 'semanaAtual');
      const previous = payload.find((p: any) => p.dataKey === 'semanaAnterior');
      
      const currentValue = current?.value || 0;
      const previousValue = previous?.value || 0;
      const variation = previousValue > 0 
        ? ((currentValue - previousValue) / previousValue) * 100 
        : 0;

      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm" style={{ color: current?.color }}>
              <strong>Semana Atual:</strong> {currencyFormatter.format(currentValue)}
            </p>
            <p className="text-sm" style={{ color: previous?.color }}>
              <strong>Semana Anterior:</strong> {currencyFormatter.format(previousValue)}
            </p>
            {previousValue > 0 && (
              <p className={`text-sm font-semibold ${
                variation >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                Variação: {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {calculateTotalVariation !== 0 && (
            <div className={`text-sm font-semibold ${
              calculateTotalVariation >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Total: {calculateTotalVariation >= 0 ? '+' : ''}
              {calculateTotalVariation.toFixed(1)}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={(value) => currencyFormatter.format(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="semanaAtual"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Semana Atual"
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 7 }}
            />
            <Line
              type="monotone"
              dataKey="semanaAnterior"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Semana Anterior"
              dot={{ fill: '#94a3b8', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function formatPeriodLabel(period: string): string {
  // Se for formato YYYY-MM-DD, converter para DD/MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [year, month, day] = period.split('-');
    return `${day}/${month}`;
  }
  // Se for formato YYYY-MM, converter para MMM/YYYY
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  }
  return period;
}
