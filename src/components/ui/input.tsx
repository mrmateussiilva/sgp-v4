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

    // Converte o value para maiúsculas se necessário
    const processedValue = React.useMemo(() => {
      if (shouldUppercase && value && typeof value === 'string') {
        return value.toUpperCase();
      }
      return value;
    }, [value, shouldUppercase]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (shouldUppercase && e.target.value) {
        // Converte o valor para maiúsculas
        e.target.value = e.target.value.toUpperCase();
      }
      onChange?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-card text-card-foreground px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          shouldUppercase && "uppercase",
          !shouldUppercase && "no-uppercase",
          className
        )}
        ref={ref}
        value={processedValue}
        onChange={handleChange}
        style={shouldUppercase ? { textTransform: 'uppercase' } : { textTransform: 'none' }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

