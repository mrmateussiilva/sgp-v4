import { OrderWithItems, AnalyticsResponse, AnalyticsTrendPoint } from '@/types';

/**
 * Calcula analytics para um período específico
 */
export function calculatePeriodAnalytics(
  orders: OrderWithItems[],
  startDate: Date,
  endDate: Date,
  _filters?: {
    vendedor_id?: number;
    designer_id?: number;
    product_type?: string;
  }
): AnalyticsResponse {
  const filteredOrders = orders.filter((order) => {
    const orderDate = order.data_entrada
      ? new Date(order.data_entrada)
      : order.created_at
        ? new Date(order.created_at)
        : null;

    if (!orderDate) return false;

    // Verificar se está no período
    orderDate.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (orderDate < start || orderDate > end) return false;

    // Aplicar filtros adicionais se fornecidos
    // (implementação simplificada - pode ser expandida)

    return true;
  });

  // Calcular summary
  const totalOrders = filteredOrders.length;
  const totalItems = filteredOrders.reduce(
    (sum, order) => sum + order.items.length,
    0
  );
  const totalRevenue = filteredOrders.reduce((sum, order) => {
    const value = typeof order.total_value === 'string'
      ? parseFloat(order.total_value) || 0
      : order.total_value || 0;
    return sum + value;
  }, 0);
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Calcular top products
  const productMap = new Map<string, number>();
  filteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      const productName = item.tipo_producao || item.item_name || 'Outros';
      const current = productMap.get(productName) || 0;
      productMap.set(productName, current + item.quantity);
    });
  });

  const topProducts = Array.from(productMap.entries())
    .map(([product_name, quantity]) => ({
      product_id: product_name,
      product_name,
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Calcular trends semanais
  const weeklyTrends: AnalyticsTrendPoint[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekOrders = filteredOrders.filter((order) => {
      const orderDate = order.data_entrada
        ? new Date(order.data_entrada)
        : order.created_at
          ? new Date(order.created_at)
          : null;
      if (!orderDate) return false;
      return orderDate >= weekStart && orderDate <= weekEnd;
    });

    const weekRevenue = weekOrders.reduce((sum, order) => {
      const value = typeof order.total_value === 'string'
        ? parseFloat(order.total_value) || 0
        : order.total_value || 0;
      return sum + value;
    }, 0);

    const weekProduction = weekOrders.reduce(
      (sum, order) => sum + order.items.length,
      0
    );

    weeklyTrends.push({
      period: `Semana ${Math.ceil((weekStart.getDate() + 6) / 7)}`,
      production_volume: weekProduction,
      revenue: weekRevenue,
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return {
    summary: {
      total_orders: totalOrders,
      total_items_produced: totalItems,
      total_revenue: totalRevenue,
      average_ticket: averageTicket,
    },
    top_products: topProducts,
    top_sellers: [],
    top_designers: [],
    monthly_trends: weeklyTrends,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Obtém a semana atual (segunda a domingo)
 */
export function getCurrentWeek(): { start: Date; end: Date } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar para segunda-feira

  const start = new Date(today.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Obtém a semana anterior
 */
export function getPreviousWeek(): { start: Date; end: Date } {
  const { start: currentStart } = getCurrentWeek();
  const start = new Date(currentStart);
  start.setDate(start.getDate() - 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Calcula variação percentual
 */
export function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Determina status baseado em variação e valor
 */
export function getStatusFromVariation(
  variation: number,
  thresholdGood: number = 5,
  thresholdBad: number = -5
): 'good' | 'warning' | 'bad' | 'neutral' {
  if (variation >= thresholdGood) return 'good';
  if (variation <= thresholdBad) return 'bad';
  if (variation > 0) return 'warning';
  return 'neutral';
}
