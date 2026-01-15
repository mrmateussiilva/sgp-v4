import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export type ConfirmModalVariant = "default" | "destructive" | "warning" | "info"

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
  variant?: ConfirmModalVariant
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: "text-blue-600 dark:text-blue-400",
    confirmButtonVariant: "default" as const,
  },
  destructive: {
    icon: AlertCircle,
    iconColor: "text-destructive",
    confirmButtonVariant: "destructive" as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-600 dark:text-yellow-400",
    confirmButtonVariant: "default" as const,
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600 dark:text-blue-400",
    confirmButtonVariant: "default" as const,
  },
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  variant = "default",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={cn("h-5 w-5", config.iconColor)} />
            <DialogTitle>{title || "Confirmar"}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="pt-2 whitespace-pre-line">
          {message}
        </DialogDescription>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={config.confirmButtonVariant}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
