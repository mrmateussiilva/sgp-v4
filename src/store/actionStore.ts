import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ActionExecutionLog,
  AutomationRule,
} from '@/types/actions';

const MAX_LOGS = 100;

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-stock-check-on-create',
    name: 'Verificar Estoque ao Criar Pedido',
    description:
      'Quando um novo pedido é criado, calcula a metragem de tecido/material consumida pelos itens e alerta se o estoque disponível estiver abaixo do limite mínimo.',
    enabled: true,
    trigger: 'order_created',
    delaySeconds: 6,
    conditions: [],
    effects: [
      {
        id: 'eff-stock-check-1',
        type: 'check_stock',
        stockMinThreshold: 20,
        notifyOnlyOnLowStock: true,
        targetMaterialName: '',
        notificationTitle: '📦 Verificação de Estoque — Pedido #{numero}',
        notificationMessage:
          'Pedido #{numero} ({cliente}) verificado no estoque de materiais.',
      },
    ],
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    executionCount: 0,
    lastExecutedAt: null,
  },
  {
    id: 'rule-expedicao-retirada',
    name: 'Pedido Pronto (Retirada) → Alertar Balcão/Expedição',
    description:
      'Quando a etapa "Pronto" é marcada em um pedido cuja forma de envio contém "RETIRADA", envia uma notificação imediata no sino e na tela.',
    enabled: true,
    trigger: 'stage_changed',
    triggerStage: 'pronto',
    delaySeconds: 6,
    conditions: [
      {
        id: 'cond-retirada-1',
        field: 'forma_envio',
        operator: 'contains',
        value: 'RETIRADA',
      },
    ],
    effects: [
      {
        id: 'eff-notify-retirada-1',
        type: 'notify_bell',
        notificationTitle: '🏪 Pronto para Retirada: #{numero}',
        notificationMessage:
          'O pedido #{numero} do cliente {cliente} está PRONTO aguardando retirada no balcão!',
      },
    ],
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    executionCount: 0,
    lastExecutedAt: null,
  },
  {
    id: 'rule-same-day-urgent',
    name: 'Entrega no Mesmo Dia → Prioridade ALTA Automática',
    description:
      'Se um pedido for criado com data de entrega igual à data de entrada (mesmo dia), altera automaticamente a prioridade para ALTA e emite alerta de urgência.',
    enabled: false,
    trigger: 'order_created',
    delaySeconds: 6,
    conditions: [
      {
        id: 'cond-sameday-1',
        field: 'entrega_mesmo_dia',
        operator: 'equals',
        value: 'true',
      },
    ],
    effects: [
      {
        id: 'eff-priority-high-1',
        type: 'set_priority_high',
      },
      {
        id: 'eff-notify-urgent-1',
        type: 'notify_bell',
        notificationTitle: '🚨 URGENTE (Entrega Hoje): Pedido #{numero}',
        notificationMessage:
          'Pedido #{numero} ({cliente}) tem entrega para HOJE! Prioridade ajustada para ALTA.',
      },
    ],
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    executionCount: 0,
    lastExecutedAt: null,
  },
  {
    id: 'rule-financeiro-print-ficha',
    name: 'Financeiro Liberado → Sugerir Impressão da Ficha',
    description:
      'Quando o Financeiro libera um pedido, exibe um alerta com atalho rápido (ou abre a pré-visualização automaticamente) para imprimir a Ficha de Produção.',
    enabled: true,
    trigger: 'stage_changed',
    triggerStage: 'financeiro',
    delaySeconds: 6,
    conditions: [],
    effects: [
      {
        id: 'eff-print-ficha-1',
        type: 'prompt_print_ficha',
        autoOpenPrintModal: false,
        notificationTitle: '🖨️ Ficha Liberada para Impressão — Pedido #{numero}',
        notificationMessage:
          'O Financeiro liberou o pedido #{numero} ({cliente}). Clique em "Imprimir Ficha" para visualizar o PDF.',
      },
    ],
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    executionCount: 0,
    lastExecutedAt: null,
  },
  {
    id: 'rule-high-value-financeiro',
    name: 'Pedido Acima de R$ 1.000 → Notificar Conferência/Gestão',
    description:
      'Quando um pedido de alto valor (acima de R$ 1.000,00) é criado, dispara um aviso especial destacando o valor e a forma de envio.',
    enabled: false,
    trigger: 'order_created',
    delaySeconds: 6,
    conditions: [
      {
        id: 'cond-high-val-1',
        field: 'valor_total',
        operator: 'gt',
        value: '1000',
      },
    ],
    effects: [
      {
        id: 'eff-notify-high-val-1',
        type: 'notify_bell',
        notificationTitle: '💎 Pedido de Alto Valor #{numero}',
        notificationMessage:
          'Cliente {cliente} — Valor: R$ {valor_total} | Envio: {forma_envio}. Priorizar conferência!',
      },
    ],
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    executionCount: 0,
    lastExecutedAt: null,
  },
];

interface ActionState {
  rules: AutomationRule[];
  logs: ActionExecutionLog[];
  addRule: (
    rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecutedAt'>
  ) => AutomationRule;
  updateRule: (id: string, updates: Partial<AutomationRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  recordExecution: (log: Omit<ActionExecutionLog, 'id' | 'executedAt'>) => void;
  clearLogs: () => void;
  resetDefaultRules: () => void;
}

export const useActionStore = create<ActionState>()(
  persist(
    (set) => ({
      rules: DEFAULT_AUTOMATION_RULES,
      logs: [],

      addRule: (ruleData) => {
        const now = new Date().toISOString();
        const newRule: AutomationRule = {
          ...ruleData,
          id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: now,
          updatedAt: now,
          executionCount: 0,
          lastExecutedAt: null,
        };
        set((state) => ({
          rules: [newRule, ...state.rules],
        }));
        return newRule;
      },

      updateRule: (id, updates) =>
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === id
              ? { ...rule, ...updates, updatedAt: new Date().toISOString() }
              : rule
          ),
        })),

      deleteRule: (id) =>
        set((state) => ({
          rules: state.rules.filter((rule) => rule.id !== id),
        })),

      toggleRule: (id) =>
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === id
              ? {
                  ...rule,
                  enabled: !rule.enabled,
                  updatedAt: new Date().toISOString(),
                }
              : rule
          ),
        })),

      recordExecution: (logData) => {
        const now = new Date().toISOString();
        const newLog: ActionExecutionLog = {
          ...logData,
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          executedAt: now,
        };
        set((state) => ({
          logs: [newLog, ...state.logs].slice(0, MAX_LOGS),
          rules: state.rules.map((rule) =>
            rule.id === logData.ruleId
              ? {
                  ...rule,
                  executionCount: rule.executionCount + 1,
                  lastExecutedAt: now,
                }
              : rule
          ),
        }));
      },

      clearLogs: () => set({ logs: [] }),

      resetDefaultRules: () =>
        set({
          rules: DEFAULT_AUTOMATION_RULES,
        }),
    }),
    {
      name: 'sgp-actions-storage-v2',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ActionState> | undefined;
        if (!persisted || !Array.isArray(persisted.rules)) {
          return currentState;
        }
        // Garante que novas regras padrão (como a #5 de impressão) apareçam mesmo se já havia localStorage salvo
        const existingIds = new Set(persisted.rules.map((r) => r.id));
        const missingDefaults = DEFAULT_AUTOMATION_RULES.filter(
          (r) => !existingIds.has(r.id)
        );
        return {
          ...currentState,
          ...persisted,
          rules: [...persisted.rules, ...missingDefaults],
        };
      },
    }
  )
);

