import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GrowthIndicatorProps {
  current: number;
  previous: number | null;
  label?: string;
  formatValue?: (value: number) => string;
}

export function GrowthIndicator({
  current,
  previous,
  label,
  formatValue = (v) => v.toFixed(2),
}: GrowthIndicatorProps) {
  if (previous === null || previous === 0) {
    return null;
  }

  const growth = ((current - previous) / previous) * 100;
  const isPositive = growth > 0;
  const isNegative = growth < 0;
  const isNeutral = growth === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const color = isPositive
    ? 'text-green-600'
    : isNegative
      ? 'text-red-600'
      : 'text-slate-600';
  const bgColor = isPositive
    ? 'bg-green-50 border-green-200'
    : isNegative
      ? 'bg-red-50 border-red-200'
      : 'bg-slate-50 border-slate-200';

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded border ${bgColor}`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-sm font-semibold ${color}`}>
        {isPositive ? '+' : ''}
        {formatValue(growth)}%
      </span>
      {label && <span className="text-xs text-slate-600">vs {label}</span>}
    </div>
  );
}
