import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { OrderWithItems } from '@/types';

interface StatusDistributionChartProps {
  orders: OrderWithItems[];
  loading: boolean;
}

interface StatusCount {
  name: string;
  quantidade: number;
  porcentagem: number;
  color: string;
}

export function StatusDistributionChart({
  orders,
  loading,
}: StatusDistributionChartProps) {
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {
      'Financeiro': 0,
      'Conferência': 0,
      'Sublimação': 0,
      'Costura': 0,
      'Expedição': 0,
      'Pronto': 0,
    };

    orders.forEach((order) => {
      if (order.financeiro) statusCounts['Financeiro']++;
      if (order.conferencia) statusCounts['Conferência']++;
      if (order.sublimacao) statusCounts['Sublimação']++;
      if (order.costura) statusCounts['Costura']++;
      if (order.expedicao) statusCounts['Expedição']++;
      if (order.pronto) statusCounts['Pronto']++;
    });

    const total = orders.length;
    const colors: Record<string, string> = {
      'Financeiro': '#ef4444', // Vermelho - início
      'Conferência': '#f59e0b', // Laranja
      'Sublimação': '#3b82f6', // Azul
      'Costura': '#8b5cf6', // Roxo
      'Expedição': '#10b981', // Verde
      'Pronto': '#059669', // Verde escuro - finalizado
    };

    const data: StatusCount[] = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, quantidade]) => ({
        name,
        quantidade,
        porcentagem: total > 0 ? (quantidade / total) * 100 : 0,
        color: colors[name] || '#94a3b8',
      }))
      .sort((a, b) => {
        // Ordenar pela ordem do processo
        const order = ['Financeiro', 'Conferência', 'Sublimação', 'Costura', 'Expedição', 'Pronto'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });

    return { data, total };
  }, [orders]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos por Status de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (statusData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos por Status de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum pedido com status de produção no período selecionado.
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{data.name}</p>
          <p className="text-sm text-slate-700">
            <strong>Quantidade:</strong> {data.quantidade} pedidos
          </p>
          <p className="text-sm text-slate-700">
            <strong>Porcentagem:</strong> {data.porcentagem.toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  // Identificar gargalos (status com muitos pedidos)
  const bottlenecks = statusData.data
    .filter((item) => item.porcentagem > 30 && item.name !== 'Pronto')
    .sort((a, b) => b.quantidade - a.quantidade);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos por Status de Produção</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Total: {statusData.total} pedidos • Identifique gargalos no processo
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={statusData.data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="quantidade" name="Quantidade de Pedidos" radius={[0, 4, 4, 0]}>
              {statusData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Alertas de gargalos */}
        {bottlenecks.length > 0 && (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Possíveis Gargalos Identificados:
                </p>
                <ul className="space-y-1">
                  {bottlenecks.map((bottleneck) => (
                    <li key={bottleneck.name} className="text-sm text-yellow-800">
                      • <strong>{bottleneck.name}:</strong> {bottleneck.quantidade} pedidos (
                      {bottleneck.porcentagem.toFixed(1)}% do total)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Legenda de cores */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600">
          {statusData.data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span>
                {item.name}: {item.quantidade} ({item.porcentagem.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
