import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
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
import { OrderWithItems } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface DailyRevenueChartProps {
  orders: OrderWithItems[];
  loading: boolean;
  days?: number; // Quantos dias mostrar (padrão: 30)
}

export function DailyRevenueChart({
  orders,
  loading,
  days = 30,
}: DailyRevenueChartProps) {
  const chartData = useMemo(() => {
    // Filtrar pedidos dos últimos N dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    const filteredOrders = orders.filter((order) => {
      const orderDate = order.data_entrada
        ? new Date(order.data_entrada)
        : order.created_at
        ? new Date(order.created_at)
        : null;
      if (!orderDate) return false;
      orderDate.setHours(0, 0, 0, 0);
      return orderDate >= startDate && orderDate <= today;
    });

    // Agrupar por dia
    const dailyMap = new Map<string, number>();

    filteredOrders.forEach((order) => {
      const orderDate = order.data_entrada
        ? new Date(order.data_entrada)
        : order.created_at
        ? new Date(order.created_at)
        : null;
      if (!orderDate) return;

      const dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
      const currentValue = dailyMap.get(dateKey) || 0;
      const orderValue = typeof order.total_value === 'string' 
        ? parseFloat(order.total_value) || 0 
        : order.total_value || 0;
      dailyMap.set(dateKey, currentValue + orderValue);
    });

    // Criar array de dados para o gráfico
    const data: Array<{
      date: string;
      dateLabel: string;
      receita: number;
      media: number;
    }> = [];

    // Calcular média móvel de 7 dias
    const revenueArray: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const revenue = dailyMap.get(dateKey) || 0;
      revenueArray.push(revenue);

      // Calcular média móvel (últimos 7 dias)
      let sum7Days = 0;
      let count = 0;
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        sum7Days += revenueArray[j];
        count++;
      }
      const media = count > 0 ? sum7Days / count : 0;

      data.push({
        date: dateKey,
        dateLabel: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
        receita: revenue,
        media: media > 0 ? media : undefined as any,
      });
    }

    // Calcular média geral para comparação
    const totalRevenue = data.reduce((sum, item) => sum + item.receita, 0);
    const averageRevenue = totalRevenue / data.length;

    return { data, averageRevenue };
  }, [orders, days]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receita Diária - Últimos {days} dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receita Diária - Últimos {days} dias</CardTitle>
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
      const receita = payload.find((p: any) => p.dataKey === 'receita');
      const media = payload.find((p: any) => p.dataKey === 'media');
      const receitaValue = receita?.value || 0;
      const mediaValue = media?.value || 0;
      const diff = receitaValue - mediaValue;
      const diffPercent = mediaValue > 0 ? (diff / mediaValue) * 100 : 0;

      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm" style={{ color: receita?.color }}>
              <strong>Receita:</strong> {currencyFormatter.format(receitaValue)}
            </p>
            {mediaValue > 0 && (
              <>
                <p className="text-sm" style={{ color: media?.color }}>
                  <strong>Média 7 dias:</strong> {currencyFormatter.format(mediaValue)}
                </p>
                <p className={`text-sm font-semibold ${
                  diff >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {diff >= 0 ? '+' : ''}
                  {currencyFormatter.format(diff)} ({diffPercent >= 0 ? '+' : ''}
                  {diffPercent.toFixed(1)}%)
                </p>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcular cores das barras baseado na média
  const dataWithColors = chartData.data.map((item) => ({
    ...item,
    color: item.receita >= chartData.averageRevenue ? '#10b981' : '#ef4444',
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Receita Diária - Últimos {days} dias</CardTitle>
          <div className="text-sm text-slate-600">
            Média: {currencyFormatter.format(chartData.averageRevenue)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={dataWithColors}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="dateLabel" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tickFormatter={(value) => currencyFormatter.format(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="receita" name="Receita Diária">
              {dataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="media"
              name="Média Móvel (7 dias)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Acima da média</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Abaixo da média</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-orange-500"></div>
            <span>Média móvel (7 dias)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
