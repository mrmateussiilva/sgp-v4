import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ConfirmModal, ConfirmModalVariant } from '@/components/ui/confirm-modal';
import { setGlobalConfirm } from '@/utils/confirm';

interface ConfirmOptions {
  title?: string;
  variant?: ConfirmModalVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ConfirmContextType {
  showConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [confirm, setConfirm] = useState<{
    message: string;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [open, setOpen] = useState(false);

  const showConfirm = useCallback((message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm({
        message,
        options,
        resolve,
      });
      setOpen(true);
    });
  }, []);

  // Registrar a função globalmente para uso fora de componentes React
  useEffect(() => {
    setGlobalConfirm(showConfirm);
  }, [showConfirm]);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen && confirm) {
      // Se fechou sem confirmar (clicou fora ou ESC), resolve como false
      confirm.resolve(false);
      setConfirm(null);
    }
    setOpen(isOpen);
  }, [confirm]);

  const handleConfirm = useCallback(() => {
    if (confirm?.options.onConfirm) {
      confirm.options.onConfirm();
    }
    const wasConfirmed = true;
    if (confirm) {
      confirm.resolve(wasConfirmed);
      setConfirm(null);
    }
    setOpen(false);
  }, [confirm]);

  const handleCancel = useCallback(() => {
    if (confirm?.options.onCancel) {
      confirm.options.onCancel();
    }
    if (confirm) {
      confirm.resolve(false);
      setConfirm(null);
    }
    setOpen(false);
  }, [confirm]);

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirm && (
        <ConfirmModal
          open={open}
          onOpenChange={handleClose}
          title={confirm.options.title}
          message={confirm.message}
          variant={confirm.options.variant}
          confirmText={confirm.options.confirmText}
          cancelText={confirm.options.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (context === undefined) {
    throw new Error('useConfirm deve ser usado dentro de um ConfirmProvider');
  }
  return context;
}
