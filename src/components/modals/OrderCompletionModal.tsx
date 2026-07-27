import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Check, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OrderCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (completionDate: string) => void;
  orderNumber?: string;
  customerName?: string;
}

export const OrderCompletionModal: React.FC<OrderCompletionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  customerName,
}) => {
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(getTodayString());
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Data Real de Conclusão
          </DialogTitle>
          <DialogDescription className="text-sm">
            {orderNumber && <span className="font-semibold text-foreground">Pedido #{orderNumber}</span>}
            {customerName && <span> — {customerName}</span>}
            <br />
            Informe em qual data o pedido foi finalizado fisicamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={selectedDate === getTodayString() ? 'default' : 'outline'}
              size="sm"
              className="flex-1 font-bold text-xs"
              onClick={() => setSelectedDate(getTodayString())}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Hoje ({new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
            </Button>
            <Button
              type="button"
              variant={selectedDate === getYesterdayString() ? 'default' : 'outline'}
              size="sm"
              className="flex-1 font-bold text-xs"
              onClick={() => setSelectedDate(getYesterdayString())}
            >
              Ontem (
              {(() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                return y.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              })()}
              )
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="completion-date" className="text-xs font-semibold">
              Ou escolha outra data:
            </Label>
            <Input
              id="completion-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full font-mono text-sm"
              max={getTodayString()}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose} size="sm">
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} size="sm" className="font-bold">
            <Check className="h-4 w-4 mr-1.5" />
            Confirmar e Dar Baixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
