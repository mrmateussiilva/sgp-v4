import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarCheck, ShieldAlert } from 'lucide-react';
import { getWeekendDetails } from '@/utils/date';

interface WeekendConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateValue?: string | null;
  onConfirmCurrentDate: () => void;
  onConfirmNextBusinessDay: (nextDate: string) => void;
}

export const WeekendConfirmationModal: React.FC<WeekendConfirmationModalProps> = ({
  open,
  onOpenChange,
  dateValue,
  onConfirmCurrentDate,
  onConfirmNextBusinessDay,
}) => {
  const details = getWeekendDetails(dateValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Data de Entrega no Final de Semana
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Atenção à data de entrega ou retirada programada
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 text-sm space-y-2">
          <p>
            O pedido está marcado para um{' '}
            <strong className="text-amber-700 dark:text-amber-400 font-bold">
              {details.dayName} ({details.formattedDate || dateValue})
            </strong>
            .
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A empresa normalmente não realiza expedição, entregas ou retiradas aos sábados e domingos. Deseja ajustar a data para o próximo dia útil ou confirmar como exceção?
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
          {details.nextBusinessDay && (
            <Button
              type="button"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm"
              onClick={() => {
                onOpenChange(false);
                onConfirmNextBusinessDay(details.nextBusinessDay!);
              }}
            >
              <CalendarCheck className="h-4 w-4" />
              Mudar para Segunda ({details.nextBusinessDayDisplay}) e Salvar
            </Button>
          )}

          <div className="flex items-center gap-2 w-full mt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Voltar e Revisar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-xs border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/40"
              onClick={() => {
                onOpenChange(false);
                onConfirmCurrentDate();
              }}
            >
              Manter Fim de Semana (Exceção)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
