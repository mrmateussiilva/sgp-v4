import React from 'react';
import { AlertTriangle, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeekendDetails } from '@/utils/date';
import { cn } from '@/lib/utils';

interface WeekendWarningBannerProps {
  dateValue?: string | null;
  onApplyNextBusinessDay: (newDate: string) => void;
  className?: string;
}

export const WeekendWarningBanner: React.FC<WeekendWarningBannerProps> = ({
  dateValue,
  onApplyNextBusinessDay,
  className,
}) => {
  const details = getWeekendDetails(dateValue);

  if (!details.isWeekend || !details.nextBusinessDay) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs gap-2 animate-in fade-in-50 duration-200 mt-1.5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
        <span className="leading-tight">
          Atenção: A data selecionada é um <strong>{details.dayName}</strong>. A expedição/retirada normalmente não opera em fins de semana.
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onApplyNextBusinessDay(details.nextBusinessDay!)}
        className="h-7 px-2.5 text-xs bg-white dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-800/80 whitespace-nowrap shrink-0 font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs active:scale-95 transition-all"
      >
        <CalendarCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
        Mudar para Segunda ({details.nextBusinessDayDisplay})
      </Button>
    </div>
  );
};
