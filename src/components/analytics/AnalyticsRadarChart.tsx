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
  topSellers,
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

  // Normalizar valores para escala de 0-100
  // Encontrar valores máximos para normalização
  const maxOrders = summary.total_orders;
  const maxItems = summary.total_items_produced;
  const maxRevenue = summary.total_revenue;
  const maxTicket = summary.average_ticket;
  const maxSellerValue = topSellers && topSellers.length > 0 
    ? Math.max(...topSellers.map(s => s.value))
    : summary.total_revenue;

  const data = [
    {
      metric: 'Pedidos',
      valor: Math.min((summary.total_orders / Math.max(maxOrders, 1)) * 100, 100),
      original: summary.total_orders,
    },
    {
      metric: 'Itens',
      valor: Math.min((summary.total_items_produced / Math.max(maxItems, 1)) * 100, 100),
      original: summary.total_items_produced,
    },
    {
      metric: 'Receita',
      valor: Math.min((summary.total_revenue / Math.max(maxRevenue, 1)) * 100, 100),
      original: summary.total_revenue,
    },
    {
      metric: 'Ticket Médio',
      valor: Math.min((summary.average_ticket / Math.max(maxTicket, 1)) * 100, 100),
      original: summary.average_ticket,
    },
    {
      metric: 'Itens/Pedido',
      valor: Math.min(((summary.total_items_produced / summary.total_orders) / Math.max(maxItems / maxOrders, 1)) * 100, 100),
      original: summary.total_items_produced / summary.total_orders,
    },
  ];

  // Adicionar dados do top vendedor se disponível
  let topSellerData: any[] | null = null;
  if (topSellers && topSellers.length > 0) {
    const topSeller = topSellers[0];
    topSellerData = [
      {
        metric: 'Pedidos',
        valor: Math.min((summary.total_orders / Math.max(maxOrders, 1)) * 100, 100),
      },
      {
        metric: 'Itens',
        valor: Math.min((summary.total_items_produced / Math.max(maxItems, 1)) * 100, 100),
      },
      {
        metric: 'Receita',
        valor: Math.min((topSeller.value / Math.max(maxSellerValue, 1)) * 100, 100),
      },
      {
        metric: 'Ticket Médio',
        valor: Math.min((summary.average_ticket / Math.max(maxTicket, 1)) * 100, 100),
      },
      {
        metric: 'Itens/Pedido',
        valor: Math.min(((summary.total_items_produced / summary.total_orders) / Math.max(maxItems / maxOrders, 1)) * 100, 100),
      },
    ];
  }

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
                    Valor: {typeof dataPoint.original === 'number' 
                      ? (dataPoint.metric.includes('Receita') || dataPoint.metric.includes('Ticket')
                        ? currencyFormatter.format(dataPoint.original)
                        : dataPoint.original.toLocaleString('pt-BR'))
                      : dataPoint.original.toFixed(2)}
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
              name="Geral"
              dataKey="valor"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            {topSellerData && (
              <Radar
                name={`Top Vendedor (${topSellers?.[0]?.name || ''})`}
                dataKey="valor"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
              />
            )}
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
