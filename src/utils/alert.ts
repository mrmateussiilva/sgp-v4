import { AlertModalVariant } from "@/components/ui/alert-modal"

interface AlertOptions {
  title?: string
  variant?: AlertModalVariant
  confirmText?: string
  onConfirm?: () => void
}

// Variável global para armazenar a função showAlert do contexto
let globalShowAlert: ((message: string, options?: AlertOptions) => Promise<void>) | null = null

export function setGlobalAlert(showAlert: (message: string, options?: AlertOptions) => Promise<void>) {
  globalShowAlert = showAlert
}

// Função helper para substituir window.alert
export function alert(message: string, title?: string): Promise<void> {
  if (!globalShowAlert) {
    // Fallback para window.alert se o contexto não estiver disponível
    window.alert(message)
    return Promise.resolve()
  }
  return globalShowAlert(message, {
    title: title || "Alerta",
    variant: "default",
  })
}

// Função helper para mostrar alertas com mais opções
export function showAlert(message: string, options: AlertOptions = {}): Promise<void> {
  if (!globalShowAlert) {
    // Fallback para window.alert se o contexto não estiver disponível
    window.alert(message)
    return Promise.resolve()
  }
  return globalShowAlert(message, options)
}

