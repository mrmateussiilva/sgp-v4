import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

export type StatusType = 'good' | 'warning' | 'bad' | 'neutral';

interface EnhancedSummaryCardProps {
  title: string;
  value: string;
  variation?: number; // Variação percentual
  variationLabel?: string; // Ex: "vs semana anterior"
  status?: StatusType;
  statusLabel?: string; // Ex: "Acima da meta (105%)"
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  period?: string; // Ex: "01/01 - 15/01/2025"
  criteria?: string; // Ex: "Critério: Data de entrada"
}

export function EnhancedSummaryCard({
  title,
  value,
  variation,
  variationLabel,
  status,
  statusLabel,
  subtitle,
  icon,
  className,
  period,
  criteria,
}: EnhancedSummaryCardProps) {
  const getStatusColor = (statusType?: StatusType) => {
    switch (statusType) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'bad':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  const getStatusBg = (statusType?: StatusType) => {
    switch (statusType) {
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'bad':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-slate-200';
    }
  };

  const getStatusIcon = (statusType?: StatusType) => {
    switch (statusType) {
      case 'good':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'bad':
        return '🔴';
      default:
        return null;
    }
  };

  const getVariationIcon = () => {
    if (variation === undefined) return null;
    if (variation > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (variation < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const getVariationColor = () => {
    if (variation === undefined) return 'text-slate-600';
    if (variation > 0) return 'text-green-600';
    if (variation < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <Card className={cn('h-full border-slate-200 bg-white', className, status && getStatusBg(status))}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        {icon ? <div className="text-primary">{icon}</div> : null}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-slate-900">{value}</p>

        {/* Variação percentual com badge */}
        {variation !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            {getVariationIcon()}
            <span className={cn('text-sm font-bold', getVariationColor())}>
              {variation > 0 ? '+' : ''}
              {variation.toFixed(1)}%
            </span>
            {variationLabel && (
              <span className="text-xs text-slate-500">{variationLabel}</span>
            )}
            {/* Badge de status baseado na variação */}
            {Math.abs(variation) >= 10 && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  variation > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                )}
              >
                {variation > 0 ? 'EXCELENTE' : 'ATENÇÃO'}
              </span>
            )}
          </div>
        )}

        {/* Status com badge destacado */}
        {status && statusLabel && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-bold uppercase',
                status === 'good'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : status === 'warning'
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : status === 'bad'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-300'
              )}
            >
              {status === 'good' ? 'BOM' : status === 'warning' ? 'ATENÇÃO' : status === 'bad' ? 'CRÍTICO' : 'NEUTRO'}
            </span>
            <span className={cn('text-sm font-medium', getStatusColor(status))}>
              {statusLabel}
            </span>
          </div>
        )}

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        )}

        {/* Período */}
        {period && (
          <p className="mt-2 text-xs text-slate-400">Período: {period}</p>
        )}

        {/* Critério */}
        {criteria && (
          <p className="mt-1 text-xs text-slate-400">{criteria}</p>
        )}
      </CardContent>
    </Card>
  );
}
