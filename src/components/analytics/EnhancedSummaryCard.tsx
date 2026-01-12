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

        {/* Variação percentual */}
        {variation !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            {getVariationIcon()}
            <span className={cn('text-sm font-semibold', getVariationColor())}>
              {variation > 0 ? '+' : ''}
              {variation.toFixed(1)}%
            </span>
            {variationLabel && (
              <span className="text-xs text-slate-500">{variationLabel}</span>
            )}
          </div>
        )}

        {/* Status com ícone */}
        {status && statusLabel && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-sm">{getStatusIcon(status)}</span>
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
