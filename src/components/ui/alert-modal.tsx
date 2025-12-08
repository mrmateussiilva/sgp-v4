import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type AlertModalVariant = "default" | "destructive" | "success" | "warning" | "info"

interface AlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
  variant?: AlertModalVariant
  confirmText?: string
  onConfirm?: () => void
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: "text-blue-600 dark:text-blue-400",
    buttonVariant: "default" as const,
  },
  destructive: {
    icon: AlertCircle,
    iconColor: "text-destructive",
    buttonVariant: "destructive" as const,
  },
  success: {
    icon: CheckCircle2,
    iconColor: "text-green-600 dark:text-green-400",
    buttonVariant: "default" as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-600 dark:text-yellow-400",
    buttonVariant: "default" as const,
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600 dark:text-blue-400",
    buttonVariant: "default" as const,
  },
}

export function AlertModal({
  open,
  onOpenChange,
  title,
  message,
  variant = "default",
  confirmText = "OK",
  onConfirm,
}: AlertModalProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={cn("h-5 w-5", config.iconColor)} />
            <DialogTitle>{title || "Alerta"}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="pt-2">
          {message}
        </DialogDescription>
        <DialogFooter>
          <Button onClick={handleConfirm} variant={config.buttonVariant}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

