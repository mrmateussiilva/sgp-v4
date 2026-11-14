import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateOrderMaterialUsage,
  cancelScheduledStageEvent,
  evaluateCondition,
  evaluateOrderEvent,
  interpolateTemplate,
  simulateSingleRule,
} from '@/services/actionEngine';
import { useActionStore } from '@/store/actionStore';
import { useDesignerNotificationStore } from '@/store/designerNotificationStore';
import { OrderStatus, OrderWithItems } from '@/types';

vi.mock('@/api/endpoints/resources', () => ({
  resourcesApi: {
    getMateriais: vi.fn().mockResolvedValue([
      {
        id: 1,
        nome: 'Tecido Sublimático Oxford',
        tipo: 'tecido',
        valor_metro: 15,
        estoque_metros: 25,
        ativo: true,
      },
    ]),
    updateMaterial: vi.fn().mockResolvedValue({}),
  },
}));

const createMockOrder = (overrides?: Partial<OrderWithItems>): OrderWithItems => ({
  id: 101,
  numero: '101',
  customer_name: 'Cliente Exemplo',
  cliente: 'Cliente Exemplo',
  address: 'Uberlândia',
  cidade_cliente: 'Uberlândia',
  estado_cliente: 'MG',
  data_entrada: '2026-11-11',
  data_entrega: '2026-11-11',
  total_value: 500,
  valor_total: 500,
  status: OrderStatus.Pendente,
  prioridade: 'NORMAL',
  forma_envio: 'RETIRADA NO BALCÃO',
  items: [
    {
      id: 1,
      order_id: 101,
      item_name: 'Painel Festa',
      tipo_producao: 'painel',
      tecido: 'Tecido Sublimático Oxford',
      largura: '2,00',
      altura: '3,00',
      quantity: 2,
      unit_price: 250,
      subtotal: 500,
      vendedor: 'Vendedor 1',
    },
  ],
  ...overrides,
});

describe('actionEngine', () => {
  beforeEach(() => {
    useActionStore.getState().resetDefaultRules();
    useActionStore.getState().clearLogs();
    useDesignerNotificationStore.getState().setNotifications([]);
  });

  it('calcula corretamente o consumo de material dos itens do pedido', () => {
    const order = createMockOrder();
    const usage = calculateOrderMaterialUsage(order);

    expect(usage).toHaveLength(1);
    expect(usage[0].materialName).toBe('Tecido Sublimático Oxford');
    // 2.00m * 3.00m * 2 unidades = 12.00m
    expect(usage[0].consumedMeters).toBe(12);
    expect(usage[0].itemCount).toBe(2);
  });

  it('interpola variáveis do pedido na mensagem de notificação', () => {
    const order = createMockOrder({
      numero: '4055',
      cliente: 'Maria Festas',
      forma_envio: 'SEDEX',
      valor_total: 1250.5,
    });

    const msg = interpolateTemplate(
      'Pedido #{numero} de {cliente} ({forma_envio}) - R$ {valor_total}',
      order
    );
    expect(msg).toBe('Pedido #4055 de Maria Festas (SEDEX) - R$ 1250,50');
  });

  it('avalia condições de forma_envio, valor_total e entrega_mesmo_dia', () => {
    const order = createMockOrder({
      forma_envio: 'RETIRADA BALCAO',
      valor_total: 1500,
      data_entrada: '2026-11-11',
      data_entrega: '2026-11-11',
    });

    expect(
      evaluateCondition(
        { id: '1', field: 'forma_envio', operator: 'contains', value: 'RETIRADA' },
        order
      )
    ).toBe(true);

    expect(
      evaluateCondition(
        { id: '2', field: 'valor_total', operator: 'gt', value: '1000' },
        order
      )
    ).toBe(true);

    expect(
      evaluateCondition(
        { id: '3', field: 'entrega_mesmo_dia', operator: 'equals', value: 'true' },
        order
      )
    ).toBe(true);
  });

  it('executa regras ativas ao criar pedido, verifica estoque e gera alerta se ficar abaixo do limite', async () => {
    const order = createMockOrder();

    // Estoque inicial mockado = 25m, consumo = 12m -> restante = 13m (abaixo do limite padrão de 20m!)
    const logs = await evaluateOrderEvent({
      trigger: 'order_created',
      order,
      simulated: true,
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const stockLog = logs.find((l) => l.ruleId === 'rule-stock-check-on-create');
    expect(stockLog).toBeDefined();
    expect(stockLog?.status).toBe('warning');
    expect(stockLog?.summary).toContain('13m');

    // Verifica que notificou o sino (NotificationBell)
    const bellNotifications = useDesignerNotificationStore.getState().notifications;
    expect(bellNotifications.length).toBeGreaterThan(0);
  });

  it('permite simular uma regra individualmente via simulateSingleRule', async () => {
    const result = await simulateSingleRule('rule-expedicao-retirada');
    expect(result).not.toBeNull();
    expect(result?.simulated).toBe(true);
    expect(useActionStore.getState().logs.length).toBe(1);
  });

  it('executa a action prompt_print_ficha ao liberar o financeiro e dispara evento de impressão quando autoOpenPrintModal está ativo', async () => {
    const eventSpy = vi.fn();
    window.addEventListener('sgp:action-print-order', eventSpy);

    // Ativa autoOpenPrintModal na regra padrão de impressão do financeiro
    useActionStore.getState().updateRule('rule-financeiro-print-ficha', {
      effects: [
        {
          id: 'eff-print-ficha-1',
          type: 'prompt_print_ficha',
          autoOpenPrintModal: true,
          notificationTitle: '🖨️ Ficha Liberada #{numero}',
        },
      ],
    });

    const order = createMockOrder({ id: 777, numero: '777', financeiro: true });
    const logs = await evaluateOrderEvent({
      trigger: 'stage_changed',
      order,
      changedStages: ['financeiro'],
      simulated: true,
    });

    const printLog = logs.find((l) => l.ruleId === 'rule-financeiro-print-ficha');
    expect(printLog).toBeDefined();
    expect(printLog?.status).toBe('success');
    expect(eventSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener('sgp:action-print-order', eventSpy);
  });

  it('cancela a execução pendente se a etapa for desmarcada durante o delay (cancelScheduledStageEvent)', async () => {
    useActionStore.getState().updateRule('rule-financeiro-print-ficha', {
      delaySeconds: 1,
    });

    const order = createMockOrder({ id: 888, numero: '888', financeiro: true });
    const pendingPromise = evaluateOrderEvent({
      trigger: 'stage_changed',
      order,
      changedStages: ['financeiro'],
      respectDelay: true,
    });

    // Usuário desmarca a etapa antes de 1s terminar
    cancelScheduledStageEvent(888, 'financeiro');

    const logs = await pendingPromise;
    expect(logs).toHaveLength(0);
    expect(useDesignerNotificationStore.getState().notifications).toHaveLength(0);
  });
});
