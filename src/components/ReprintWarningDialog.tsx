import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle, Printer, X } from 'lucide-react';
import { PrintLog } from '../types';

interface ReprintWarningDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    lastPrint: PrintLog | null;
}

export const ReprintWarningDialog: React.FC<ReprintWarningDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    lastPrint,
}) => {
    if (!lastPrint) return null;

    const formattedDate = new Date(lastPrint.created_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md border-red-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Este pedido já foi impresso!
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        Identificamos que este pedido já passou pela fase de impressão anteriormente.
                        Isso pode causar duplicação desnecessária na produção.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex flex-col gap-1 my-2">
                    <div className="text-xs font-bold text-red-800 uppercase tracking-wider">Última impressão registrada:</div>
                    <div className="text-sm font-medium text-red-700 flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        {formattedDate}
                    </div>
                    {lastPrint.printer_name && (
                        <div className="text-xs text-red-600">
                            Na máquina: <span className="font-semibold">{lastPrint.printer_name}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between pt-2">
                    <Button variant="ghost" onClick={onClose} className="gap-2">
                        <X className="h-4 w-4" />
                        Cancelar e não imprimir
                    </Button>
                    <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                        <Printer className="h-4 w-4" />
                        Reimprimir assim mesmo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
