import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Printer, Download, Loader2 } from 'lucide-react';
import { printPdfBlob, saveAndOpenPdf } from '../pdf/tauriPdfUtils';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfBlob: Blob | null;
    filename: string;
    title: string;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
    isOpen,
    onClose,
    pdfBlob,
    filename,
    title
}) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (pdfBlob && isOpen) {
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPdfUrl(null);
        }
    }, [pdfBlob, isOpen]);

    const handlePrint = async () => {
        if (!pdfBlob) return;
        setIsPrinting(true);
        try {
            await printPdfBlob(pdfBlob);
        } catch (error) {
            console.error('Erro ao imprimir:', error);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleSave = async () => {
        if (!pdfBlob) return;
        setIsSaving(true);
        try {
            await saveAndOpenPdf(pdfBlob, filename);
        } catch (error) {
            console.error('Erro ao salvar:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-4">
                <DialogHeader className="flex flex-row items-center justify-between pb-2 border-bottom">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Printer className="h-5 w-5 text-blue-600" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 bg-gray-100 rounded-md border overflow-hidden relative">
                    {pdfUrl ? (
                        <iframe
                            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="w-full h-full border-none"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                            <p className="text-gray-500 font-medium">Gerando pré-visualização...</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 flex justify-between items-center bg-white border-t mt-2">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleSave}
                            disabled={!pdfBlob || isSaving}
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" />
                            {isSaving ? 'Salvando...' : 'Salvar PDF'}
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} className="gap-2 text-gray-500">
                            Fechar
                        </Button>
                        <Button
                            onClick={handlePrint}
                            disabled={!pdfBlob || isPrinting}
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8"
                        >
                            <Printer className="h-4 w-4" />
                            {isPrinting ? 'Preparando...' : 'Imprimir'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
