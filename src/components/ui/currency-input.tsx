import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'inputMode'> {
  value: string;
  onValueChange: (value: string) => void;
}

const DEFAULT_VALUE = '0,00';
const MAX_DIGITS = 9; // allows up to 9 digits before the decimal part

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, onBlur, ...props }, ref) => {
    const displayValue = value ?? DEFAULT_VALUE;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawDigits = event.target.value.replace(/\D/g, '');
      const sanitized = rawDigits.replace(/^0+(?=\d)/, '');
      const limitedDigits = sanitized.slice(0, MAX_DIGITS + 2); // include cents

      if (limitedDigits.length === 0) {
        onValueChange(DEFAULT_VALUE);
        return;
      }

      const numericValue = parseInt(limitedDigits, 10);
      const formattedValue = (numericValue / 100).toLocaleString('pt-BR', {
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
        inputMode="numeric"
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
