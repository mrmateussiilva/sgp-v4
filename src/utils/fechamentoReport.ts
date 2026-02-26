import {
  OrderStatus,
  OrderWithItems,
  ReportGroup,
  ReportRequestPayload,
  ReportResponse,
  ReportTotals,
} from '@/types';
import { parseMonetary, roundToTwoDecimals } from '@/utils/currency';

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
  analitico_vendedor_designer: 'Relatório Analítico — Vendedor × Designer',
  analitico_designer_vendedor: 'Relatório Analítico — Designer × Vendedor',
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



/**
 * Cache para valores de moeda parseados.
 * Limpa automaticamente quando atinge o tamanho máximo para evitar consumo excessivo de memória.
 */
const currencyCache = new Map<string | number, number>();
const MAX_CACHE_SIZE = 1000;

/**
 * Limpa o cache de parsing de moeda.
 * Útil após processar um lote grande de pedidos.
 */
const clearCurrencyCache = (): void => {
  currencyCache.clear();
};

/**
 * Parseia um valor de moeda com cache para melhor performance.
 * 
 * @param value - Valor a ser parseado (string, number, null, undefined)
 * @returns Valor numérico parseado ou 0 se inválido
 */
const parseCurrencyCached = (value: unknown): number => {
  // Se cache muito grande, limpar para evitar consumo excessivo de memória
  if (currencyCache.size > MAX_CACHE_SIZE) {
    clearCurrencyCache();
  }

  // Criar chave única para o cache
  const key = typeof value === 'string'
    ? value
    : (value !== null && value !== undefined ? String(value) : 'null');

  // Verificar se já está no cache
  if (currencyCache.has(key)) {
    return currencyCache.get(key)!;
  }

  // Parsear o valor usando função centralizada
  const parsed = parseMonetary(value);

  // Armazenar no cache
  currencyCache.set(key, parsed);

  return parsed;
};



/**
 * Calcula o valor do subtotal de um item de pedido.
 * Tenta múltiplos métodos em ordem de prioridade para garantir o cálculo correto.
 * 
 * @param orderItem - Item do pedido
 * @returns Valor do subtotal calculado (arredondado para 2 casas decimais)
 */
const getSubtotalValue = (orderItem: OrderWithItems['items'][number]): number => {
  // 1. Tentar obter a quantidade de forma robusta (mesma lógica da UI)
  const anyItem = orderItem as unknown as Record<string, string | number | undefined>;
  const rawQuantity =
    orderItem.quantity ??
    parseInt(String(anyItem.quantidade_paineis ||
      anyItem.quantidade_mochilinha ||
      anyItem.quantidade_totem ||
      anyItem.quantidade_lona ||
      anyItem.quantidade_adesivo ||
      anyItem.quantidade_canga ||
      anyItem.quantidade_impressao_3d || '1'));

  const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;

  // Prioridade 1: Tentar subtotal direto (se já vier calculado do banco/api e for consistente)
  // Nota: Se o subtotal vier errado do banco, as prioridades seguintes tentarão corrigir.
  if (typeof orderItem.subtotal === 'number' && Number.isFinite(orderItem.subtotal) && orderItem.subtotal > 0) {
    // Verificamos se o subtotal parece correto em relação ao unit_price * quantity
    // Se houver uma discrepância óbvia e tivermos unit_price, preferimos recalcular
    const expectedSubtotal = (orderItem.unit_price ?? 0) * quantity;
    if (expectedSubtotal > 0 && Math.abs(orderItem.subtotal - expectedSubtotal) > 0.01) {
      return roundToTwoDecimals(expectedSubtotal);
    }
    return roundToTwoDecimals(orderItem.subtotal);
  }

  // Prioridade 2: Calcular a partir de quantity * unit_price (campos numéricos)
  if (typeof orderItem.unit_price === 'number' && Number.isFinite(orderItem.unit_price) && orderItem.unit_price >= 0) {
    return roundToTwoDecimals(quantity * orderItem.unit_price);
  }

  // Prioridade 3: Tentar parsear valor_unitario (string) e MULTIPLICAR pela quantidade
  const parsedUnit = parseCurrencyCached(orderItem.valor_unitario);

  if (parsedUnit > 0) {
    const result = roundToTwoDecimals(quantity * parsedUnit);
    return result;
  }

  // Fallback: logar erro e retornar 0
  console.error('[fechamentoReport] Não foi possível calcular subtotal para item:', {
    item_id: orderItem.id,
    subtotal: orderItem.subtotal,
    quantity,
    unit_price: orderItem.unit_price,
    valor_unitario: orderItem.valor_unitario,
  });
  return 0;
};

/**
 * Valida a consistência dos totais de um pedido.
 * Verifica se os valores de frete, itens e total fazem sentido entre si.
 * 
 * @param order - Pedido a ser validado
 * @returns Objeto com validade e lista de problemas encontrados
 */
const validateOrderTotals = (order: OrderWithItems): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  const valorFrete = parseCurrencyCached(order.valor_frete ?? 0);
  const valorTotal = parseCurrencyCached(order.total_value ?? order.valor_total ?? 0);

  // Calcular soma de itens
  const somaItens = (order.items ?? []).reduce((sum, item) => {
    return sum + getSubtotalValue(item);
  }, 0);

  // Validar se total_value faz sentido em relação a somaItens + frete
  // Descontos podem reduzir o total, então permitir diferença
  const expectedMin = somaItens + valorFrete;
  const expectedMax = expectedMin * 1.15; // Permitir até 15% de margem para descontos/arredondamentos

  if (valorTotal < 0) {
    issues.push(`Total do pedido negativo: ${valorTotal.toFixed(2)}`);
  }

  if (valorTotal > expectedMax) {
    issues.push(
      `Total do pedido (${valorTotal.toFixed(2)}) muito maior que soma de itens + frete (${expectedMin.toFixed(2)}). Diferença: ${(valorTotal - expectedMin).toFixed(2)}`
    );
  }

  if (valorFrete < 0) {
    issues.push(`Valor de frete negativo: ${valorFrete.toFixed(2)}`);
  }

  if (somaItens < 0) {
    issues.push(`Soma de itens negativa: ${somaItens.toFixed(2)}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
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

/**
 * Calcula o desconto de um pedido inferindo a partir dos valores.
 * Desconto = (somaItens + frete) - total_value (quando positivo)
 * 
 * @param order - Pedido para calcular desconto
 * @returns Valor do desconto calculado
 */
const calculateOrderDiscount = (order: OrderWithItems): number => {
  const valorFrete = parseCurrencyCached(order.valor_frete ?? 0);
  const valorTotal = parseCurrencyCached(order.total_value ?? order.valor_total ?? 0);

  // Calcular soma de itens
  const somaItens = (order.items ?? []).reduce((sum, item) => {
    return sum + getSubtotalValue(item);
  }, 0);

  // Se não há itens, calcular a partir do total
  if (order.items?.length === 0) {
    const expectedTotal = valorFrete;
    const desconto = Math.max(0, expectedTotal - valorTotal);
    return roundToTwoDecimals(desconto);
  }

  // Desconto = (itens + frete) - total
  const totalBeforeDiscount = somaItens + valorFrete;
  const desconto = Math.max(0, totalBeforeDiscount - valorTotal);

  return roundToTwoDecimals(desconto);
};

/**
 * Calcula os totais de frete, serviço e desconto a partir de linhas normalizadas.
 * 
 * IMPORTANTE sobre frete:
 * - 'por_pedido': O frete é agrupado por orderId para evitar duplicação no total geral,
 *   já que cada item de um pedido pode estar em grupos diferentes no relatório.
 *   Cada item de um pedido repete o valor do frete total, mas no total geral o frete
 *   é contado apenas uma vez por pedido.
 * 
 * - 'proporcional': Quando o frete é distribuído proporcionalmente, cada linha já contém
 *   sua parte proporcional do frete. Nesse caso, somamos todos os valores de frete diretamente,
 *   pois a soma já representa o frete total corretamente.
 * 
 * @param rows - Array de linhas normalizadas (uma linha por item de pedido)
 * @param ordersMap - Mapa opcional de pedidos por ID para calcular desconto (orderId -> OrderWithItems)
 * @param freteDistribution - Modo de distribuição de frete ('por_pedido' ou 'proporcional')
 * @returns Totais de frete, serviço, desconto e valor líquido calculados
 */
const computeTotalsFromRows = (
  rows: NormalizedRow[],
  ordersMap?: Map<number, OrderWithItems>,
  freteDistribution: 'por_pedido' | 'proporcional' | 'proporcional_inteiro' | 'atribuicao_unica' = 'por_pedido'
): ReportTotals => {
  const descontoPorPedido = new Map<number, number>();
  let totalServico = 0;
  let totalFrete = 0;

  if (freteDistribution === 'proporcional' || freteDistribution === 'proporcional_inteiro' || freteDistribution === 'atribuicao_unica') {
    // Quando proporcional ou atribuição única, somar diretamente todos os valores de frete
    // (no proporcional cada linha tem sua fatia, na única apenas uma linha tem o valor cheio)
    rows.forEach((row) => {
      totalServico = roundToTwoDecimals(totalServico + row.valorServico);
      totalFrete = roundToTwoDecimals(totalFrete + row.valorFrete);

      // Calcular desconto apenas uma vez por pedido
      if (!descontoPorPedido.has(row.orderId) && ordersMap) {
        const order = ordersMap.get(row.orderId);
        if (order) {
          const desconto = calculateOrderDiscount(order);
          if (desconto > 0) {
            descontoPorPedido.set(row.orderId, desconto);
          }
        }
      }
    });
  } else {
    // Modo 'por_pedido': agrupar por orderId para contar frete apenas uma vez por pedido
    const fretePorPedido = new Map<number, number>();

    rows.forEach((row) => {
      // Serviços: somar todos (por item)
      totalServico = roundToTwoDecimals(totalServico + row.valorServico);

      // Frete: contar apenas uma vez por pedido (usar o primeiro valor encontrado)
      if (!fretePorPedido.has(row.orderId)) {
        fretePorPedido.set(row.orderId, row.valorFrete);

        // Calcular desconto se ordersMap foi fornecido
        if (ordersMap) {
          const order = ordersMap.get(row.orderId);
          if (order) {
            const desconto = calculateOrderDiscount(order);
            if (desconto > 0) {
              descontoPorPedido.set(row.orderId, desconto);
            }
          }
        }
      }
    });

    // Somar fretes únicos de cada pedido
    totalFrete = Array.from(fretePorPedido.values()).reduce(
      (sum, frete) => roundToTwoDecimals(sum + frete),
      0
    );
  }

  // Somar descontos únicos de cada pedido
  const totalDesconto = Array.from(descontoPorPedido.values()).reduce(
    (sum, desconto) => roundToTwoDecimals(sum + desconto),
    0
  );

  // Calcular valor líquido
  const valorLiquido = roundToTwoDecimals(totalFrete + totalServico - totalDesconto);

  const result: ReportTotals = {
    valor_frete: totalFrete,
    valor_servico: totalServico,
  };

  // Adicionar desconto e valor líquido apenas se houver desconto
  if (totalDesconto > 0) {
    result.desconto = totalDesconto;
    result.valor_liquido = valorLiquido;
  }

  return result;
};

const convertRowsToReportRows = (rows: NormalizedRow[]) =>
  rows.map((row) => ({
    orderId: row.orderId,
    ficha: row.ficha,
    descricao: row.descricao,
    valor_frete: roundToTwoDecimals(row.valorFrete),
    valor_servico: roundToTwoDecimals(row.valorServico),
  }));

const createLeafGroup = (
  label: string,
  key: string,
  rows: NormalizedRow[],
  ordersMap?: Map<number, OrderWithItems>,
  freteDistribution: 'por_pedido' | 'proporcional' | 'proporcional_inteiro' | 'atribuicao_unica' = 'por_pedido'
): ReportGroup => ({
  key,
  label,
  rows: convertRowsToReportRows(rows),
  subtotal: computeTotalsFromRows(rows, ordersMap, freteDistribution),
});

const createAggregateGroupRow = (
  label: string,
  key: string,
  rows: NormalizedRow[],
  description: string,
  ordersMap?: Map<number, OrderWithItems>,
  freteDistribution: 'por_pedido' | 'proporcional' | 'proporcional_inteiro' | 'atribuicao_unica' = 'por_pedido'
): ReportGroup => {
  const totals = computeTotalsFromRows(rows, ordersMap, freteDistribution);
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
  // modo 'auto': usa fallback entrega -> entrada -> created_at
  return order.data_entrega ?? order.data_entrada ?? order.created_at ?? null;
};

/**
 * Converte um pedido em linhas normalizadas para o relatório.
 * Cada item do pedido gera uma linha separada.
 * 
 * O frete pode ser tratado de duas formas:
 * - 'por_pedido' (padrão): O frete é repetido para cada item, já que cada item pode ser 
 *   agrupado de forma diferente no relatório. Isso permite que o frete apareça corretamente 
 *   em cada grupo, mas será deduplicado no total geral pela função computeTotalsFromRows().
 * 
 * - 'proporcional': O frete é distribuído proporcionalmente entre os itens baseado no valor
 *   de cada item em relação ao total de itens. Útil quando se quer que cada item "carregue"
 *   sua parte proporcional do frete.
 * 
 * @param order - Pedido a ser convertido
 * @param dateMode - Modo de referência de data ('entrada', 'entrega' ou 'auto')
 * @param freteDistribution - Como distribuir o frete ('por_pedido' ou 'proporcional')
 * @returns Array de linhas normalizadas (uma por item, ou uma se não houver itens)
 */
const buildRowsFromOrder = (
  order: OrderWithItems,
  dateMode: DateReferenceMode,
  freteDistribution: 'por_pedido' | 'proporcional' | 'proporcional_inteiro' | 'atribuicao_unica' = 'por_pedido'
): NormalizedRow[] => {
  const items = order.items ?? [];

  const cliente = safeLabel(order.cliente ?? order.customer_name, 'Cliente não informado');
  const formaEnvio = safeLabel(order.forma_envio, 'Sem forma de envio');
  const ordemDataRef = getOrderReferenceDate(order, dateMode);
  const dataLabel = formatDateLabel(ordemDataRef);
  const valorFreteTotal = parseCurrencyCached(order.valor_frete ?? 0);

  if (items.length === 0) {
    const totalServico = roundToTwoDecimals(parseCurrencyCached(order.total_value ?? 0) - valorFreteTotal);
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

  // Calcular total de itens para distribuição proporcional
  const totalItensValue = (freteDistribution === 'proporcional' || freteDistribution === 'proporcional_inteiro')
    ? items.reduce((sum, item) => sum + getSubtotalValue(item), 0)
    : 0;

  // Se distribuição proporcional mas total é zero, usar por_pedido
  const useProportional = freteDistribution === 'proporcional' && totalItensValue > 0;
  const useProportionalInteiro = freteDistribution === 'proporcional_inteiro' && totalItensValue > 0;

  let remainingFreteInteiro = valorFreteTotal;
  const itemsCount = items.length;

  const rows: NormalizedRow[] = items.map((item, index) => {
    const designer = safeLabel(item.designer, 'Sem designer');
    const vendedor = safeLabel(item.vendedor, 'Sem vendedor');
    const tipo = safeLabel(item.tipo_producao, 'Sem tipo');
    const descricao = safeLabel(item.descricao ?? item.item_name, 'Item sem descrição');
    const valorServico = getSubtotalValue(item);

    // Distribuir frete conforme opção escolhida
    let valorFrete: number;
    if (freteDistribution === 'atribuicao_unica') {
      // Primeira linha ganha o frete total, as demais zero
      valorFrete = index === 0 ? valorFreteTotal : 0;
    } else if (useProportionalInteiro) {
      if (index === itemsCount - 1) {
        valorFrete = Math.max(0, remainingFreteInteiro);
      } else {
        const proporcao = valorServico / totalItensValue;
        valorFrete = Math.round(valorFreteTotal * proporcao);
        remainingFreteInteiro -= valorFrete;
      }
    } else if (useProportional) {
      const proporcao = valorServico / totalItensValue;
      valorFrete = roundToTwoDecimals(valorFreteTotal * proporcao);
    } else {
      // Por padrão ('por_pedido'), cada item mostra o frete TOTAL do pedido
      valorFrete = valorFreteTotal;
    }

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

  // Cálculo de ajuste (Valor Excedente)
  // Alguns pedidos tem valor total maior que a soma dos itens (ex: pedidos antigos ou ajustes manuais)
  // No Relatório de Fechamento, o total do cabeçalho é soberano (Faturamento Bruto)
  const valorTotalPedido = parseCurrencyCached(order.total_value ?? order.valor_total ?? 0);

  // Só aplicamos ajuste se houver um valor total definido para o pedido (> 0)
  // Se for 0, assumimos que o total é a soma dos itens (evita quebrar testes e pedidos legados sem total)
  if (valorTotalPedido > 0.01) {
    const sumItemsValue = rows.reduce((sum, r) => sum + r.valorServico, 0);
    const expectedServicoTotal = roundToTwoDecimals(valorTotalPedido - valorFreteTotal);
    const adjustment = roundToTwoDecimals(expectedServicoTotal - sumItemsValue);

    if (adjustment > 0.01) {
      // Tentar herdar designer/vendedor do primeiro item real se existir
      const firstItem = items[0];
      const adjustmentDesigner = firstItem?.designer || 'Sem designer';
      const adjustmentVendedor = firstItem?.vendedor || 'Sem vendedor';

      rows.push({
        orderId: order.id,
        ficha: order.numero ?? order.id.toString(),
        cliente,
        designer: adjustmentDesigner,
        vendedor: adjustmentVendedor,
        tipo: 'Ajuste',
        formaEnvio,
        data: ordemDataRef ?? '',
        dataLabel,
        descricao: 'Complemento de valor (Diferença Pedido x Itens)',
        valorFrete: 0, // Ajuste não carrega frete — o frete já está nos itens reais
        valorServico: adjustment,
      });
    }
  }

  return rows;
};

/**
 * Agrupa linhas em dois níveis (ex: Designer → Cliente).
 * 
 * PERFORMANCE: Para grandes volumes (milhares de pedidos), considere:
 * - Processamento em lotes
 * - Usar estruturas de dados mais eficientes (ex: IndexedDB)
 * - Implementar paginação de resultados
 * - Cache de resultados intermediários
 * 
 * @param rows - Linhas normalizadas para agrupar
 * @param getTopKey - Função para obter chave do primeiro nível
 * @param getTopLabel - Função para obter label do primeiro nível
 * @param getSubKey - Função para obter chave do segundo nível
 * @param getSubLabel - Função para obter label do segundo nível
 * @param ordersMap - Mapa de pedidos para cálculo de desconto
 * @param freteDistribution - Modo de distribuição de frete
 * @returns Array de grupos com subgrupos
 */
const buildTwoLevelGroups = (
  rows: NormalizedRow[],
  getTopKey: (row: NormalizedRow) => string,
  getTopLabel: (key: string) => string,
  getSubKey: (row: NormalizedRow) => string,
  getSubLabel: (key: string) => string,
  ordersMap?: Map<number, OrderWithItems>,
  freteDistribution: 'por_pedido' | 'proporcional' | 'proporcional_inteiro' | 'atribuicao_unica' = 'por_pedido'
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
        .map(([subKey, subRows]) => createLeafGroup(getSubLabel(subKey), slugify(`${topKey}-${subKey}`), subRows, ordersMap, freteDistribution));

      // Calcular subtotal do grupo pai deduplicando frete por orderId
      // (ao invés de somar subtotais dos subgrupos, que duplicaria frete
      // quando itens do mesmo pedido estão em subgrupos diferentes)
      const allTopRows = Array.from(subMap.values()).flat();
      const subtotal = computeTotalsFromRows(allTopRows, ordersMap, freteDistribution);

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
  ordersMap?: Map<number, OrderWithItems>,
  freteDistribution: 'por_pedido' | 'proporcional' | 'proporcional_inteiro' | 'atribuicao_unica' = 'por_pedido'
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
      return createAggregateGroupRow(getLabel(key), slugify(key), groupRows, description, ordersMap, freteDistribution);
    });
};

const filterOrdersByStatus = (orders: OrderWithItems[], statusFilter?: string) => {
  if (!statusFilter || statusFilter === 'Todos') {
    return orders;
  }

  const normalized = statusFilter.toLowerCase().trim();

  return orders.filter((order) => {
    const orderStatus = (order.status || '').toLowerCase().trim();

    // No Relatório de Fechamento, "Concluido" deve ser INCLUSIVO (Pendente, Produção, Pronto, Entregue)
    // conforme solicitado pelo usuário para bater com o Dashboard e incluir pedidos em andamento no mês.
    if (normalized === 'concluido') {
      return (
        orderStatus === 'pendente' ||
        orderStatus === 'em_producao' ||
        orderStatus === 'processamento' ||
        orderStatus === 'pronto' ||
        orderStatus === 'entregue' ||
        orderStatus === 'concluido'
      );
    }

    if (normalized === 'pendente') return orderStatus === 'pendente';
    if (normalized === 'em processamento') return orderStatus === 'em_producao';
    if (normalized === 'cancelado') return orderStatus === 'cancelado';

    return orderStatus === normalized;
  });
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
    // Modo normal: usa getOrderReferenceDate
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

const filterRows = (
  rows: NormalizedRow[],
  payload: ReportRequestPayload,
): NormalizedRow[] => {
  const vendedorFilter = normalizeFilterText(payload.vendedor);
  const designerFilter = normalizeFilterText(payload.designer);
  const clienteFilter = normalizeFilterText(payload.cliente);

  if (!vendedorFilter && !designerFilter && !clienteFilter) {
    return rows;
  }

  const filtered = rows.filter((row) => {
    const rowVendedor = normalizeFilterText(row.vendedor);
    const rowDesigner = normalizeFilterText(row.designer);
    const rowCliente = normalizeFilterText(row.cliente);

    if (vendedorFilter && !rowVendedor.includes(vendedorFilter)) {
      return false;
    }
    if (designerFilter && !rowDesigner.includes(designerFilter)) {
      return false;
    }
    if (clienteFilter && !rowCliente.includes(clienteFilter)) {
      return false;
    }
    return true;
  });

  return filtered;
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

/**
 * Valida a consistência dos totais calculados no relatório.
 * Verifica se os subtotais de grupos/subgrupos batem com os totais calculados,
 * com margem de erro para arredondamentos.
 * 
 * @param groups - Grupos do relatório
 * @param total - Total geral calculado
 * @returns Objeto com validade e lista de avisos encontrados
 */
const validateReportTotals = (groups: ReportGroup[], total: ReportTotals): { valid: boolean; warnings: string[] } => {
  const warnings: string[] = [];

  // Calcular soma de todos os grupos
  const sumGroups = groups.reduce(
    (acc, group) => ({
      valor_frete: acc.valor_frete + (group.subtotal?.valor_frete ?? 0),
      valor_servico: acc.valor_servico + (group.subtotal?.valor_servico ?? 0),
      desconto: (acc.desconto ?? 0) + (group.subtotal?.desconto ?? 0),
    }),
    { valor_frete: 0, valor_servico: 0, desconto: 0 }
  );

  // Verificar se totais dos grupos batem com total geral (com margem de erro de arredondamento)
  const freteDiff = Math.abs(sumGroups.valor_frete - total.valor_frete);
  const servicoDiff = Math.abs(sumGroups.valor_servico - total.valor_servico);

  if (freteDiff > 0.01) { // Mais de 1 centavo de diferença
    warnings.push(
      `Diferença entre soma de grupos e total geral no frete: ${freteDiff.toFixed(2)}`
    );
  }

  if (servicoDiff > 0.01) {
    warnings.push(
      `Diferença entre soma de grupos e total geral no serviço: ${servicoDiff.toFixed(2)}`
    );
  }

  // Validar desconto se presente
  if (total.desconto !== undefined || sumGroups.desconto > 0) {
    const descontoTotal = total.desconto ?? 0;
    const descontoGroups = sumGroups.desconto ?? 0;
    const descontoDiff = Math.abs(descontoGroups - descontoTotal);

    if (descontoDiff > 0.01) {
      warnings.push(
        `Diferença entre soma de grupos e total geral no desconto: ${descontoDiff.toFixed(2)}`
      );
    }

    // Validar valor líquido
    const expectedLiquido = (total.valor_frete + total.valor_servico) - (total.desconto ?? 0);
    const actualLiquido = total.valor_liquido ?? expectedLiquido;
    const liquidoDiff = Math.abs(expectedLiquido - actualLiquido);

    if (liquidoDiff > 0.01) {
      warnings.push(
        `Inconsistência no valor líquido: esperado ${expectedLiquido.toFixed(2)}, calculado ${actualLiquido.toFixed(2)}`
      );
    }
  }

  // Validar subgrupos
  groups.forEach((group) => {
    if (group.subgroups && group.subgroups.length > 0) {
      const sumSubgroups = group.subgroups.reduce(
        (acc, sub) => ({
          valor_frete: acc.valor_frete + (sub.subtotal?.valor_frete ?? 0),
          valor_servico: acc.valor_servico + (sub.subtotal?.valor_servico ?? 0),
          desconto: (acc.desconto ?? 0) + (sub.subtotal?.desconto ?? 0),
        }),
        { valor_frete: 0, valor_servico: 0, desconto: 0 }
      );

      const subFreteDiff = Math.abs(sumSubgroups.valor_frete - (group.subtotal?.valor_frete ?? 0));
      const subServicoDiff = Math.abs(sumSubgroups.valor_servico - (group.subtotal?.valor_servico ?? 0));
      const subDescontoDiff = Math.abs((sumSubgroups.desconto ?? 0) - (group.subtotal?.desconto ?? 0));

      if (subFreteDiff > 0.01 || subServicoDiff > 0.01 || subDescontoDiff > 0.01) {
        warnings.push(
          `Inconsistência nos subtotais do grupo "${group.label}": frete diff=${subFreteDiff.toFixed(2)}, serviço diff=${subServicoDiff.toFixed(2)}, desconto diff=${subDescontoDiff.toFixed(2)}`
        );
      }
    }
  });

  return {
    valid: warnings.length === 0,
    warnings
  };
};

/**
 * Valida o payload de requisição do relatório.
 * Verifica formato de datas, tipos de relatório e outras regras de negócio.
 * 
 * @param payload - Payload a ser validado
 * @returns Objeto com validade e lista de erros encontrados
 */
const validateReportRequest = (payload: ReportRequestPayload): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validar datas
  if (payload.start_date && payload.end_date) {
    if (payload.start_date > payload.end_date) {
      errors.push('Data inicial não pode ser posterior à data final');
    }
  }

  // Validar formato de datas (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (payload.start_date && !dateRegex.test(payload.start_date)) {
    errors.push('Data inicial deve estar no formato YYYY-MM-DD');
  }

  if (payload.end_date && !dateRegex.test(payload.end_date)) {
    errors.push('Data final deve estar no formato YYYY-MM-DD');
  }

  // Validar tipo de relatório
  const validReportTypes = [
    'analitico_designer_cliente',
    'analitico_cliente_designer',
    'analitico_vendedor_designer',
    'analitico_designer_vendedor',
    'analitico_cliente_painel',
    'analitico_designer_painel',
    'analitico_entrega_painel',
    'sintetico_data',
    'sintetico_data_entrada',
    'sintetico_data_entrega',
    'sintetico_designer',
    'sintetico_vendedor',
    'sintetico_vendedor_designer',
    'sintetico_cliente',
    'sintetico_entrega',
  ];

  if (!validReportTypes.includes(payload.report_type)) {
    errors.push(`Tipo de relatório inválido: ${payload.report_type}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Gera um relatório de fechamentos a partir de pedidos.
 * 
 * Esta é a função principal que processa os pedidos, aplica filtros,
 * agrupa os dados conforme o tipo de relatório solicitado e calcula os totais.
 * 
 * Fluxo de processamento:
 * 1. Valida o payload de entrada
 * 2. Filtra pedidos por status
 * 3. Filtra pedidos por data (conforme date_mode)
 * 4. Converte pedidos em linhas normalizadas
 * 5. Filtra linhas por vendedor/designer/cliente (se especificado)
 * 6. Agrupa linhas conforme report_type
 * 7. Calcula totais por grupo e total geral
 * 
 * @param orders - Array de pedidos com itens para processar
 * @param payload - Parâmetros do relatório (tipo, filtros, datas, etc.)
 * @returns Relatório completo com grupos, subtotais e totais
 * @throws Error se o payload for inválido
 */
export const generateFechamentoReport = (
  orders: OrderWithItems[],
  payload: ReportRequestPayload,
): ReportResponse => {
  // Limpar cache no início do processamento para garantir dados frescos
  clearCurrencyCache();

  // Deduplicação defensiva (protege contra backend/paginação retornando pedidos/itens repetidos)
  // - Dedup por `order.id`
  // - Dedup de itens por `item.id` dentro de cada pedido
  const normalizedOrders: OrderWithItems[] = (() => {
    const byId = new Map<number, OrderWithItems>();

    orders.forEach((order) => {
      const items = order.items ?? [];
      const itemsById = new Map<number | string, (typeof items)[number]>();
      items.forEach((item, index) => {
        // Se o item não tem ID, usar índice como chave para evitar sobrescrever
        const key = item.id != null ? item.id : `__index_${index}`;
        itemsById.set(key, item);
      });

      const normalized: OrderWithItems = {
        ...order,
        items: Array.from(itemsById.values()),
      };

      // Se o mesmo pedido aparecer múltiplas vezes, fazemos merge de itens (união por id)
      const existing = byId.get(order.id);
      if (!existing) {
        byId.set(order.id, normalized);
        return;
      }

      const mergedItemsById = new Map<number, (typeof items)[number]>();
      (existing.items ?? []).forEach((item) => mergedItemsById.set(item.id, item));
      normalized.items.forEach((item) => mergedItemsById.set(item.id, item));

      byId.set(order.id, {
        ...existing,
        ...normalized,
        items: Array.from(mergedItemsById.values()),
      });
    });

    if (orders.length !== byId.size) {
      console.warn('[fechamentoReport] Deduplicação aplicada:', {
        inputOrders: orders.length,
        uniqueOrders: byId.size,
      });
    }

    return Array.from(byId.values());
  })();

  // Validar payload
  const validation = validateReportRequest(payload);
  if (!validation.valid) {
    throw new Error(`Payload inválido: ${validation.errors.join('; ')}`);
  }

  const dateMode: DateReferenceMode =
    payload.date_mode === 'entrada' || payload.date_mode === 'entrega'
      ? payload.date_mode
      : 'auto';

  const filteredByStatus = filterOrdersByStatus(normalizedOrders, payload.status);
  const filteredOrders = filterOrdersByDate(
    filteredByStatus,
    payload.start_date,
    payload.end_date,
    dateMode // ✅ Passa o dateMode para o filtro
  );

  // Validar consistência dos pedidos e logar avisos se houver problemas
  const validationWarnings: string[] = [];
  filteredOrders.forEach((order) => {
    const orderValidation = validateOrderTotals(order);
    if (!orderValidation.valid) {
      validationWarnings.push(`Pedido #${order.id} (${order.numero ?? 'sem número'}): ${orderValidation.issues.join('; ')}`);
    }
  });

  if (validationWarnings.length > 0) {
    console.warn('[fechamentoReport] Avisos de validação de pedidos:', validationWarnings);
  }

  // Determinar modo de distribuição de frete
  // Para sintetico_vendedor_designer, usar proporcional para evitar duplicação de frete
  // quando um pedido aparece em múltiplos grupos (vendedor/designer diferentes)
  const reportType = payload.report_type;
  const defaultFreteDistribution = payload.frete_distribution ?? 'por_pedido';
  const freteDistributionForRows = defaultFreteDistribution;

  const baseRowsAll = filteredOrders.flatMap((order) =>
    buildRowsFromOrder(order, dateMode, freteDistributionForRows)
  );
  const baseRows = filterRows(baseRowsAll, payload);

  // Criar mapa de pedidos por ID para calcular desconto
  const ordersMap = new Map<number, OrderWithItems>();
  filteredOrders.forEach((order) => {
    ordersMap.set(order.id, order);
  });

  // Para o total geral, usar a distribuição escolhida pelo usuário (ou proporcional se sintetico_vendedor_designer)
  // O total geral deve ser consistente com a distribuição usada nas linhas
  const freteDistributionForTotals = freteDistributionForRows;
  const totals = computeTotalsFromRows(baseRows, ordersMap, freteDistributionForTotals);

  // Usar freteDistribution para os casos que não são sintetico_vendedor_designer
  const freteDistribution = defaultFreteDistribution;

  const groups: ReportGroup[] = (() => {
    switch (reportType) {
      case 'analitico_designer_cliente':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'analitico_cliente_designer':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'analitico_cliente_painel':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
          (row) => row.tipo,
          (value) => `Tipo: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'analitico_designer_painel':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          (row) => row.tipo,
          (value) => `Tipo: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'analitico_vendedor_designer':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.vendedor,
          (value) => `Vendedor: ${value}`,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'analitico_designer_vendedor':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          (row) => row.vendedor,
          (value) => `Vendedor: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'analitico_entrega_painel':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.formaEnvio,
          (value) => `Entrega: ${value}`,
          (row) => row.tipo,
          (value) => `Tipo: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'sintetico_data':
        // Mantém o comportamento antigo (referência automática) para compatibilidade
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.dataLabel,
          (value) => `Data: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'sintetico_data_entrada':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.dataLabel,
          (value) => `Data de Entrada: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'sintetico_data_entrega':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.dataLabel,
          (value) => `Data de Entrega: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'sintetico_designer':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'sintetico_vendedor':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.vendedor,
          (value) => `Vendedor: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'sintetico_vendedor_designer':
        // Usar a distribuição escolhida pelo usuário (agora flexível)
        return buildSingleLevelAggregate(
          baseRows,
          (row) => `${row.vendedor} / ${row.designer}`,
          (value) => `Vendedor/Designer: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'sintetico_cliente':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
          ordersMap,
          freteDistribution
        );
      case 'sintetico_entrega':
        return buildSingleLevelAggregate(
          baseRows,
          (row) => row.formaEnvio,
          (value) => `Entrega: ${value}`,
          ordersMap,
          freteDistribution
        );
      default:
        return [];
    }
  })();

  const statusLabelRaw = payload.status ?? 'Todos';
  const statusLabel = STATUS_FILTER_LABEL[statusLabelRaw] ?? statusLabelRaw;

  // Validar consistência dos totais calculados
  const totalsValidation = validateReportTotals(groups, totals);
  if (totalsValidation.warnings.length > 0) {
    console.warn('[fechamentoReport] Avisos de validação dos totais:', totalsValidation.warnings);
  }

  return {
    title: REPORT_TITLES[reportType] ?? 'Relatório de Fechamentos',
    period_label: buildPeriodLabel(payload.start_date, payload.end_date),
    status_label: `Status: ${statusLabel}`,
    page: 1,
    generated_at: new Date().toLocaleString('pt-BR'),
    report_type: reportType,
    groups,
    total: totals,
    frete_distribution: freteDistributionForTotals,
  };
};
