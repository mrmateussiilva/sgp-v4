import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'inputMode'> {
  value: string;
  onValueChange: (value: string) => void;
}

const DEFAULT_VALUE = '0,00';

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, onBlur, ...props }, ref) => {
    const displayValue = value ?? DEFAULT_VALUE;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      
      // Remove tudo exceto dígitos, vírgula e ponto
      const cleaned = inputValue.replace(/[^\d,.-]/g, '');
      
      // Se estiver vazio, retorna valor padrão
      if (!cleaned || cleaned.trim().length === 0) {
        onValueChange(DEFAULT_VALUE);
        return;
      }

      // Normaliza para formato numérico (substitui vírgula por ponto)
      let normalized = cleaned;
      if (cleaned.includes(',') && cleaned.includes('.')) {
        // Se tem ambos, remove pontos e mantém vírgula como separador decimal
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (cleaned.includes(',')) {
        // Se só tem vírgula, substitui por ponto
        normalized = cleaned.replace(',', '.');
      }

      // Parse do valor numérico
      const numericValue = parseFloat(normalized);
      
      // Se não for um número válido, retorna valor padrão
      if (isNaN(numericValue)) {
        onValueChange(DEFAULT_VALUE);
        return;
      }

      // Formata como moeda brasileira (sem dividir por 100 - já está em reais)
      const formattedValue = numericValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      onValueChange(formattedValue);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      if (!displayValue || displayValue.trim().length === 0) {
        onValueChange(DEFAULT_VALUE);
      }
      onBlur?.(event);
    };

    return (
      <input
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        inputMode="decimal"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
