import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, value, ...props }, ref) => {
    // Converte o value para maiúsculas se necessário
    const processedValue = React.useMemo(() => {
      if (value && typeof value === 'string') {
        return value.toUpperCase();
      }
      return value;
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (e.target.value) {
        // Converte o valor para maiúsculas
        e.target.value = e.target.value.toUpperCase();
      }
      onChange?.(e);
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-card text-card-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 uppercase",
          className
        )}
        ref={ref}
        value={processedValue}
        onChange={handleChange}
        style={{ textTransform: 'uppercase' }}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }

