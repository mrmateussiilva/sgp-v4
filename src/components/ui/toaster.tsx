import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string) => {
    switch (variant) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      case "info":
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      case "destructive":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      default:
        return null
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = getIcon(variant)
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex gap-3 w-full">
              {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

