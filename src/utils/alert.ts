import { AlertModalVariant } from "@/components/ui/alert-modal"

interface AlertOptions {
  title?: string
  variant?: AlertModalVariant
  confirmText?: string
  onConfirm?: () => void
}

// Variável global para armazenar a função showAlert do contexto
let globalShowAlert: ((message: string, options?: AlertOptions) => Promise<void>) | null = null

type PendingAlert = {
  message: string
  options: AlertOptions
  resolve: () => void
}

const pendingAlerts: PendingAlert[] = []
let isProcessingQueue = false

const processPendingAlerts = async () => {
  if (!globalShowAlert || isProcessingQueue || pendingAlerts.length === 0) {
    return
  }

  isProcessingQueue = true

  while (globalShowAlert && pendingAlerts.length > 0) {
    const { message, options, resolve } = pendingAlerts.shift()!
    try {
      await globalShowAlert(message, options)
    } finally {
      resolve()
    }
  }

  isProcessingQueue = false
}

export function setGlobalAlert(showAlert: (message: string, options?: AlertOptions) => Promise<void>) {
  globalShowAlert = showAlert
  void processPendingAlerts()
}

// Função helper para substituir window.alert
export function alert(message: string, title?: string): Promise<void> {
  return showAlert(message, {
    title: title || "Alerta",
    variant: "default",
  })
}

// Função helper para mostrar alertas com mais opções
export function showAlert(message: string, options: AlertOptions = {}): Promise<void> {
  if (!globalShowAlert) {
    return new Promise((resolve) => {
      pendingAlerts.push({ message, options, resolve })
      void processPendingAlerts()
    })
  }
  return globalShowAlert(message, options)
}
