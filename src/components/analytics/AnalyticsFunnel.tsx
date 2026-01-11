import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AnalyticsSummary } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface AnalyticsFunnelProps {
  summary: AnalyticsSummary | null;
  loading: boolean;
}

interface FunnelStage {
  name: string;
  value: number;
  percentage: number;
  format?: (value: number) => string;
  conversionRate?: number; // Taxa de conversão em relação ao estágio anterior
}

export function AnalyticsFunnel({ summary, loading }: AnalyticsFunnelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Vendas</CardTitle>
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
          <CardTitle>Funil de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado disponível.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular estágios do funil de forma lógica
  // Funil: Pedidos (100%) -> Itens -> Receita -> Ticket Médio
  const totalPedidos = summary.total_orders;
  const totalItens = summary.total_items_produced;
  const receitaTotal = summary.total_revenue;
  const ticketMedio = summary.average_ticket;
  
  // Criar estágios do funil em ordem decrescente
  const stages: FunnelStage[] = [
    {
      name: 'Total de Pedidos',
      value: totalPedidos,
      percentage: 100,
      format: (v: number) => v.toLocaleString('pt-BR'),
    },
    {
      name: 'Total de Itens Produzidos',
      value: totalItens,
      percentage: totalPedidos > 0 ? (totalItens / totalPedidos) * 100 : 0,
      format: (v: number) => v.toLocaleString('pt-BR'),
      conversionRate: totalPedidos > 0 ? (totalItens / totalPedidos) * 100 : 0,
    },
    {
      name: 'Receita Total',
      value: receitaTotal,
      percentage: totalItens > 0 ? Math.min((receitaTotal / (receitaTotal / totalItens * totalPedidos)) * 100, 100) : 0,
      format: (v: number) => currencyFormatter.format(v),
      conversionRate: totalItens > 0 ? 100 : 0,
    },
  ].filter((stage) => stage.value > 0);

  // Ajustar porcentagens para criar visualização de funil real
  // Cada estágio deve ser progressivamente menor
  const adjustedStages: FunnelStage[] = [];
  stages.forEach((stage, index) => {
    if (index === 0) {
      adjustedStages.push({ ...stage, percentage: 100 });
    } else {
      // Calcular porcentagem baseada no estágio anterior
      const previousStage = adjustedStages[index - 1];
      const conversionRate = stage.conversionRate || 100;
      // Garantir que cada estágio seja menor que o anterior
      const adjustedPercentage = Math.min((previousStage.percentage * conversionRate) / 100, previousStage.percentage * 0.95);
      adjustedStages.push({ ...stage, percentage: Math.max(adjustedPercentage, 20) }); // Mínimo 20% para visualização
    }
  });

  const colors = [
    'from-blue-600 to-blue-500',
    'from-green-600 to-green-500',
    'from-purple-600 to-purple-500',
    'from-indigo-600 to-indigo-500',
    'from-orange-600 to-orange-500',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {adjustedStages.map((stage, index) => {
            const width = Math.min(Math.max(stage.percentage, 15), 100);
            const colorClass = colors[index % colors.length];
            const previousStage = index > 0 ? adjustedStages[index - 1] : null;
            const conversionRate = previousStage 
              ? ((stage.value / previousStage.value) * 100).toFixed(1)
              : '100.0';

            return (
              <div key={index} className="relative">
                {/* Barra do funil */}
                <div className="flex items-center gap-4">
                  {/* Indicador de porcentagem */}
                  <div className="w-24 text-right">
                    <span className="text-sm font-medium text-slate-600">
                      {width.toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Barra do funil */}
                  <div className="flex-1 relative" style={{ height: '60px' }}>
                    <div
                      className={`h-full bg-gradient-to-r ${colorClass} rounded-lg text-white flex items-center justify-between px-4 shadow-md transition-all hover:shadow-lg`}
                      style={{ width: `${width}%` }}
                    >
                      <span className="font-semibold text-sm">{stage.name}</span>
                      <span className="font-bold text-sm">
                        {stage.format ? stage.format(stage.value) : stage.value}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informações de conversão */}
                {index > 0 && previousStage && (
                  <div className="flex items-center gap-4 pl-28 mt-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="text-slate-400">↓</span>
                      <span>
                        Conversão: {conversionRate}% ({stage.value.toLocaleString('pt-BR')} / {previousStage.value.toLocaleString('pt-BR')})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Métricas adicionais */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <p className="text-xs text-slate-500 mb-1">Ticket Médio</p>
            <p className="text-lg font-bold text-slate-900">
              {currencyFormatter.format(ticketMedio)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Itens/Pedido</p>
            <p className="text-lg font-bold text-slate-900">
              {(totalItens / totalPedidos).toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Receita/Item</p>
            <p className="text-lg font-bold text-slate-900">
              {currencyFormatter.format(receitaTotal / totalItens)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Receita/Pedido</p>
            <p className="text-lg font-bold text-slate-900">
              {currencyFormatter.format(receitaTotal / totalPedidos)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
