import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trophy, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface RankingItem {
  name: string;
  pedidos: number;
  items: number;
  revenue: number;
}

interface FechamentoRankingsProps {
  rankings: RankingItem[] | null;
  loading: boolean;
  category: string;
}

export function FechamentoRankings({ rankings, loading, category }: FechamentoRankingsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top {category.charAt(0).toUpperCase() + category.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top {category.charAt(0).toUpperCase() + category.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = rankings.map((item, index) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    receita: item.revenue,
    pedidos: item.pedidos,
    fullName: item.name,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{data.fullName}</p>
          <p className="text-sm text-green-600">
            Receita: {currencyFormatter.format(data.receita)}
          </p>
          <p className="text-sm text-blue-600">Pedidos: {data.pedidos}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top {category.charAt(0).toUpperCase() + category.slice(1)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="receita" fill="#10b981" name="Receita" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {rankings.slice(0, 5).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">{item.pedidos} pedidos</span>
                <span className="text-sm font-semibold text-green-600">
                  {currencyFormatter.format(item.revenue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
