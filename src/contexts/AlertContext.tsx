import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertModal, AlertModalVariant } from '@/components/ui/alert-modal';
import { setGlobalAlert } from '@/utils/alert';

interface AlertOptions {
  title?: string;
  variant?: AlertModalVariant;
  confirmText?: string;
  onConfirm?: () => void;
}

interface AlertContextType {
  showAlert: (message: string, options?: AlertOptions) => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<{
    message: string;
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);
  const [open, setOpen] = useState(false);

  const showAlert = useCallback((message: string, options: AlertOptions = {}): Promise<void> => {
    return new Promise((resolve) => {
      setAlert({
        message,
        options,
        resolve,
      });
      setOpen(true);
    });
  }, []);

  // Registrar a função globalmente para uso fora de componentes React
  useEffect(() => {
    setGlobalAlert(showAlert);
  }, [showAlert]);

  const handleClose = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && alert) {
      alert.resolve();
      setAlert(null);
    }
  }, [alert]);

  const handleConfirm = useCallback(() => {
    if (alert?.options.onConfirm) {
      alert.options.onConfirm();
    }
    handleClose(false);
  }, [alert, handleClose]);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <AlertModal
          open={open}
          onOpenChange={handleClose}
          title={alert.options.title}
          message={alert.message}
          variant={alert.options.variant}
          confirmText={alert.options.confirmText}
          onConfirm={handleConfirm}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert deve ser usado dentro de um AlertProvider');
  }
  return context;
}

