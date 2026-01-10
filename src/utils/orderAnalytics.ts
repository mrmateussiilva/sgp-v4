import {
  OrderWithItems,
  AnalyticsResponse,
  AnalyticsSummary,
  AnalyticsLeaderboardEntry,
  AnalyticsTopProduct,
  AnalyticsTrendPoint,
  AnalyticsFilters,
} from '@/types';

/**
 * Parse currency value (reutiliza lógica do fechamentoReport)
 */
const parseCurrency = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    let normalized = trimmed;
    if (trimmed.includes(',') && trimmed.includes('.')) {
      normalized = trimmed.replace(/\./g, '').replace(',', '.');
    } else if (trimmed.includes(',')) {
      normalized = trimmed.replace(',', '.');
    }
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
  }
  return 0;
};

/**
 * Normaliza data para comparação (remove hora)
 */
const normalizeDate = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date;
  } catch {
    return null;
  }
};

/**
 * Verifica se uma data está dentro do intervalo
 */
const isDateInRange = (
  date: Date | null,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): boolean => {
  // Se não há filtros de data, inclui todos os pedidos (mesmo sem data)
  if (!startDate && !endDate) return true;
  
  // Se o pedido não tem data mas há filtros, exclui
  if (!date) return false;

  const start = startDate ? normalizeDate(startDate) : null;
  const end = endDate ? normalizeDate(endDate) : null;

  // Comparar apenas as datas (sem hora)
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (start) {
    const startOnly = new Date(start);
    startOnly.setHours(0, 0, 0, 0);
    if (dateOnly < startOnly) return false;
  }
  
  if (end) {
    const endOnly = new Date(end);
    endOnly.setHours(0, 0, 0, 0);
    if (dateOnly > endOnly) return false;
  }

  return true;
};

/**
 * Filtra pedidos conforme os filtros de analytics
 */
const filterOrders = (
  orders: OrderWithItems[],
  filters: AnalyticsFilters,
  vendedorNameMap?: Map<number, string>,
  designerNameMap?: Map<number, string>,
): OrderWithItems[] => {
  return orders.filter((order) => {
    // Filtro por vendedor (mapear ID para nome)
    if (filters.vendedor_id && vendedorNameMap) {
      const vendedorName = vendedorNameMap.get(filters.vendedor_id);
      if (vendedorName) {
        const hasVendedor = order.items.some(
          (item) => item.vendedor && item.vendedor.trim() === vendedorName.trim(),
        );
        if (!hasVendedor) return false;
      } else {
        // Se não encontrou o nome do vendedor, não passa no filtro
        return false;
      }
    }

    // Filtro por designer (mapear ID para nome)
    if (filters.designer_id && designerNameMap) {
      const designerName = designerNameMap.get(filters.designer_id);
      if (designerName) {
        const hasDesigner = order.items.some(
          (item) => item.designer && item.designer.trim() === designerName.trim(),
        );
        if (!hasDesigner) return false;
      } else {
        // Se não encontrou o nome do designer, não passa no filtro
        return false;
      }
    }

    // Filtro por tipo de produto
    if (filters.product_type) {
      const hasProductType = order.items.some(
        (item) => item.tipo_producao === filters.product_type,
      );
      if (!hasProductType) return false;
    }

    // Filtro por data (usa data_entrega, com fallback para data_entrada)
    const orderDate = normalizeDate(order.data_entrega || order.data_entrada);
    if (!isDateInRange(orderDate, filters.date_from, filters.date_to)) {
      return false;
    }

    return true;
  });
};

/**
 * Calcula o valor total de um pedido
 */
const calculateOrderValue = (order: OrderWithItems): number => {
  const totalValue = parseCurrency(order.total_value || order.valor_total || 0);
  if (totalValue > 0) return totalValue;

  // Se não tem total_value, calcula a partir dos itens
  const itemsSum = order.items.reduce((sum, item) => {
    const subtotal = parseCurrency(item.subtotal || 0);
    if (subtotal > 0) return sum + subtotal;

    // Tenta calcular: quantity * unit_price
    const qty = typeof item.quantity === 'number' ? item.quantity : 1;
    const price = parseCurrency(item.unit_price || item.valor_unitario || 0);
    return sum + qty * price;
  }, 0);

  const frete = parseCurrency(order.valor_frete || 0);
  return itemsSum + frete;
};

/**
 * Calcula o resumo de analytics
 */
const calculateSummary = (filteredOrders: OrderWithItems[]): AnalyticsSummary => {
  if (filteredOrders.length === 0) {
    return {
      total_orders: 0,
      total_items_produced: 0,
      total_revenue: 0,
      average_ticket: 0,
    };
  }

  const totalOrders = filteredOrders.length;
  const totalItems = filteredOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0),
    0,
  );
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + calculateOrderValue(order), 0);
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    total_orders: totalOrders,
    total_items_produced: totalItems,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    average_ticket: Math.round(averageTicket * 100) / 100,
  };
};

/**
 * Calcula top vendedores
 */
const calculateTopSellers = (
  filteredOrders: OrderWithItems[],
  limit: number = 5,
): AnalyticsLeaderboardEntry[] => {
  const sellerMap = new Map<string, { count: number; revenue: number }>();

  filteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      const vendedor = item.vendedor || 'Sem vendedor';
      const itemValue =
        parseCurrency(item.subtotal) ||
        (item.quantity || 1) * parseCurrency(item.unit_price || item.valor_unitario || 0);

      if (!sellerMap.has(vendedor)) {
        sellerMap.set(vendedor, { count: 0, revenue: 0 });
      }
      const current = sellerMap.get(vendedor)!;
      sellerMap.set(vendedor, {
        count: current.count + 1,
        revenue: current.revenue + itemValue,
      });
    });
  });

  return Array.from(sellerMap.entries())
    .map(([name, data], index) => ({
      id: index + 1,
      name,
      value: data.count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

/**
 * Calcula top designers
 */
const calculateTopDesigners = (
  filteredOrders: OrderWithItems[],
  limit: number = 5,
): AnalyticsLeaderboardEntry[] => {
  const designerMap = new Map<string, { count: number; revenue: number }>();

  filteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      const designer = item.designer || 'Sem designer';
      const itemValue =
        parseCurrency(item.subtotal) ||
        (item.quantity || 1) * parseCurrency(item.unit_price || item.valor_unitario || 0);

      if (!designerMap.has(designer)) {
        designerMap.set(designer, { count: 0, revenue: 0 });
      }
      const current = designerMap.get(designer)!;
      designerMap.set(designer, {
        count: current.count + 1,
        revenue: current.revenue + itemValue,
      });
    });
  });

  return Array.from(designerMap.entries())
    .map(([name, data], index) => ({
      id: index + 1,
      name,
      value: data.count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

/**
 * Calcula top produtos (tipos de produção)
 */
const calculateTopProducts = (
  filteredOrders: OrderWithItems[],
  limit: number = 5,
): AnalyticsTopProduct[] => {
  const productMap = new Map<string, number>();

  filteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      const productName = item.tipo_producao || item.item_name || 'Sem tipo';
      const quantity = item.quantity || 1;

      if (!productMap.has(productName)) {
        productMap.set(productName, 0);
      }
      productMap.set(productName, productMap.get(productName)! + quantity);
    });
  });

  return Array.from(productMap.entries())
    .map(([name, quantity], index) => ({
      product_id: index + 1,
      product_name: name,
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
};

/**
 * Agrupa pedidos por período (mensal, semanal ou diário)
 */
const groupByPeriod = (
  filteredOrders: OrderWithItems[],
  period: 'month' | 'week' | 'day' = 'month',
): Map<string, { orders: OrderWithItems[]; revenue: number }> => {
  const periodMap = new Map<string, { orders: OrderWithItems[]; revenue: number }>();

  filteredOrders.forEach((order) => {
    const orderDate = normalizeDate(order.data_entrega || order.data_entrada);
    if (!orderDate) return;

    let periodKey: string;
    if (period === 'month') {
      periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
    } else if (period === 'week') {
      const weekStart = new Date(orderDate);
      weekStart.setDate(orderDate.getDate() - orderDate.getDay());
      periodKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + 6) / 7)).padStart(2, '0')}`;
    } else {
      // day
      periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
    }

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, { orders: [], revenue: 0 });
    }
    const periodData = periodMap.get(periodKey)!;
    periodData.orders.push(order);
    periodData.revenue += calculateOrderValue(order);
  });

  return periodMap;
};

/**
 * Calcula tendências mensais
 */
const calculateMonthlyTrends = (
  filteredOrders: OrderWithItems[],
): AnalyticsTrendPoint[] => {
  const periodMap = groupByPeriod(filteredOrders, 'month');

  return Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      production_volume: data.orders.length,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

/**
 * Obtém tipos de produto disponíveis
 */
const getAvailableProductTypes = (orders: OrderWithItems[]): string[] => {
  const types = new Set<string>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.tipo_producao) {
        types.add(item.tipo_producao);
      }
    });
  });

  return Array.from(types).sort();
};

/**
 * Função principal: calcula analytics a partir de pedidos reais
 */
export const calculateOrderAnalytics = (
  orders: OrderWithItems[],
  filters: AnalyticsFilters,
  vendedorNameMap?: Map<number, string>,
  designerNameMap?: Map<number, string>,
): AnalyticsResponse => {
  const filteredOrders = filterOrders(orders, filters, vendedorNameMap, designerNameMap);

  const summary = calculateSummary(filteredOrders);
  const topProducts = calculateTopProducts(filteredOrders);
  const topSellers = calculateTopSellers(filteredOrders);
  const topDesigners = calculateTopDesigners(filteredOrders);
  const monthlyTrends = calculateMonthlyTrends(filteredOrders);
  const availableProductTypes = getAvailableProductTypes(orders);

  return {
    summary,
    top_products: topProducts,
    top_sellers: topSellers,
    top_designers: topDesigners,
    monthly_trends: monthlyTrends,
    available_product_types: availableProductTypes,
    last_updated: new Date().toISOString(),
  };
};
