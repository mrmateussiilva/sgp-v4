import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Clock, CalendarCheck } from 'lucide-react';
import { getSameDayDetails } from '@/utils/date';

interface SameDayConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataEntrega?: string | null;
  dataEntrada?: string | null;
  formaEnvio?: string | null;
  clienteNome?: string | null;
  onConfirmSameDay: () => void;
  onConfirmNextDate: (newDate: string) => void;
}

export const SameDayConfirmationModal: React.FC<SameDayConfirmationModalProps> = ({
  open,
  onOpenChange,
  dataEntrega,
  dataEntrada,
  formaEnvio,
  clienteNome,
  onConfirmSameDay,
  onConfirmNextDate,
}) => {
  const [confirmedWithAdmin, setConfirmedWithAdmin] = useState(false);
  const sameDay = getSameDayDetails(dataEntrega, dataEntrada);

  // Reseta o checkbox sempre que o modal abre
  useEffect(() => {
    if (open) {
      setConfirmedWithAdmin(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Confirmação: Pedido para o Mesmo Dia
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Validação de disponibilidade de produção e envio para hoje
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-2 p-3.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60 text-slate-800 dark:text-slate-200 text-xs sm:text-sm space-y-2">
          {clienteNome && (
            <p className="truncate">
              <strong>Cliente:</strong> {clienteNome}
            </p>
          )}
          {formaEnvio && (
            <p>
              <strong>Forma de Envio:</strong> {formaEnvio}
            </p>
          )}
          <p>
            <strong>Data Programada:</strong>{' '}
            <span className="text-orange-700 dark:text-orange-400 font-bold">
              HOJE ({sameDay.todayFormatted})
            </span>
          </p>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-orange-200/60 dark:border-orange-900/40">
            A produção e despacho para o mesmo dia dependem de disponibilidade imediata nas máquinas e do horário de corte das coletas.
          </p>
        </div>

        {/* Checkbox de compromisso do vendedor */}
        <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-border/80 bg-muted/40 my-1">
          <Checkbox
            id="confirm-admin-sameday"
            checked={confirmedWithAdmin}
            onCheckedChange={(checked) => setConfirmedWithAdmin(checked === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="confirm-admin-sameday"
            className="text-xs font-medium text-foreground cursor-pointer leading-snug select-none"
          >
            Confirmo que consultei a administração/gerência e este pedido para hoje está autorizado.
          </Label>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
          {/* Opção recomendada / 1 clique */}
          <Button
            type="button"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm text-xs sm:text-sm"
            onClick={() => {
              onOpenChange(false);
              onConfirmNextDate(sameDay.nextDate);
            }}
          >
            <CalendarCheck className="h-4 w-4" />
            Mudar para {sameDay.nextDateLabel} ({sameDay.nextDateDisplay}) e Salvar
          </Button>

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
              disabled={!confirmedWithAdmin}
              className={`flex-1 text-xs font-semibold ${
                confirmedWithAdmin
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
              }`}
              onClick={() => {
                onOpenChange(false);
                onConfirmSameDay();
              }}
            >
              Confirmar para Hoje
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
