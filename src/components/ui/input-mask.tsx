import * as React from "react"
import InputMask from "react-input-mask"
import { cn } from "@/lib/utils"

export interface InputMaskProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: string;
}

const InputWithMask = React.forwardRef<HTMLInputElement, InputMaskProps>(
  ({ className, mask, onChange, value, ...props }, ref) => {
    // Converte o value para maiúsculas se necessário
    const processedValue = React.useMemo(() => {
      if (value && typeof value === 'string') {
        return value.toUpperCase();
      }
      return value;
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        // Converte o valor para maiúsculas
        e.target.value = e.target.value.toUpperCase();
      }
      onChange?.(e);
    };

    return (
      <InputMask
        mask={mask}
        {...props}
        value={processedValue}
        onChange={handleChange}
      >
        {(inputProps: any) => (
          <input
            {...inputProps}
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 uppercase",
              className
            )}
            style={{ textTransform: 'uppercase' }}
          />
        )}
      </InputMask>
    )
  }
)
InputWithMask.displayName = "InputWithMask"

export { InputWithMask }

