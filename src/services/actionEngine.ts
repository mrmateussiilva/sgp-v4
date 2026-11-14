import * as React from 'react';
import { apiClient } from '@/api/client';
import { resourcesApi } from '@/api/endpoints/resources';
import { ToastAction, type ToastActionElement } from '@/components/ui/toast';
import { toast } from '@/hooks/use-toast';
import { useActionStore } from '@/store/actionStore';
import { useDesignerNotificationStore } from '@/store/designerNotificationStore';
import { OrderStatus, OrderWithItems } from '@/types';
import {
  ActionCondition,
  ActionEffectConfig,
  ActionExecutionLog,
  ActionTriggerType,
  AutomationRule,
  ProductionStageKey,
} from '@/types/actions';
import { logger } from '@/utils/logger';

export interface TriggerEventContext {
  trigger: ActionTriggerType;
  order: OrderWithItems;
  changedStages?: ProductionStageKey[];
  simulated?: boolean;
  /** Se true, respeita o delaySeconds configurado na regra (padrão 6s em eventos reais) */
  respectDelay?: boolean;
}

export const DEFAULT_ACTION_DELAY_SECONDS = 6;
const DEDUP_TTL_MS = 8000;
const recentEventKeys = new Map<string, number>();
const pendingOrderTimers = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; cancel: () => void }
>();

export function cancelScheduledStageEvent(orderId: number, stage: string): void {
  const key = `${orderId}:stage_changed:${stage}`;
  const existing = pendingOrderTimers.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    pendingOrderTimers.delete(key);
    existing.cancel();
    // Remove também da lista de deduplicação para permitir novo disparo caso seja marcado novamente
    for (const dedupKey of recentEventKeys.keys()) {
      if (dedupKey.startsWith(`stage_changed:${orderId}:`)) {
        recentEventKeys.delete(dedupKey);
      }
    }
    logger.debug(`[actionEngine] Timer pendente cancelado para pedido #${orderId} (etapa: ${stage})`);
  }
}

export function cancelAllScheduledOrderEvents(orderId: number): void {
  for (const [key, entry] of pendingOrderTimers.entries()) {
    if (key.startsWith(`${orderId}:`)) {
      clearTimeout(entry.timer);
      pendingOrderTimers.delete(key);
      entry.cancel();
    }
  }
}

function isDuplicateEvent(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of recentEventKeys.entries()) {
    if (now - ts > DEDUP_TTL_MS) {
      recentEventKeys.delete(k);
    }
  }
  const lastTs = recentEventKeys.get(key);
  if (lastTs && now - lastTs <= DEDUP_TTL_MS) {
    return true;
  }
  recentEventKeys.set(key, now);
  return false;
}

function parseNumeric(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const normalized = val.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseDimensionMeters(val: string | undefined): number {
  if (!val) return 0;
  const normalized = val.trim().replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export interface MaterialUsageSummary {
  materialName: string;
  consumedMeters: number;
  itemCount: number;
}

export function calculateOrderMaterialUsage(order: OrderWithItems): MaterialUsageSummary[] {
  const usageMap = new Map<string, { consumedMeters: number; itemCount: number }>();

  for (const item of order.items || []) {
    const rawMaterial =
      item.tecido ||
      item.material_gasto ||
      item.tipo_adesivo ||
      item.acabamento_lona ||
      item.tipo_producao ||
      'Tecido Padrão';
    const materialName = rawMaterial.trim();

    const qty = Math.max(
      1,
      Number(item.quantity) ||
        parseNumeric(item.quantidade_paineis) ||
        parseNumeric(item.quantidade_lona) ||
        parseNumeric(item.quantidade_adesivo) ||
        parseNumeric(item.quantidade_totem) ||
        parseNumeric(item.quantidade_canga) ||
        parseNumeric(item.quantidade_mochilinha) ||
        1
    );

    const m2Explicit = parseDimensionMeters(item.metro_quadrado);
    const largura = parseDimensionMeters(item.largura);
    const altura = parseDimensionMeters(item.altura);

    let consumed = 0;
    if (m2Explicit > 0) {
      consumed = m2Explicit * qty;
    } else if (largura > 0 && altura > 0) {
      consumed = largura * altura * qty;
    } else if (largura > 0 || altura > 0) {
      consumed = Math.max(largura, altura) * qty;
    } else {
      consumed = qty;
    }

    const existing = usageMap.get(materialName) || { consumedMeters: 0, itemCount: 0 };
    usageMap.set(materialName, {
      consumedMeters: Number((existing.consumedMeters + consumed).toFixed(2)),
      itemCount: existing.itemCount + qty,
    });
  }

  return Array.from(usageMap.entries()).map(([materialName, stats]) => ({
    materialName,
    consumedMeters: stats.consumedMeters,
    itemCount: stats.itemCount,
  }));
}

export function interpolateTemplate(template: string, order: OrderWithItems): string {
  const numero = String(order.numero || order.id || '0000');
  const cliente = order.cliente || order.customer_name || 'Cliente não informado';
  const formaEnvio = order.forma_envio || 'Não definida';
  const valorTotal = (order.valor_total ?? order.total_value ?? 0).toFixed(2).replace('.', ',');
  const prioridade = order.prioridade || 'NORMAL';
  const status = order.status || OrderStatus.Pendente;
  const cidade = order.cidade_cliente || order.address || '-';
  const dataEntrega = order.data_entrega ? order.data_entrega.slice(0, 10) : '-';
  const tecidos =
    (order.items || [])
      .map((i) => i.tecido || i.material_gasto)
      .filter(Boolean)
      .join(', ') || 'Padrão';

  return template
    .replace(/\{id\}/gi, String(order.id))
    .replace(/\{numero\}/gi, numero)
    .replace(/\{cliente\}/gi, cliente)
    .replace(/\{forma_envio\}/gi, formaEnvio)
    .replace(/\{valor_total\}/gi, valorTotal)
    .replace(/\{prioridade\}/gi, prioridade)
    .replace(/\{status\}/gi, String(status))
    .replace(/\{cidade\}/gi, cidade)
    .replace(/\{data_entrega\}/gi, dataEntrega)
    .replace(/\{tecidos\}/gi, tecidos);
}

export function evaluateCondition(condition: ActionCondition, order: OrderWithItems): boolean {
  const targetVal = (condition.value || '').trim().toLowerCase();

  let actualValues: string[] = [];
  let numericActual = 0;
  let isNumericField = false;

  switch (condition.field) {
    case 'prioridade':
      actualValues = [String(order.prioridade || 'NORMAL').toLowerCase()];
      break;
    case 'forma_envio':
      actualValues = [String(order.forma_envio || '').toLowerCase()];
      break;
    case 'cliente':
      actualValues = [String(order.cliente || order.customer_name || '').toLowerCase()];
      break;
    case 'status':
      actualValues = [String(order.status || '').toLowerCase()];
      break;
    case 'tipo_producao':
      actualValues = (order.items || []).map((i) =>
        String(i.tipo_producao || i.item_name || '').toLowerCase()
      );
      if (actualValues.length === 0) actualValues = [''];
      break;
    case 'tecido':
      actualValues = (order.items || []).map((i) =>
        String(i.tecido || i.material_gasto || '').toLowerCase()
      );
      if (actualValues.length === 0) actualValues = [''];
      break;
    case 'entrega_mesmo_dia': {
      const entrada = (order.data_entrada || '').slice(0, 10);
      const entrega = (order.data_entrega || '').slice(0, 10);
      const isSameDay = Boolean(entrada && entrega && entrada === entrega);
      actualValues = [String(isSameDay)];
      break;
    }
    case 'valor_total':
      isNumericField = true;
      numericActual = Number(order.valor_total ?? order.total_value ?? 0);
      actualValues = [String(numericActual)];
      break;
    default:
      actualValues = [''];
  }

  if (isNumericField) {
    const numericTarget = parseNumeric(condition.value);
    switch (condition.operator) {
      case 'gt':
        return numericActual > numericTarget;
      case 'lt':
        return numericActual < numericTarget;
      case 'equals':
        return Math.abs(numericActual - numericTarget) < 0.01;
      case 'not_equals':
        return Math.abs(numericActual - numericTarget) >= 0.01;
      case 'contains':
        return String(numericActual).includes(targetVal);
    }
  }

  switch (condition.operator) {
    case 'equals':
      return actualValues.some((v) => v === targetVal);
    case 'not_equals':
      return actualValues.every((v) => v !== targetVal);
    case 'contains':
      return actualValues.some((v) => v.includes(targetVal));
    case 'gt':
      return actualValues.some((v) => parseNumeric(v) > parseNumeric(targetVal));
    case 'lt':
      return actualValues.some((v) => parseNumeric(v) < parseNumeric(targetVal));
    default:
      return false;
  }
}

export function triggerOrderFichaPrint(order: OrderWithItems): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sgp:action-print-order', {
        detail: { order },
      })
    );
  }
}

function pushBellAndToast(
  order: OrderWithItems,
  title: string,
  message: string,
  variant: 'default' | 'destructive' = 'default',
  action?: ToastActionElement,
  duration?: number
) {
  useDesignerNotificationStore.getState().addNotification({
    type: 'designer_art_ready',
    notification_id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: 0,
    order_id: order.id || 0,
    title,
    message,
    created_at: new Date().toISOString(),
    read: false,
  });

  toast({
    title,
    description: message,
    variant,
    action,
    duration,
  });
}

async function executeEffect(
  effect: ActionEffectConfig,
  order: OrderWithItems,
  rule: AutomationRule,
  simulated: boolean
): Promise<{ status: 'success' | 'warning' | 'error'; detail: string }> {
  switch (effect.type) {
    case 'notify_bell': {
      const rawTitle = effect.notificationTitle || `⚡ Action: ${rule.name}`;
      const rawMessage =
        effect.notificationMessage ||
        'Pedido #{numero} ({cliente}) acionou a regra de automação.';
      const title = interpolateTemplate(rawTitle, order);
      const message = interpolateTemplate(rawMessage, order);

      pushBellAndToast(order, title, message, 'default');
      return {
        status: 'success',
        detail: `Notificação enviada: "${title}" — ${message}`,
      };
    }

    case 'check_stock':
    case 'deduct_stock': {
      const usages = calculateOrderMaterialUsage(order);
      const threshold = effect.stockMinThreshold ?? 20;
      const targetFilter = (effect.targetMaterialName || '').trim().toLowerCase();

      const filteredUsages = targetFilter
        ? usages.filter((u) => u.materialName.toLowerCase().includes(targetFilter))
        : usages;

      if (filteredUsages.length === 0) {
        const msg = targetFilter
          ? `Nenhum item do pedido utiliza o material "${effect.targetMaterialName}".`
          : 'Pedido sem itens com metragem de material para verificar.';
        return { status: 'success', detail: msg };
      }

      let catalogMaterials: Array<{
        id: number;
        nome: string;
        tipo: string;
        valor_metro: number;
        estoque_metros: number | null;
        ativo: boolean;
      }> = [];

      try {
        catalogMaterials = await resourcesApi.getMateriais();
      } catch (err) {
        logger.debug('[actionEngine] Falha ao buscar catálogo de materiais na API (usando cálculo local):', err);
      }

      const reportLines: string[] = [];
      let hasLowStockAlert = false;

      for (const usage of filteredUsages) {
        const matchedMat = catalogMaterials.find(
          (m) =>
            m.nome.toLowerCase() === usage.materialName.toLowerCase() ||
            usage.materialName.toLowerCase().includes(m.nome.toLowerCase()) ||
            m.nome.toLowerCase().includes(usage.materialName.toLowerCase())
        );

        if (matchedMat && matchedMat.estoque_metros !== null && matchedMat.estoque_metros !== undefined) {
          const currentStock = Number(matchedMat.estoque_metros);
          const remainingStock = Number((currentStock - usage.consumedMeters).toFixed(2));

          if (effect.type === 'deduct_stock' && !simulated) {
            try {
              await resourcesApi.updateMaterial({
                id: matchedMat.id,
                nome: matchedMat.nome,
                tipo: matchedMat.tipo,
                valor_metro: matchedMat.valor_metro,
                estoque_metros: Math.max(0, remainingStock),
                ativo: matchedMat.ativo,
              });
            } catch (updateErr) {
              logger.warn('[actionEngine] Não foi possível abater estoque na API:', updateErr);
            }
          }

          if (remainingStock < threshold) {
            hasLowStockAlert = true;
            reportLines.push(
              `⚠️ ${matchedMat.nome}: consumo ${usage.consumedMeters}m (Estoque cairá para ${remainingStock}m — abaixo do mínimo de ${threshold}m!)`
            );
          } else {
            reportLines.push(
              `✅ ${matchedMat.nome}: consumo ${usage.consumedMeters}m (Estoque disponível: ${remainingStock}m)`
            );
          }
        } else {
          // Material sem estoque cadastrado no banco ou modo offline/simulação
          if (usage.consumedMeters >= threshold) {
            hasLowStockAlert = true;
            reportLines.push(
              `⚠️ ${usage.materialName}: alto consumo detectado (${usage.consumedMeters}m em ${usage.itemCount} un.) — verifique disponibilidade física!`
            );
          } else {
            reportLines.push(
              `📐 ${usage.materialName}: consumo calculado de ${usage.consumedMeters}m (${usage.itemCount} un.)`
            );
          }
        }
      }

      const summaryText = reportLines.join(' | ');
      const title = hasLowStockAlert
        ? `⚠️ Alerta de Estoque — Pedido #${order.numero || order.id}`
        : interpolateTemplate(
            effect.notificationTitle || `📦 Estoque Verificado — Pedido #{numero}`,
            order
          );

      const shouldSilenceNormalStock =
        !hasLowStockAlert && Boolean(effect.notifyOnlyOnLowStock) && !simulated;

      if (!shouldSilenceNormalStock) {
        pushBellAndToast(
          order,
          title,
          summaryText,
          hasLowStockAlert ? 'destructive' : 'default'
        );
      }

      return {
        status: hasLowStockAlert ? 'warning' : 'success',
        detail: shouldSilenceNormalStock
          ? `${summaryText} (Verificado silenciosamente)`
          : summaryText,
      };
    }

    case 'set_priority_high': {
      order.prioridade = 'ALTA';
      if (!simulated && order.id > 0) {
        try {
          await apiClient.patch(`/pedidos/${order.id}`, { prioridade: 'ALTA' });
        } catch (err) {
          logger.warn('[actionEngine] Erro ao atualizar prioridade do pedido para ALTA:', err);
        }
      }
      return {
        status: 'success',
        detail: `Prioridade do pedido #${order.numero || order.id} definida automaticamente para ALTA.`,
      };
    }

    case 'prompt_print_ficha': {
      const rawTitle =
        effect.notificationTitle ||
        `🖨️ Ficha Liberada para Impressão — Pedido #{numero}`;
      const rawMessage =
        effect.notificationMessage ||
        `Pedido #{numero} ({cliente}) pronto para impressão da Ficha de Produção.`;
      const title = interpolateTemplate(rawTitle, order);
      const message = interpolateTemplate(rawMessage, order);

      const printActionButton = React.createElement(
        ToastAction,
        {
          altText: 'Imprimir Ficha',
          onClick: () => triggerOrderFichaPrint(order),
        },
        '🖨️ Imprimir Ficha'
      ) as unknown as ToastActionElement;

      pushBellAndToast(order, title, message, 'default', printActionButton, 10000);

      if (effect.autoOpenPrintModal) {
        triggerOrderFichaPrint(order);
        return {
          status: 'success',
          detail: `Pré-visualização de impressão da Ficha do pedido #${order.numero || order.id} aberta automaticamente.`,
        };
      }

      return {
        status: 'success',
        detail: `Sugestão de impressão enviada com atalho rápido para o pedido #${order.numero || order.id}.`,
      };
    }

    case 'webhook': {
      const url = (effect.webhookUrl || '').trim();
      if (!url) {
        return {
          status: 'error',
          detail: 'URL de Webhook não configurada na ação.',
        };
      }

      const payload = {
        event: rule.trigger,
        rule_id: rule.id,
        rule_name: rule.name,
        simulated,
        timestamp: new Date().toISOString(),
        order: {
          id: order.id,
          numero: order.numero,
          cliente: order.cliente || order.customer_name,
          valor_total: order.valor_total ?? order.total_value,
          forma_envio: order.forma_envio,
          prioridade: order.prioridade,
          status: order.status,
          items_count: order.items?.length ?? 0,
        },
      };

      if (simulated) {
        pushBellAndToast(
          order,
          `🌐 Webhook Simulado (${rule.name})`,
          `POST para ${url} com payload do pedido #${order.numero || order.id}`
        );
        return {
          status: 'success',
          detail: `[Simulação] POST enviado para ${url} com dados do pedido #${order.numero || order.id}.`,
        };
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          return {
            status: 'warning',
            detail: `Webhook respondeu com HTTP ${response.status} (${url}).`,
          };
        }
        return {
          status: 'success',
          detail: `Webhook disparado com sucesso para ${url} (HTTP ${response.status}).`,
        };
      } catch (err) {
        return {
          status: 'error',
          detail: `Falha ao conectar ao Webhook (${url}): ${err instanceof Error ? err.message : 'Erro de rede'}`,
        };
      }
    }

    default:
      return { status: 'error', detail: 'Tipo de ação desconhecido.' };
  }
}

export async function evaluateOrderEvent(context: TriggerEventContext): Promise<ActionExecutionLog[]> {
  const {
    trigger,
    order,
    changedStages = [],
    simulated = false,
    respectDelay = false,
  } = context;

  // Ignorar rascunhos em eventos reais
  if (!simulated && order.rascunho) {
    return [];
  }

  // Deduplicação para evitar disparo duplo entre resposta HTTP local e evento WebSocket
  if (!simulated) {
    const stageKey = changedStages.sort().join(',');
    const dedupKey = `${trigger}:${order.id}:${stageKey}:${order.status}`;
    if (isDuplicateEvent(dedupKey)) {
      logger.debug(`[actionEngine] Evento duplicado ignorado: ${dedupKey}`);
      return [];
    }
  }

  const store = useActionStore.getState();
  const activeRules = store.rules.filter((r) => r.enabled && r.trigger === trigger);

  if (activeRules.length === 0) {
    return [];
  }

  const matchedRules: AutomationRule[] = [];

  for (const rule of activeRules) {
    // Se o gatilho for mudança de etapa de produção, verifica se a etapa específica foi marcada neste evento
    if (trigger === 'stage_changed') {
      const targetStage = rule.triggerStage || 'any';
      if (targetStage !== 'any') {
        const stageMatched = changedStages.includes(targetStage);
        if (!stageMatched) {
          continue;
        }
      } else if (changedStages.length === 0) {
        continue;
      }
    }

    // Avalia todas as condições (AND lógico)
    const allConditionsMet = rule.conditions.every((cond) =>
      evaluateCondition(cond, order)
    );

    if (allConditionsMet) {
      matchedRules.push(rule);
    }
  }

  if (matchedRules.length === 0) {
    return [];
  }

  // Aguarda um único delay (padrão: 6 segundos em eventos reais) antes de disparar as ações correspondentes
  if (respectDelay) {
    const maxDelaySec = Math.max(
      0,
      ...matchedRules.map((r) => r.delaySeconds ?? DEFAULT_ACTION_DELAY_SECONDS)
    );
    if (maxDelaySec > 0) {
      const timerKeys =
        trigger === 'stage_changed' && changedStages.length > 0
          ? changedStages.map((st) => `${order.id}:stage_changed:${st}`)
          : [`${order.id}:${trigger}`];

      const wasCancelled = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          timerKeys.forEach((k) => pendingOrderTimers.delete(k));
          resolve(false);
        }, maxDelaySec * 1000);

        const cancel = () => resolve(true);

        timerKeys.forEach((k) => {
          const prev = pendingOrderTimers.get(k);
          if (prev) {
            clearTimeout(prev.timer);
            prev.cancel();
          }
          pendingOrderTimers.set(k, { timer, cancel });
        });
      });

      if (wasCancelled) {
        return [];
      }
    }
  }

  const executedLogs: ActionExecutionLog[] = [];

  for (const rule of matchedRules) {
    const details: string[] = [];
    let overallStatus: 'success' | 'warning' | 'error' = 'success';

    for (const effect of rule.effects) {
      const result = await executeEffect(effect, order, rule, simulated);
      details.push(result.detail);
      if (result.status === 'error') {
        overallStatus = 'error';
      } else if (result.status === 'warning' && overallStatus !== 'error') {
        overallStatus = 'warning';
      }
    }

    const logPayload: Omit<ActionExecutionLog, 'id' | 'executedAt'> = {
      ruleId: rule.id,
      ruleName: rule.name,
      trigger,
      orderId: order.id || 9999,
      orderNumero: String(order.numero || order.id || '9999'),
      customerName: order.cliente || order.customer_name || 'Cliente Teste',
      status: overallStatus,
      summary: details[0] || `Regra "${rule.name}" executada.`,
      details,
      simulated,
    };

    useActionStore.getState().recordExecution(logPayload);
    executedLogs.push({
      ...logPayload,
      id: `sim-${Date.now()}`,
      executedAt: new Date().toISOString(),
    });
  }

  return executedLogs;
}

/**
 * Agenda a avaliação de um evento real de pedido com atraso padrão (6s)
 * para garantir que modais de confirmação e atualizações de tabela terminem antes da Action.
 */
export function scheduleOrderEvent(context: Omit<TriggerEventContext, 'respectDelay'>): void {
  void evaluateOrderEvent({
    ...context,
    respectDelay: true,
  }).catch((err) => logger.warn('[actionEngine.scheduleOrderEvent] Erro ao executar action:', err));
}

export function createSampleOrderForRule(rule: AutomationRule): OrderWithItems {
  const today = new Date().toISOString().split('T')[0];

  // Constrói um pedido de teste que satisfaz as condições da regra para permitir teste imediato
  let prioridade = 'NORMAL';
  let formaEnvio = 'RETIRADA NO BALCÃO';
  let valorTotal = 480.0;
  let cliente = 'Gráfica Express Visual LTDA';
  let tecido = 'Tecido Sublimático Oxford';
  let tipoProducao = 'painel';

  for (const cond of rule.conditions) {
    if (cond.field === 'prioridade' && cond.value) {
      prioridade = cond.value.toUpperCase();
    }
    if (cond.field === 'forma_envio' && cond.value) {
      formaEnvio = cond.value.toUpperCase();
    }
    if (cond.field === 'valor_total' && cond.value) {
      const target = parseNumeric(cond.value);
      valorTotal = cond.operator === 'lt' ? Math.max(10, target - 50) : target + 250;
    }
    if (cond.field === 'cliente' && cond.value) {
      cliente = cond.value;
    }
    if (cond.field === 'tecido' && cond.value) {
      tecido = cond.value;
    }
    if (cond.field === 'tipo_producao' && cond.value) {
      tipoProducao = cond.value;
    }
  }

  return {
    id: 9042,
    numero: '9042',
    customer_name: cliente,
    cliente,
    address: 'Uberlândia - MG',
    cidade_cliente: 'Uberlândia',
    estado_cliente: 'MG',
    telefone_cliente: '(34) 99999-0000',
    data_entrada: today,
    data_entrega: today,
    total_value: valorTotal,
    valor_total: valorTotal,
    valor_frete: 0,
    status: OrderStatus.EmProcessamento,
    prioridade,
    forma_envio: formaEnvio,
    financeiro: true,
    conferencia: true,
    sublimacao: true,
    costura: true,
    expedicao: true,
    pronto: true,
    items: [
      {
        id: 1,
        order_id: 9042,
        item_name: 'Painel Sublimado 3,00m x 2,50m',
        tipo_producao: tipoProducao,
        largura: '3,00',
        altura: '2,50',
        metro_quadrado: '7,50',
        quantity: 3,
        quantidade_paineis: '3',
        unit_price: valorTotal / 3,
        subtotal: valorTotal,
        vendedor: 'Mateus',
        designer: 'Equipe Arte',
        tecido,
      },
    ],
  };
}

export async function simulateSingleRule(
  ruleId: string,
  customOrder?: OrderWithItems
): Promise<ActionExecutionLog | null> {
  const store = useActionStore.getState();
  const rule = store.rules.find((r) => r.id === ruleId);
  if (!rule) return null;

  const sampleOrder = customOrder || createSampleOrderForRule(rule);
  const details: string[] = [];
  let overallStatus: 'success' | 'warning' | 'error' = 'success';

  for (const effect of rule.effects) {
    const result = await executeEffect(effect, sampleOrder, rule, true);
    details.push(result.detail);
    if (result.status === 'error') {
      overallStatus = 'error';
    } else if (result.status === 'warning' && overallStatus !== 'error') {
      overallStatus = 'warning';
    }
  }

  const logPayload: Omit<ActionExecutionLog, 'id' | 'executedAt'> = {
    ruleId: rule.id,
    ruleName: rule.name,
    trigger: rule.trigger,
    orderId: sampleOrder.id,
    orderNumero: String(sampleOrder.numero || sampleOrder.id),
    customerName: sampleOrder.cliente || sampleOrder.customer_name,
    status: overallStatus,
    summary: details[0] || `Simulação da regra "${rule.name}" concluída.`,
    details,
    simulated: true,
  };

  useActionStore.getState().recordExecution(logPayload);
  return {
    ...logPayload,
    id: `sim-${Date.now()}`,
    executedAt: new Date().toISOString(),
  };
}
