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
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnalyticsTopProduct } from '@/types';

interface TopProductsChartProps {
  currentProducts: AnalyticsTopProduct[];
  previousProducts?: AnalyticsTopProduct[]; // Para calcular variação
  loading: boolean;
  limit?: number;
}

interface ProductData {
  name: string;
  quantidade: number;
  variacao?: number; // Variação percentual
  receita?: number; // Receita estimada (opcional)
  porcentagem?: number; // % do total
}

export function TopProductsChart({
  currentProducts,
  previousProducts,
  loading,
  limit = 5,
}: TopProductsChartProps) {
  const chartData = useMemo(() => {
    // Criar mapa de produtos anteriores para comparação
    const previousMap = new Map<string, number>();
    if (previousProducts) {
      previousProducts.forEach((product) => {
        previousMap.set(product.product_name, product.quantity);
      });
    }

    // Calcular total para porcentagem
    const total = currentProducts.reduce((sum, p) => sum + p.quantity, 0);

    // Debug: Log dos dados para verificação
    console.log('[TopProductsChart] Produtos atuais:', currentProducts);
    console.log('[TopProductsChart] Produtos anteriores:', previousProducts);
    console.log('[TopProductsChart] Mapa anterior:', Array.from(previousMap.entries()));

    const data: ProductData[] = currentProducts
      .slice(0, limit)
      .map((product) => {
        const previousQty = previousMap.get(product.product_name) || 0;
        
        // Calcular variação: se tinha 0 antes e agora tem valor, não calcular %
        // Se tinha valor antes, calcular normalmente
        let variacao: number | undefined = undefined;
        
        if (previousQty > 0) {
          // Tinha quantidade antes, calcular variação normal
          variacao = ((product.quantity - previousQty) / previousQty) * 100;
        } else if (previousQty === 0 && product.quantity > 0) {
          // Não tinha antes, agora tem - produto novo ou retomada
          // Não calcular variação percentual (seria infinito)
          variacao = undefined;
        }
        // Se ambos são 0, variacao já é undefined

        // Debug: Log de cada produto
        console.log(`[TopProductsChart] ${product.product_name}:`, {
          atual: product.quantity,
          anterior: previousQty,
          variacao: variacao !== undefined ? `${variacao.toFixed(1)}%` : 'N/A (produto novo)'
        });

        return {
          name: product.product_name.length > 25
            ? product.product_name.substring(0, 25) + '...'
            : product.product_name,
          fullName: product.product_name,
          quantidade: product.quantity,
          variacao,
          porcentagem: total > 0 ? (product.quantity / total) * 100 : 0,
        };
      });

    return data;
  }, [currentProducts, previousProducts, limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top {limit} Produtos Mais Vendidos</CardTitle>
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
          <CardTitle>Top {limit} Produtos Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum produto vendido no período selecionado.
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isGrowing = data.variacao !== undefined && data.variacao > 0;
      const isDeclining = data.variacao !== undefined && data.variacao < 0;
      
      return (
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-xl min-w-[240px]">
          <p className="font-bold text-base mb-3 text-slate-900 border-b pb-2">
            {data.fullName || data.name}
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Quantidade Vendida</p>
              <p className="text-lg font-bold text-slate-900">
                {data.quantidade.toLocaleString('pt-BR')} itens
              </p>
            </div>
            {data.porcentagem !== undefined && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Participação no Total</p>
                <p className="text-sm font-semibold text-slate-700">
                  {data.porcentagem.toFixed(1)}% de todas as vendas
                </p>
              </div>
            )}
            {data.variacao !== undefined && (
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500 mb-1">Variação vs Período Anterior</p>
                <p className={`text-base font-bold ${
                  isGrowing ? 'text-green-600' : isDeclining ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {isGrowing ? '↑' : isDeclining ? '↓' : '→'} {Math.abs(data.variacao).toFixed(1)}%
                </p>
                {Math.abs(data.variacao) >= 15 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {isGrowing ? '🚀 Crescimento forte!' : '⚠️ Queda significativa'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Cores baseadas na variação
  const getColor = (item: ProductData) => {
    if (item.variacao === undefined) return '#3b82f6';
    if (item.variacao > 0) return '#10b981'; // Verde - cresceu
    if (item.variacao < 0) return '#ef4444'; // Vermelho - caiu
    return '#94a3b8'; // Cinza - sem mudança
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top {limit} Produtos Mais Vendidos</CardTitle>
        {previousProducts && (
          <p className="text-sm text-slate-500 mt-1">
            Comparação com período anterior disponível
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="quantidade" name="Quantidade Vendida" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tabela com variações */}
        <div className="mt-6 space-y-2">
          {chartData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-900">{item.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-slate-900">
                  {item.quantidade.toLocaleString('pt-BR')} itens
                </span>
                {item.variacao !== undefined ? (
                  <div
                    className={`flex items-center gap-1 text-sm font-semibold ${
                      item.variacao >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.variacao > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : item.variacao < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    <span>
                      {item.variacao >= 0 ? '+' : ''}
                      {item.variacao.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm font-semibold text-blue-600">
                    <span className="text-xs">NOVO</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
