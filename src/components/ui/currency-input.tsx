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
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [localValue, setLocalValue] = React.useState<string>('');
    const [isFocused, setIsFocused] = React.useState(false);

    // Combina refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Inicializa quando value muda externamente (quando não está focado)
    React.useEffect(() => {
      if (!isFocused) {
        setLocalValue(value || DEFAULT_VALUE);
      }
    }, [value, isFocused]);

    // Função para extrair apenas dígitos
    const extractDigits = (str: string): string => {
      return str.replace(/\D/g, '');
    };

    // Função para formatar valor como moeda brasileira
    const formatCurrency = (digits: string): string => {
      if (!digits || digits === '0' || digits === '') {
        return DEFAULT_VALUE;
      }

      // Converte para número (tratando como centavos)
      const numValue = parseInt(digits, 10) / 100;
      
      // Formata como moeda brasileira
      return numValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // Função para calcular nova posição do cursor após formatação
    const calculateCursorPosition = (
      oldValue: string,
      newValue: string,
      oldCursorPos: number
    ): number => {
      // Conta quantos dígitos existem antes do cursor na string antiga
      const digitsBeforeCursor = extractDigits(oldValue.substring(0, oldCursorPos)).length;
      
      // Encontra a posição no novo valor formatado que corresponde a esses dígitos
      let digitCount = 0;
      for (let i = 0; i < newValue.length; i++) {
        if (/\d/.test(newValue[i])) {
          digitCount++;
          if (digitCount >= digitsBeforeCursor) {
            return i + 1;
          }
        }
      }
      
      // Se não encontrou, retorna o final
      return newValue.length;
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Mantém o valor formatado quando foca
      setLocalValue(value || DEFAULT_VALUE);
      props.onFocus?.(event);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      const cursorPosition = event.target.selectionStart || 0;
      
      // Extrai apenas dígitos
      const digitsOnly = extractDigits(inputValue);
      
      // Se não há dígitos, usa valor padrão
      if (!digitsOnly || digitsOnly === '0') {
        setLocalValue(DEFAULT_VALUE);
        onValueChange(DEFAULT_VALUE);
        // Reposiciona cursor no final
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(DEFAULT_VALUE.length, DEFAULT_VALUE.length);
          }
        }, 0);
        return;
      }

      // Formata o valor
      const formatted = formatCurrency(digitsOnly);
      setLocalValue(formatted);
      onValueChange(formatted);

      // Calcula e restaura a posição do cursor
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = calculateCursorPosition(inputValue, formatted, cursorPosition);
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // Garante que o valor está formatado quando perde o foco
      const digits = extractDigits(localValue);
      if (!digits || digits === '0') {
        const formatted = DEFAULT_VALUE;
        setLocalValue(formatted);
        onValueChange(formatted);
      } else {
        const formatted = formatCurrency(digits);
        setLocalValue(formatted);
        onValueChange(formatted);
      }
      
      onBlur?.(event);
    };

    const displayValue = isFocused ? localValue : (value || DEFAULT_VALUE);

    return (
      <input
        ref={inputRef}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
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
