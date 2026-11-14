export type ActionTriggerType =
  | 'order_created'
  | 'stage_changed'
  | 'status_changed'
  | 'order_updated'
  | 'order_deleted';

export type ProductionStageKey =
  | 'financeiro'
  | 'conferencia'
  | 'sublimacao'
  | 'costura'
  | 'expedicao'
  | 'pronto';

export type ActionConditionField =
  | 'prioridade'
  | 'forma_envio'
  | 'tipo_producao'
  | 'tecido'
  | 'valor_total'
  | 'cliente'
  | 'entrega_mesmo_dia'
  | 'status';

export type ActionConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'gt'
  | 'lt';

export interface ActionCondition {
  id: string;
  field: ActionConditionField;
  operator: ActionConditionOperator;
  value: string;
}

export type ActionEffectType =
  | 'notify_bell'
  | 'check_stock'
  | 'deduct_stock'
  | 'set_priority_high'
  | 'prompt_print_ficha'
  | 'webhook';

export interface ActionEffectConfig {
  id: string;
  type: ActionEffectType;
  /** Título da notificação (suporta variáveis como {numero}, {cliente}) */
  notificationTitle?: string;
  /** Mensagem da notificação (suporta variáveis como {numero}, {cliente}, {forma_envio}, {valor_total}) */
  notificationMessage?: string;
  /** Limite mínimo de estoque em metros para alerta (usado em check_stock / deduct_stock) */
  stockMinThreshold?: number;
  /** Se true em check_stock/deduct_stock, só dispara Toast/Sino em eventos reais quando o estoque ficar abaixo do mínimo */
  notifyOnlyOnLowStock?: boolean;
  /** Nome específico de material para monitorar (vazio = todos os materiais do pedido) */
  targetMaterialName?: string;
  /** Se true em prompt_print_ficha, abre o modal da Ficha PDF automaticamente sem aguardar clique */
  autoOpenPrintModal?: boolean;
  /** URL de destino para disparo de Webhook HTTP POST */
  webhookUrl?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: ActionTriggerType;
  /** Se trigger === 'stage_changed', qual etapa específica dispara (ou 'any' para qualquer etapa marcada) */
  triggerStage?: ProductionStageKey | 'any';
  /** Tempo de espera em segundos antes de disparar a ação (padrão: 6s para não conflitar com modais/transições da tela) */
  delaySeconds?: number;
  conditions: ActionCondition[];
  effects: ActionEffectConfig[];
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastExecutedAt?: string | null;
}

export interface ActionExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: ActionTriggerType;
  orderId: number;
  orderNumero: string;
  customerName: string;
  status: 'success' | 'warning' | 'error';
  summary: string;
  details: string[];
  simulated: boolean;
  executedAt: string;
}

