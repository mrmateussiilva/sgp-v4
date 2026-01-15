import { ConfirmModalVariant } from "@/components/ui/confirm-modal"

interface ConfirmOptions {
  title?: string
  variant?: ConfirmModalVariant
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

// Variável global para armazenar a função showConfirm do contexto
let globalShowConfirm: ((message: string, options?: ConfirmOptions) => Promise<boolean>) | null = null

type PendingConfirm = {
  message: string
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

const pendingConfirms: PendingConfirm[] = []
let isProcessingQueue = false

const processPendingConfirms = async () => {
  if (!globalShowConfirm || isProcessingQueue || pendingConfirms.length === 0) {
    return
  }

  isProcessingQueue = true

  const showConfirmHandler = globalShowConfirm

  while (pendingConfirms.length > 0) {
    const { message, options, resolve } = pendingConfirms.shift()!
    try {
      const result = await showConfirmHandler(message, options)
      resolve(result)
    } catch (error) {
      resolve(false)
    }
  }

  isProcessingQueue = false
}

export function setGlobalConfirm(showConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>) {
  globalShowConfirm = showConfirm
  void processPendingConfirms()
}

// Função helper para substituir window.confirm
export function confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
  return showConfirm(message, {
    title: options?.title || "Confirmar",
    variant: options?.variant || "default",
    confirmText: options?.confirmText || "Confirmar",
    cancelText: options?.cancelText || "Cancelar",
    ...options,
  })
}

// Função helper para mostrar confirmações com mais opções
export function showConfirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (!globalShowConfirm) {
    return new Promise((resolve) => {
      pendingConfirms.push({ message, options, resolve })
      void processPendingConfirms()
    })
  }
  return globalShowConfirm(message, options)
}
