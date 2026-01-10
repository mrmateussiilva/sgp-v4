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
  vendedor: string;
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
  sintetico_data: 'Relatório Sintético — Totais por Data (referência automática)',
  sintetico_data_entrada: 'Relatório Sintético — Totais por Data de Entrada',
  sintetico_data_entrega: 'Relatório Sintético — Totais por Data de Entrega',
  sintetico_designer: 'Relatório Sintético — Totais por Designer',
  sintetico_vendedor: 'Relatório Sintético — Totais por Vendedor',
  sintetico_vendedor_designer: 'Relatório Sintético — Totais por Vendedor/Designer',
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
    let normalized = trimmed;
    if (trimmed.includes(',') && trimmed.includes('.')) {
      normalized = trimmed.replace(/\./g, '').replace(',', '.');
    } else if (trimmed.includes(',')) {
      normalized = trimmed.replace(',', '.');
    }
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? roundCurrency(numeric) : 0;
  }
  return 0;
};

/**
 * Calcula o valor do subtotal de um item de pedido.
 * Tenta múltiplos métodos em ordem de prioridade para garantir o cálculo correto.
 * 
 * @param orderItem - Item do pedido
 * @returns Valor do subtotal calculado (arredondado para 2 casas decimais)
 */
const getSubtotalValue = (orderItem: OrderWithItems['items'][number]): number => {
  // Prioridade 1: Tentar subtotal direto
  if (typeof orderItem.subtotal === 'number' && Number.isFinite(orderItem.subtotal)) {
    if (orderItem.subtotal >= 0) {
      return roundCurrency(orderItem.subtotal);
    }
    console.warn('[fechamentoReport] Subtotal negativo encontrado para item:', {
      item_id: orderItem.id,
      subtotal: orderItem.subtotal,
    });
  }
  
  // Prioridade 2: Calcular a partir de quantity * unit_price
  if (typeof orderItem.quantity === 'number' && typeof orderItem.unit_price === 'number') {
    if (orderItem.quantity > 0 && orderItem.unit_price >= 0) {
      return roundCurrency(orderItem.quantity * orderItem.unit_price);
    }
    console.warn('[fechamentoReport] Quantidade ou preço inválido para item:', {
      item_id: orderItem.id,
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
    });
  }
  
  // Prioridade 3: Tentar parsear string
  const parsed = parseCurrency(orderItem.valor_unitario);
  if (parsed > 0) {
    return parsed;
  }
  
  // Fallback: logar erro e retornar 0
  console.error('[fechamentoReport] Não foi possível calcular subtotal para item:', {
    item_id: orderItem.id,
    subtotal: orderItem.subtotal,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    valor_unitario: orderItem.valor_unitario,
  });
  return 0;
};

const safeLabel = (value: string | null | undefined, fallback: string): string => {
  const trimmed = (value ?? '').toString().trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY)
 * Corrigido para não ter problemas de timezone
 */
const formatDateLabel = (value: string | null | undefined): string => {
  if (!value) {
    return 'Sem data';
  }
  
  // Extrair apenas a parte da data (YYYY-MM-DD)
  const dateOnly = extractDateOnly(value);
  if (!dateOnly) {
    return 'Sem data';
  }
  
  // Formatar diretamente sem usar Date para evitar timezone
  const [year, month, day] = dateOnly.split('-');
  return `${day}/${month}/${year}`;
};

const slugify = (value: string): string =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'grupo';

const computeTotalsFromRows = (rows: NormalizedRow[]): ReportTotals => {
  // Agrupar por orderId para contar frete apenas uma vez por pedido
  const fretePorPedido = new Map<number, number>();
  let totalServico = 0;

  rows.forEach((row) => {
    // Serviços: somar todos (por item)
    totalServico = roundCurrency(totalServico + row.valorServico);
    
    // Frete: contar apenas uma vez por pedido (usar o primeiro valor encontrado)
    if (!fretePorPedido.has(row.orderId)) {
      fretePorPedido.set(row.orderId, row.valorFrete);
    }
  });

  // Somar fretes únicos de cada pedido
  const totalFrete = Array.from(fretePorPedido.values()).reduce(
    (sum, frete) => roundCurrency(sum + frete),
    0
  );

  return {
    valor_frete: totalFrete,
    valor_servico: totalServico,
  };
};

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

// Função removida: splitFrete não é mais necessária
// O frete é por pedido e não deve ser dividido entre itens
// Cada item mostra o frete total do pedido

type DateReferenceMode = 'entrada' | 'entrega' | 'auto';

// ============================================================================
// FUNÇÕES AUXILIARES PARA TRABALHAR COM DATAS SEM PROBLEMAS DE TIMEZONE
// ============================================================================

/**
 * Cria uma data local a partir de uma string no formato YYYY-MM-DD
 * Evita problemas de timezone usando o construtor Date local
 */
const createDateFromString = (dateString: string): Date => {
  // Se a string já está no formato YYYY-MM-DD, cria data local direto
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));
  }
  // Fallback: tenta parsear normalmente
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data inválida: ${dateString}`);
  }
  return date;
};

/**
 * Normaliza uma data para meia-noite local (00:00:00.000)
 * Isso garante comparações apenas por dia, sem considerar horas
 */
const normalizeDateToMidnight = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * Extrai apenas a parte da data (YYYY-MM-DD) de uma string
 * Útil para normalizar datas que podem vir com hora/timezone
 */
const extractDateOnly = (dateString: string): string => {
  // Se já está no formato YYYY-MM-DD, retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Tenta extrair YYYY-MM-DD do início da string
  const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  
  // Fallback: parseia e extrai
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getOrderReferenceDate = (
  order: OrderWithItems,
  mode: DateReferenceMode,
): string | null => {
  if (mode === 'entrada') {
    return order.data_entrada ?? null;
  }
  if (mode === 'entrega') {
    return order.data_entrega ?? null;
  }
  // modo automático preserva o comportamento antigo
  return order.data_entrega ?? order.data_entrada ?? order.created_at ?? null;
};

const buildRowsFromOrder = (order: OrderWithItems, dateMode: DateReferenceMode): NormalizedRow[] => {
  const items = order.items ?? [];
  const cliente = safeLabel(order.cliente ?? order.customer_name, 'Cliente não informado');
  const formaEnvio = safeLabel(order.forma_envio, 'Sem forma de envio');
  const ordemDataRef = getOrderReferenceDate(order, dateMode);
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
        vendedor: 'Sem vendedor',
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

  // Frete é por pedido, não divide entre itens
  // Cada item mostra o frete TOTAL do pedido

  return items.map((item) => {
    const designer = safeLabel(item.designer, 'Sem designer');
    const vendedor = safeLabel(item.vendedor, 'Sem vendedor');
    const tipo = safeLabel(item.tipo_producao, 'Sem tipo');
    const descricao = safeLabel(item.descricao ?? item.item_name, 'Item sem descrição');
    const valorServico = getSubtotalValue(item);
    // Cada item mostra o frete TOTAL do pedido (não dividido)
    const valorFrete = valorFreteTotal;

    return {
      orderId: order.id,
      ficha: order.numero ?? order.id.toString(),
      cliente,
      designer,
      vendedor,
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

/**
 * Filtra pedidos por intervalo de datas
 * Corrigido para:
 * 1. Receber e usar o dateMode correto
 * 2. Evitar problemas de timezone usando datas locais
 * 3. Comparar apenas por dia, não por hora
 */
const filterOrdersByDate = (
  orders: OrderWithItems[],
  startDate?: string,
  endDate?: string,
  dateMode: DateReferenceMode = 'auto'
) => {
  if (!startDate && !endDate) {
    return orders;
  }

  // Criar datas de filtro sem problemas de timezone (usando data local)
  const start = startDate ? normalizeDateToMidnight(createDateFromString(startDate)) : null;
  let end: Date | null = null;
  if (endDate) {
    end = normalizeDateToMidnight(createDateFromString(endDate));
    end.setHours(23, 59, 59, 999); // Final do dia
  }

  return orders.filter((order) => {
    // Usar o dateMode passado como parâmetro
    const referenceDateString = getOrderReferenceDate(order, dateMode);
    if (!referenceDateString) {
      return true;
    }
    
    // Extrair apenas a parte da data e criar data local normalizada
    const dateOnly = extractDateOnly(referenceDateString);
    if (!dateOnly) {
      return true;
    }
    
    let current: Date;
    try {
      current = normalizeDateToMidnight(createDateFromString(dateOnly));
    } catch {
      return true; // Se não conseguir parsear, mantém o pedido
    }
    
    if (Number.isNaN(current.getTime())) {
      return true;
    }
    
    // Comparações usando datas normalizadas (apenas dia, sem hora/timezone)
    if (start && current < start) return false;
    if (end && current > end) return false;
    return true;
  });
};

const normalizeFilterText = (value?: string): string => {
  if (!value) return '';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const filterRowsByPeople = (
  rows: NormalizedRow[],
  payload: ReportRequestPayload,
): NormalizedRow[] => {
  const vendedorFilter = normalizeFilterText(payload.vendedor);
  const designerFilter = normalizeFilterText(payload.designer);

  if (!vendedorFilter && !designerFilter) {
    return rows;
  }

  return rows.filter((row) => {
    const rowVendedor = normalizeFilterText(row.vendedor);
    const rowDesigner = normalizeFilterText(row.designer);

    if (vendedorFilter && !rowVendedor.includes(vendedorFilter)) {
      return false;
    }
    if (designerFilter && !rowDesigner.includes(designerFilter)) {
      return false;
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
  const dateMode: DateReferenceMode =
    payload.date_mode === 'entrada' || payload.date_mode === 'entrega'
      ? payload.date_mode
      : 'auto';

  const filteredByStatus = filterOrdersByStatus(orders, payload.status);
  const filteredOrders = filterOrdersByDate(
    filteredByStatus,
    payload.start_date,
    payload.end_date,
    dateMode // ✅ Passa o dateMode para o filtro
  );

  const baseRowsAll = filteredOrders.flatMap((order) => buildRowsFromOrder(order, dateMode));
  const baseRows = filterRowsByPeople(baseRowsAll, payload);
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
        // Mantém o comportamento antigo (referência automática) para compatibilidade
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.dataLabel,
          (value) => `Data: ${value}`,
        );
      case 'sintetico_data_entrada':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.dataLabel,
          (value) => `Data de Entrada: ${value}`,
        );
      case 'sintetico_data_entrega':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.dataLabel,
          (value) => `Data de Entrega: ${value}`,
        );
      case 'sintetico_designer':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
        );
      case 'sintetico_vendedor':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.vendedor,
          (value) => `Vendedor: ${value}`,
        );
      case 'sintetico_vendedor_designer':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => `${row.vendedor} / ${row.designer}`,
          (value) => `Vendedor/Designer: ${value}`,
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
