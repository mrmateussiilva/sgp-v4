import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AnalyticsSummary, AnalyticsLeaderboardEntry } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface AnalyticsRadarChartProps {
  summary: AnalyticsSummary | null;
  topSellers: AnalyticsLeaderboardEntry[] | null;
  loading: boolean;
}

export function AnalyticsRadarChart({
  summary,
  topSellers: _topSellers,
  loading,
}: AnalyticsRadarChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Métricas (Radar)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.total_orders === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Métricas (Radar)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normalizar valores para escala de 0-100 usando o maior valor como referência
  const metrics = {
    pedidos: summary.total_orders,
    itens: summary.total_items_produced,
    receita: summary.total_revenue,
    ticketMedio: summary.average_ticket,
    itensPorPedido: summary.total_items_produced / summary.total_orders,
  };

  // Encontrar o valor máximo para normalização (usar receita como base, já que é geralmente o maior)
  const maxValue = Math.max(
    metrics.receita,
    metrics.pedidos * metrics.ticketMedio,
    metrics.itens,
    metrics.ticketMedio * 100,
    metrics.itensPorPedido * metrics.pedidos
  );

  const data = [
    {
      metric: 'Pedidos',
      valor: Math.min((metrics.pedidos / Math.max(maxValue / (metrics.ticketMedio || 1), 1)) * 100, 100),
      original: metrics.pedidos,
    },
    {
      metric: 'Itens',
      valor: Math.min((metrics.itens / Math.max(maxValue, 1)) * 100, 100),
      original: metrics.itens,
    },
    {
      metric: 'Receita',
      valor: 100, // Sempre 100% como referência
      original: metrics.receita,
    },
    {
      metric: 'Ticket Médio',
      valor: Math.min((metrics.ticketMedio / Math.max(maxValue / metrics.pedidos, 1)) * 100, 100),
      original: metrics.ticketMedio,
    },
    {
      metric: 'Itens/Pedido',
      valor: Math.min((metrics.itensPorPedido / Math.max(metrics.itensPorPedido * 2, 1)) * 100, 100),
      original: metrics.itensPorPedido,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          {payload.map((entry: any, index: number) => {
            const dataPoint = data[index];
            return (
              <div key={index} className="mb-2">
                <p className="font-semibold" style={{ color: entry.color }}>
                  {entry.name}
                </p>
                <p className="text-sm text-slate-600">
                  {dataPoint.metric}: {entry.value.toFixed(1)}%
                </p>
                {dataPoint.original !== undefined && (
                  <p className="text-xs text-slate-500">
                    Valor: {dataPoint.metric.includes('Receita') || dataPoint.metric.includes('Ticket')
                      ? currencyFormatter.format(dataPoint.original)
                      : dataPoint.original.toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação de Métricas (Radar)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Radar
              name="Métricas Gerais"
              dataKey="valor"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {data.map((item, index) => (
            <div key={index} className="p-2 bg-slate-50 rounded border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">{item.metric}</p>
              <p className="text-sm font-bold text-slate-900">
                {typeof item.original === 'number'
                  ? item.metric.includes('Receita') || item.metric.includes('Ticket')
                    ? currencyFormatter.format(item.original)
                    : item.original.toFixed(item.metric.includes('/') ? 1 : 0)
                  : item.original}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
