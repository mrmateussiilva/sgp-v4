import { OrderWithItems, DashboardSummary } from '@/types';

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  urgentOrders: number;
  overdueOrders: number;
  avgProductionTime: number;
  avgDelayTime: number;
  todayOrders: number;
  completedTodayOrders: number;
  efficiencyRate: number;
  waitingShipmentOrders: number;
  shippingMethods: Array<{ name: string; count: number; percentage: number }>;
}

export interface ProductionEfficiency {
  financeiro: number;
  conferencia: number;
  sublimacao: number;
  costura: number;
  expedicao: number;
}

export interface ProductionStageCounts {
  financeiro: number;
  conferencia: number;
  sublimacao: number;
  costura: number;
  expedicao: number;
  pronto: number;
}

export interface ProcessedOrder extends OrderWithItems {
  isOverdue?: boolean;
  daysUntilDelivery?: number;
}

/**
 * Converte com segurança uma string de data (YYYY-MM-DD ou ISO) para Date local sem deslocamento indevido de fuso horário.
 */
export function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match.map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Verifica se a data informada corresponde ao dia de hoje no horário local.
 */
export function isDateToday(dateStr?: string | null): boolean {
  const date = parseLocalDate(dateStr);
  if (!date) return false;

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Verifica se o pedido está com prazo de entrega vencido (considerando 00:00:00 do dia de hoje).
 */
export function isDateOverdue(deliveryDateStr?: string | null, isReady = false): boolean {
  if (isReady || !deliveryDateStr) return false;

  const deliveryDate = parseLocalDate(deliveryDateStr);
  if (!deliveryDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deliveryDate.setHours(0, 0, 0, 0);

  return deliveryDate.getTime() < today.getTime();
}

/**
 * Calcula a quantidade de dias até a entrega (positivo = futuro, negativo = atrasado, 0 = hoje).
 */
export function getDaysDifference(deliveryDateStr?: string | null): number | undefined {
  const deliveryDate = parseLocalDate(deliveryDateStr);
  if (!deliveryDate) return undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deliveryDate.setHours(0, 0, 0, 0);

  return Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula todas as métricas analíticas e estatísticas do dashboard.
 */
export function calculateDashboardStats(
  orders: OrderWithItems[],
  summary?: DashboardSummary | null
): DashboardStats {
  const validOrders = Array.isArray(orders) ? orders : [];
  const today = new Date();
  // Pedidos prontos aguardando envio/retirada na expedição
  const waitingShipmentOrders = validOrders.filter(
    (order) => order.pronto && !order.expedicao
  ).length;

  if (summary) {
    return {
      totalOrders: summary.total ?? 0,
      pendingOrders: summary.pendentes ?? 0,
      completedOrders: summary.concluidos ?? 0,
      urgentOrders: summary.urgentes ?? 0,
      overdueOrders: summary.atrasados ?? 0,
      avgProductionTime: summary.avg_production_time ?? 0,
      avgDelayTime: summary.avg_delay_time ?? 0,
      todayOrders: summary.hoje ?? 0,
      completedTodayOrders: summary.concluidos_hoje ?? 0,
      efficiencyRate: summary.efficiency_rate ?? 0,
      waitingShipmentOrders,
      shippingMethods: summary.shipping_methods || [],
    };
  }

  const totalOrders = validOrders.length;
  const pendingOrders = validOrders.filter((order) => !order.pronto).length;
  const completedOrders = validOrders.filter((order) => order.pronto).length;
  const urgentOrders = validOrders.filter((order) => order.prioridade === 'ALTA' && !order.pronto).length;

  const overdueOrders = validOrders.filter((order) => isDateOverdue(order.data_entrega, order.pronto)).length;

  // Tempo médio de produção (pedidos concluídos com datas válidas)
  const completedWithDates = validOrders.filter(
    (order) => order.pronto && (order.data_entrada || order.created_at)
  );

  let totalProductionTime = 0;
  completedWithDates.forEach((order) => {
    const startDate = parseLocalDate(order.data_entrada || order.created_at);
    const endDate = order.updated_at ? new Date(order.updated_at) : new Date();
    if (startDate) {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) totalProductionTime += days;
    }
  });

  const avgProductionTime =
    completedWithDates.length > 0 ? Math.round(totalProductionTime / completedWithDates.length) : 0;

  // Tempo médio de atraso para pedidos atrasados
  const overdueOrdersList = validOrders.filter((order) => isDateOverdue(order.data_entrega, order.pronto));
  let totalDelayDays = 0;

  overdueOrdersList.forEach((order) => {
    const deliveryDate = parseLocalDate(order.data_entrega);
    if (deliveryDate) {
      deliveryDate.setHours(0, 0, 0, 0);
      const delay = Math.ceil((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
      if (delay > 0) totalDelayDays += delay;
    }
  });

  const avgDelayTime =
    overdueOrdersList.length > 0 ? Math.round(totalDelayDays / overdueOrdersList.length) : 0;

  // Pedidos de hoje
  const todayOrders = validOrders.filter((order) => isDateToday(order.data_entrada || order.created_at)).length;
  const completedTodayOrders = validOrders.filter((order) => order.pronto && isDateToday(order.updated_at)).length;

  // Taxa de eficiência (entregas dentro do prazo)
  const onTimeOrders = validOrders.filter((order) => {
    if (!order.pronto || !order.data_entrega) return false;
    const deliveryDate = parseLocalDate(order.data_entrega);
    if (!deliveryDate) return false;
    deliveryDate.setHours(23, 59, 59, 999);
    const completedDate = order.updated_at ? new Date(order.updated_at) : new Date();
    return completedDate <= deliveryDate;
  }).length;

  const efficiencyRate =
    completedOrders > 0 ? Math.round((onTimeOrders / completedOrders) * 100) : 0;

  // Formas de envio
  const shippingCounts: Record<string, number> = {};
  validOrders.forEach((order) => {
    const method = (order.forma_envio || 'Não especificado').trim();
    shippingCounts[method] = (shippingCounts[method] || 0) + 1;
  });

  const shippingMethods = Object.entries(shippingCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    urgentOrders,
    overdueOrders,
    avgProductionTime,
    avgDelayTime,
    todayOrders,
    completedTodayOrders,
    efficiencyRate,
    waitingShipmentOrders,
    shippingMethods,
  };
}

/**
 * Calcula a eficiência por etapa do fluxo de produção.
 */
export function calculateProductionEfficiency(
  orders: OrderWithItems[],
  summary?: DashboardSummary | null
): ProductionEfficiency {
  if (summary?.production_efficiency) {
    const eff = summary.production_efficiency;
    return {
      financeiro: Math.round(eff.financeiro ?? 0),
      conferencia: Math.round(eff.conferencia ?? 0),
      sublimacao: Math.round(eff.sublimacao ?? 0),
      costura: Math.round(eff.costura ?? 0),
      expedicao: Math.round(eff.expedicao ?? 0),
    };
  }

  const validOrders = Array.isArray(orders) ? orders : [];
  const total = Math.max(validOrders.length, 1);

  return {
    financeiro: Math.round((validOrders.filter((o) => o.financeiro).length / total) * 100),
    conferencia: Math.round((validOrders.filter((o) => o.conferencia).length / total) * 100),
    sublimacao: Math.round((validOrders.filter((o) => o.sublimacao).length / total) * 100),
    costura: Math.round((validOrders.filter((o) => o.costura).length / total) * 100),
    expedicao: Math.round((validOrders.filter((o) => o.expedicao).length / total) * 100),
  };
}

/**
 * Calcula o número de pedidos que estão atualmente em cada etapa física/operacional.
 */
export function calculateProductionStageCounts(orders: OrderWithItems[]): ProductionStageCounts {
  const validOrders = Array.isArray(orders) ? orders : [];

  return {
    financeiro: validOrders.filter((o) => o.financeiro && !o.conferencia && !o.pronto).length,
    conferencia: validOrders.filter((o) => o.conferencia && !o.sublimacao && !o.pronto).length,
    sublimacao: validOrders.filter((o) => o.sublimacao && !o.costura && !o.pronto).length,
    costura: validOrders.filter((o) => o.costura && !o.expedicao && !o.pronto).length,
    expedicao: validOrders.filter((o) => o.expedicao && !o.pronto).length,
    pronto: validOrders.filter((o) => o.pronto).length,
  };
}
