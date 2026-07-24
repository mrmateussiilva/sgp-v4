/**
 * Tipos para o sistema de notificações de designers.
 * Evento enviado pelo backend via WebSocket quando o financeiro libera um pedido.
 */

/** Evento recebido via WebSocket (type = "designer_art_ready") */
export interface DesignerArtReadyEvent {
  type: 'designer_art_ready';
  /** UUID único gerado pelo backend — usado para deduplicação */
  notification_id: string;
  /** ID do usuário destinatário */
  user_id: number;
  /** ID do pedido */
  order_id: number;
  /** Índice do item/arte dentro do pedido (0-based) */
  art_id?: number;
  /** Título da notificação nativa */
  title: string;
  /** Corpo da notificação nativa */
  message: string;
  /** ISO 8601 timestamp gerado pelo backend */
  created_at: string;
}

/** Notificação persistida localmente no store + banco */
export interface DesignerNotificationItem extends DesignerArtReadyEvent {
  read: boolean;
}

/** Resposta da API REST para listagem de notificações */
export interface DesignerNotificationApiItem {
  id: number;
  notification_id: string;
  user_id: number;
  order_id: number;
  art_id: number | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  visualizada: boolean;
  created_at: string;
  read_at: string | null;
}

/** Resposta do endpoint de contagem */
export interface UnreadCountResponse {
  unread_count: number;
}
