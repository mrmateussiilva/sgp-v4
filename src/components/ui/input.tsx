import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  noUppercase?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, value, noUppercase, ...props }, ref) => {
    // Tipos que não devem ser convertidos para maiúsculas
    const excludedTypes = ['password', 'number', 'email', 'tel', 'url', 'date', 'time', 'datetime-local', 'month', 'week', 'file', 'hidden'];
    const inputType = type || 'text';
    const shouldUppercase = !noUppercase && !excludedTypes.includes(inputType);
    
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    const [localValue, setLocalValue] = React.useState<string>('');

    // Combina refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Sincroniza valor externo quando não está focado
    React.useEffect(() => {
      if (!isFocused) {
        setLocalValue(value as string || '');
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setLocalValue(value as string || '');
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Converte para maiúsculas ao perder o foco
      if (shouldUppercase && localValue) {
        const upperValue = localValue.toUpperCase();
        setLocalValue(upperValue);
        // Cria evento sintético com valor convertido
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: upperValue,
          },
          currentTarget: {
            ...e.currentTarget,
            value: upperValue,
          },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(syntheticEvent);
      }
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      if (isFocused) {
        // Durante a digitação, mantém o valor local sem conversão
        setLocalValue(newValue);
        // Passa o valor original para onChange (sem conversão)
        onChange?.(e);
      } else {
        // Se não está focado, converte imediatamente
        if (shouldUppercase && newValue) {
          const upperValue = newValue.toUpperCase();
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              value: upperValue,
            },
            currentTarget: {
              ...e.currentTarget,
              value: upperValue,
            },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange?.(syntheticEvent);
        } else {
          onChange?.(e);
        }
      }
    };

    const displayValue = isFocused ? localValue : (value as string || '');

    return (
      <input
        type={type}
        ref={inputRef}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-card text-card-foreground px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          shouldUppercase && "uppercase",
          !shouldUppercase && "no-uppercase",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={shouldUppercase ? { textTransform: 'uppercase' } : { textTransform: 'none' }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

