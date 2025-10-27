import {
  OrderStatus,
  OrderWithItems,
  ReportGroup,
  ReportRequestPayload,
  ReportResponse,
  ReportTotals,
} from '@/types';

type NormalizedRow = {
  orderId: number;
  ficha: string;
  cliente: string;
  designer: string;
  tipo: string;
  formaEnvio: string;
  data: string;
  dataLabel: string;
  descricao: string;
  valorFrete: number;
  valorServico: number;
};

const REPORT_TITLES: Record<string, string> = {
  analitico_designer_cliente: 'Relatório Analítico — Designer × Cliente',
  analitico_cliente_designer: 'Relatório Analítico — Cliente × Designer',
  analitico_cliente_painel: 'Relatório Analítico — Cliente × Tipo de Produção',
  analitico_designer_painel: 'Relatório Analítico — Designer × Tipo de Produção',
  analitico_entrega_painel: 'Relatório Analítico — Forma de Entrega × Tipo de Produção',
  sintetico_data: 'Relatório Sintético — Totais por Data',
  sintetico_designer: 'Relatório Sintético — Totais por Designer',
  sintetico_cliente: 'Relatório Sintético — Totais por Cliente',
  sintetico_entrega: 'Relatório Sintético — Totais por Forma de Entrega',
};

const STATUS_FILTER_LABEL: Record<string, string> = {
  Todos: 'Todos',
  [OrderStatus.Pendente]: 'Pendente',
  [OrderStatus.EmProcessamento]: 'Em Processamento',
  [OrderStatus.Concluido]: 'Concluído',
  [OrderStatus.Cancelado]: 'Cancelado',
};

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const parseCurrency = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundCurrency(value) : 0;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    const sanitised = trimmed.includes(',')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed;
    const numeric = Number.parseFloat(sanitised);
    return Number.isFinite(numeric) ? roundCurrency(numeric) : 0;
  }
  return 0;
};

const getSubtotalValue = (orderItem: OrderWithItems['items'][number]): number => {
  if (typeof orderItem.subtotal === 'number' && Number.isFinite(orderItem.subtotal)) {
    return roundCurrency(orderItem.subtotal);
  }
  if (typeof orderItem.quantity === 'number' && typeof orderItem.unit_price === 'number') {
    return roundCurrency(orderItem.quantity * orderItem.unit_price);
  }
  return parseCurrency(orderItem.valor_unitario);
};

const safeLabel = (value: string | null | undefined, fallback: string): string => {
  const trimmed = (value ?? '').toString().trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const formatDateLabel = (value: string | null | undefined): string => {
  if (!value) {
    return 'Sem data';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sem data';
  }
  return date.toLocaleDateString('pt-BR');
};

const slugify = (value: string): string =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'grupo';

const computeTotalsFromRows = (rows: NormalizedRow[]): ReportTotals =>
  rows.reduce<ReportTotals>(
    (acc, row) => ({
      valor_frete: roundCurrency(acc.valor_frete + row.valorFrete),
      valor_servico: roundCurrency(acc.valor_servico + row.valorServico),
    }),
    { valor_frete: 0, valor_servico: 0 },
  );

const convertRowsToReportRows = (rows: NormalizedRow[]) =>
  rows.map((row) => ({
    ficha: row.ficha,
    descricao: row.descricao,
    valor_frete: roundCurrency(row.valorFrete),
    valor_servico: roundCurrency(row.valorServico),
  }));

const createLeafGroup = (label: string, key: string, rows: NormalizedRow[]): ReportGroup => ({
  key,
  label,
  rows: convertRowsToReportRows(rows),
  subtotal: computeTotalsFromRows(rows),
});

const createAggregateGroupRow = (
  label: string,
  key: string,
  rows: NormalizedRow[],
  description: string,
): ReportGroup => {
  const totals = computeTotalsFromRows(rows);
  return {
    key,
    label,
    rows: [
      {
        ficha: description,
        descricao: 'Subtotal',
        valor_frete: totals.valor_frete,
        valor_servico: totals.valor_servico,
      },
    ],
    subtotal: totals,
  };
};

const splitFrete = (totalFrete: number, itemsLength: number): number[] => {
  if (itemsLength <= 0) {
    return [];
  }
  const totalCents = Math.round(totalFrete * 100);
  const baseShare = Math.floor(totalCents / itemsLength);
  const remainder = totalCents - baseShare * itemsLength;
  const shares: number[] = [];
  for (let index = 0; index < itemsLength; index += 1) {
    const extraCent = index < remainder ? 1 : 0;
    shares.push((baseShare + extraCent) / 100);
  }
  return shares;
};

const buildRowsFromOrder = (order: OrderWithItems): NormalizedRow[] => {
  const items = order.items ?? [];
  const cliente = safeLabel(order.cliente ?? order.customer_name, 'Cliente não informado');
  const formaEnvio = safeLabel(order.forma_envio, 'Sem forma de envio');
  const ordemDataRef = order.data_entrega ?? order.data_entrada ?? null;
  const dataLabel = formatDateLabel(ordemDataRef);
  const valorFreteTotal = parseCurrency(order.valor_frete ?? 0);

  if (items.length === 0) {
    const totalServico = roundCurrency(parseCurrency(order.total_value ?? 0) - valorFreteTotal);
    return [
      {
        orderId: order.id,
        ficha: order.numero ?? order.id.toString(),
        cliente,
        designer: 'Sem designer',
        tipo: 'Sem tipo',
        formaEnvio,
        data: ordemDataRef ?? '',
        dataLabel,
        descricao: 'Pedido sem itens',
        valorFrete: valorFreteTotal,
        valorServico: totalServico,
      },
    ];
  }

  const freteShares = splitFrete(valorFreteTotal, items.length);

  return items.map((item, index) => {
    const designer = safeLabel(item.designer, 'Sem designer');
    const tipo = safeLabel(item.tipo_producao, 'Sem tipo');
    const descricao = safeLabel(item.descricao ?? item.item_name, 'Item sem descrição');
    const valorServico = getSubtotalValue(item);
    const valorFrete = freteShares[index] ?? 0;

    return {
      orderId: order.id,
      ficha: order.numero ?? order.id.toString(),
      cliente,
      designer,
      tipo,
      formaEnvio,
      data: ordemDataRef ?? '',
      dataLabel,
      descricao,
      valorFrete,
      valorServico,
    };
  });
};

const buildTwoLevelGroups = (
  rows: NormalizedRow[],
  getTopKey: (row: NormalizedRow) => string,
  getTopLabel: (key: string) => string,
  getSubKey: (row: NormalizedRow) => string,
  getSubLabel: (key: string) => string,
): ReportGroup[] => {
  const topMap = new Map<string, Map<string, NormalizedRow[]>>();

  rows.forEach((row) => {
    const topKey = getTopKey(row);
    const subKey = getSubKey(row);

    if (!topMap.has(topKey)) {
      topMap.set(topKey, new Map());
    }
    const subMap = topMap.get(topKey)!;
    if (!subMap.has(subKey)) {
      subMap.set(subKey, []);
    }
    subMap.get(subKey)!.push(row);
  });

  return Array.from(topMap.entries())
    .sort((a, b) => getTopLabel(a[0]).localeCompare(getTopLabel(b[0]), 'pt-BR'))
    .map(([topKey, subMap]) => {
      const subgroups = Array.from(subMap.entries())
        .sort((a, b) => getSubLabel(a[0]).localeCompare(getSubLabel(b[0]), 'pt-BR'))
        .map(([subKey, subRows]) => createLeafGroup(getSubLabel(subKey), slugify(`${topKey}-${subKey}`), subRows));
      const subtotal = subgroups.reduce<ReportTotals>(
        (acc, group) => ({
          valor_frete: roundCurrency(acc.valor_frete + group.subtotal.valor_frete),
          valor_servico: roundCurrency(acc.valor_servico + group.subtotal.valor_servico),
        }),
        { valor_frete: 0, valor_servico: 0 },
      );

      return {
        key: slugify(topKey),
        label: getTopLabel(topKey),
        subgroups,
        subtotal,
      };
    });
};

const buildSingleLevelAggregate = (
  rows: NormalizedRow[],
  getKey: (row: NormalizedRow) => string,
  getLabel: (key: string) => string,
): ReportGroup[] => {
  const map = new Map<string, NormalizedRow[]>();

  rows.forEach((row) => {
    const key = getKey(row);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .sort((a, b) => getLabel(a[0]).localeCompare(getLabel(b[0]), 'pt-BR'))
    .map(([key, groupRows]) => {
      const uniqueOrders = new Set(groupRows.map((row) => row.orderId));
      const description = `Pedidos: ${uniqueOrders.size} · Itens: ${groupRows.length}`;
      return createAggregateGroupRow(getLabel(key), slugify(key), groupRows, description);
    });
};

const filterOrdersByStatus = (orders: OrderWithItems[], statusFilter?: string) => {
  if (!statusFilter || statusFilter === 'Todos') {
    return orders;
  }
  return orders.filter((order) => order.status === statusFilter);
};

const filterOrdersByDate = (orders: OrderWithItems[], startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) {
    return orders;
  }

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  return orders.filter((order) => {
    const referenceDate = order.data_entrega ?? order.data_entrada ?? order.created_at ?? null;
    if (!referenceDate) {
      return true;
    }
    const current = new Date(referenceDate);
    if (Number.isNaN(current.getTime())) {
      return true;
    }
    if (start && current < start) return false;
    if (end) {
      const adjustedEnd = new Date(end);
      adjustedEnd.setHours(23, 59, 59, 999);
      if (current > adjustedEnd) return false;
    }
    return true;
  });
};

const buildPeriodLabel = (startDate?: string, endDate?: string): string => {
  if (startDate && endDate) {
    if (startDate === endDate) {
      return `Período: ${formatDateLabel(startDate)}`;
    }
    return `Período: ${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
  }
  if (startDate) {
    return `Período a partir de ${formatDateLabel(startDate)}`;
  }
  if (endDate) {
    return `Período até ${formatDateLabel(endDate)}`;
  }
  return 'Período não especificado';
};

export const generateFechamentoReport = (
  orders: OrderWithItems[],
  payload: ReportRequestPayload,
): ReportResponse => {
  const filteredByStatus = filterOrdersByStatus(orders, payload.status);
  const filteredOrders = filterOrdersByDate(filteredByStatus, payload.start_date, payload.end_date);

  const baseRows = filteredOrders.flatMap((order) => buildRowsFromOrder(order));
  const totals = computeTotalsFromRows(baseRows);

  const reportType = payload.report_type;
  const groups: ReportGroup[] = (() => {
    switch (reportType) {
      case 'analitico_designer_cliente':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
        );
      case 'analitico_cliente_designer':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
        );
      case 'analitico_cliente_painel':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
          (row) => row.tipo,
          (value) => `Tipo: ${value}`,
        );
      case 'analitico_designer_painel':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          (row) => row.tipo,
          (value) => `Tipo: ${value}`,
        );
      case 'analitico_entrega_painel':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.formaEnvio,
          (value) => `Entrega: ${value}`,
          (row) => row.tipo,
          (value) => `Tipo: ${value}`,
        );
      case 'sintetico_data':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.dataLabel,
          (value) => `Data: ${value}`,
        );
      case 'sintetico_designer':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
        );
      case 'sintetico_cliente':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
        );
      case 'sintetico_entrega':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.formaEnvio,
          (value) => `Entrega: ${value}`,
        );
      default:
        return [];
    }
  })();

  const statusLabelRaw = payload.status ?? 'Todos';
  const statusLabel = STATUS_FILTER_LABEL[statusLabelRaw] ?? statusLabelRaw;

  return {
    title: REPORT_TITLES[reportType] ?? 'Relatório de Fechamentos',
    period_label: buildPeriodLabel(payload.start_date, payload.end_date),
    status_label: `Status: ${statusLabel}`,
    page: 1,
    generated_at: new Date().toLocaleString('pt-BR'),
    report_type: reportType,
    groups,
    total: totals,
  };
};
