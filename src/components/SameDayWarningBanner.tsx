import React from 'react';
import { Clock, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSameDayDetails, getWeekendDetails } from '@/utils/date';
import { cn } from '@/lib/utils';

interface SameDayWarningBannerProps {
  dataEntrega?: string | null;
  dataEntrada?: string | null;
  formaEnvio?: string | null;
  onApplyNextDate: (newDate: string) => void;
  className?: string;
}

export const SameDayWarningBanner: React.FC<SameDayWarningBannerProps> = ({
  dataEntrega,
  dataEntrada,
  formaEnvio,
  onApplyNextDate,
  className,
}) => {
  // Se for final de semana, o WeekendWarningBanner já atua
  const weekend = getWeekendDetails(dataEntrega);
  if (weekend.isWeekend) {
    return null;
  }

  const sameDay = getSameDayDetails(dataEntrega, dataEntrada);
  if (!sameDay.isSameDay) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-orange-300 dark:border-orange-800 bg-orange-50/90 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 text-xs gap-2 animate-in fade-in-50 duration-200 mt-1.5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-2">
        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5 sm:mt-0" />
        <span className="leading-tight">
          Atenção: Entrega agendada para <strong>HOJE ({sameDay.todayFormatted})</strong>
          {formaEnvio ? ` via "${formaEnvio}"` : ''}. Confirme com a produção/admin se há tempo hábil antes de prometer ao cliente.
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onApplyNextDate(sameDay.nextDate)}
        className="h-7 px-2.5 text-xs bg-white dark:bg-orange-900/60 text-orange-950 dark:text-orange-100 border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-800/80 whitespace-nowrap shrink-0 font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs active:scale-95 transition-all"
      >
        <CalendarCheck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-300" />
        Mudar para {sameDay.nextDateLabel} ({sameDay.nextDateDisplay})
      </Button>
    </div>
  );
};
