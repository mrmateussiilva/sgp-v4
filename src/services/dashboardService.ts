import { OrderWithItems, OrderStatus, OrderItem } from '../types';
import { parseDecimal } from '../api/utils';
import { isImpressao3DType, isMochilinhaType } from '../utils/validationRules';

export type DateMode = 'entrada' | 'entrega' | 'criacao' | 'atualizacao';

export interface DashboardOrder {
    id: number;
    data: string; // YYYY-MM-DD
    valor_total: number;
    status: OrderStatus;
    prioridade: string;
    cliente: string;
}

export interface DailyAggregation {
    data: string;
    totalVendido: number;
    quantidadePedidos: number;
    ticketMedio: number;
    prontos: number;
    pendentes: number;
}

export interface DashboardStats {
    totalVendido: number;
    nPedidos: number;
    ticketMedio: number;
    melhorDia: { data: string; total: number; count: number } | null;
    piorDia: { data: string; total: number; count: number } | null;
    porcentagemProntos: number;
    porcentagemPendentes: number;
    porcentagemAltaPrioridade: number;
    dailyData: DailyAggregation[];
    topClientes: { nome: string; valor: number }[];
}

export interface ProductionTypeData {
    tipo: string;            // Chave normalizada, ex: "impressao_3d"
    label: string;           // Rótulo legível, ex: "Impressão 3D"
    totalVendido: number;    // Soma em R$ de todos os itens desse tipo no período
    quantidade: number;      // Total de peças/unidades (quantity)
    percentual: number;      // % do totalVendido geral
    nPedidos: number;        // Quantidade de pedidos distintos com este tipo
}

/**
 * Retorna a data normalizada (YYYY-MM-DD) do pedido conforme o DateMode
 */
export const getOrderDate = (order: OrderWithItems, mode: DateMode): string | null => {
    let dateStr: string | undefined | null = null;

    switch (mode) {
        case 'entrada':
            dateStr = order.data_entrada;
            break;
        case 'entrega':
            dateStr = order.data_entrega;
            break;
        case 'criacao':
            dateStr = order.created_at;
            break;
        case 'atualizacao':
            dateStr = order.updated_at;
            break;
    }

    if (!dateStr) return null;

    // Extrair apenas YYYY-MM-DD
    const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? dateMatch[1] : null;
};

/**
 * Normaliza um pedido para o formato simplificado do dashboard
 */
export const normalizeOrder = (order: OrderWithItems, mode: DateMode): DashboardOrder | null => {
    const normalizedDate = getOrderDate(order, mode);
    if (!normalizedDate) return null;

    const valor = typeof order.valor_total === 'number'
        ? order.valor_total
        : parseDecimal(order.valor_total ?? order.total_value);

    return {
        id: order.id,
        data: normalizedDate,
        valor_total: valor,
        status: order.status,
        prioridade: order.prioridade || 'NORMAL',
        cliente: order.cliente || order.customer_name || 'Desconhecido',
    };
};

/**
 * Filtra pedidos por período no front-end (fallback)
 */
export const filterOrdersByPeriod = (
    orders: OrderWithItems[],
    startDate: string,
    endDate: string,
    mode: DateMode
): DashboardOrder[] => {
    return orders
        .filter(o => o.status !== OrderStatus.Cancelado) // Remover cancelados para faturamento bruto real
        .map((o) => normalizeOrder(o, mode))
        .filter((o): o is DashboardOrder => {
            if (!o) return false;
            return o.data >= startDate && o.data <= endDate;
        });
};

/**
 * Filtra os pedidos brutos (OrderWithItems) por período e modo de data,
 * preservando a lista completa de itens para cálculos aprofundados (ex: mix de produção).
 */
export const filterRawOrdersByPeriod = (
    orders: OrderWithItems[],
    startDate: string,
    endDate: string,
    mode: DateMode
): OrderWithItems[] => {
    return orders
        .filter(o => o.status !== OrderStatus.Cancelado)
        .filter(o => {
            const date = getOrderDate(o, mode);
            if (!date) return false;
            return date >= startDate && date <= endDate;
        });
};

/**
 * Obtém a quantidade total de um item considerando campos específicos
 */
export const getItemQuantity = (item: OrderItem): number => {
    if (typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0) {
        return item.quantity;
    }
    const anyItem = item as unknown as Record<string, string | number | undefined>;
    const raw = parseInt(String(
        anyItem.quantidade_paineis ||
        anyItem.quantidade_totem ||
        anyItem.quantidade_lona ||
        anyItem.quantidade_adesivo ||
        anyItem.quantidade_canga ||
        anyItem.quantidade_impressao_3d ||
        anyItem.quantidade_mochilinha || '1'
    ), 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
};

/**
 * Obtém o valor total (subtotal) de um item considerando múltiplos fallbacks
 */
export const getItemValue = (item: OrderItem): number => {
    const qty = getItemQuantity(item);

    // 1. Subtotal direto se já vier calculado da API
    if (typeof item.subtotal === 'number' && Number.isFinite(item.subtotal) && item.subtotal > 0) {
        const expected = (item.unit_price ?? 0) * qty;
        if (expected > 0 && Math.abs(item.subtotal - expected) > 0.01) {
            return Math.round(expected * 100) / 100;
        }
        return Math.round(item.subtotal * 100) / 100;
    }

    // 2. Unit price numérico * quantidade
    if (typeof item.unit_price === 'number' && Number.isFinite(item.unit_price) && item.unit_price > 0) {
        return Math.round(item.unit_price * qty * 100) / 100;
    }

    // 3. parseDecimal de valor_unitario * quantidade
    const parsedUnit = parseDecimal(item.valor_unitario);
    if (parsedUnit > 0) {
        return Math.round(parsedUnit * qty * 100) / 100;
    }

    // 4. Campos específicos por tipo (valor_painel, valor_totem, etc.)
    const anyItem = item as unknown as Record<string, string | number | undefined>;
    const specificVal = parseDecimal(
        anyItem.valor_painel ||
        anyItem.valor_totem ||
        anyItem.valor_lona ||
        anyItem.valor_adesivo ||
        anyItem.valor_canga ||
        anyItem.valor_impressao_3d ||
        anyItem.valor_mochilinha
    );
    if (specificVal > 0) {
        return Math.round(specificVal * qty * 100) / 100;
    }

    return 0;
};

/**
 * Normaliza a chave e o rótulo de exibição de um tipo de produção
 */
export const normalizeProductionType = (tipoProducao?: string | null): { tipo: string; label: string } => {
    if (!tipoProducao || !tipoProducao.trim()) {
        return { tipo: 'sem_tipo', label: 'Sem Tipo' };
    }
    const raw = tipoProducao.trim().toLowerCase();

    if (isImpressao3DType(raw)) {
        return { tipo: 'impressao_3d', label: 'Impressão 3D' };
    }
    if (isMochilinhaType(raw)) {
        return { tipo: 'mochilinha', label: 'Mochilinha / Bolsinha' };
    }
    if (raw === 'painel') {
        return { tipo: 'painel', label: 'Painel' };
    }
    if (raw === 'generica' || raw === 'genérica') {
        return { tipo: 'generica', label: 'Genérica' };
    }
    if (raw === 'mesa_babado' || raw === 'mesa de babado' || raw.includes('mesa_babado')) {
        return { tipo: 'mesa_babado', label: 'Mesa de Babado' };
    }
    if (raw === 'totem') {
        return { tipo: 'totem', label: 'Totem' };
    }
    if (raw === 'lona') {
        return { tipo: 'lona', label: 'Lona' };
    }
    if (raw === 'adesivo') {
        return { tipo: 'adesivo', label: 'Adesivo' };
    }
    if (raw === 'canga') {
        return { tipo: 'canga', label: 'Canga' };
    }

    const formattedLabel = raw.charAt(0).toUpperCase() + raw.slice(1);
    return { tipo: raw, label: formattedLabel };
};

/**
 * Calcula a distribuição de vendas por tipo de produção (mix de produtos)
 */
export const calculateProductionTypeMix = (orders: OrderWithItems[]): ProductionTypeData[] => {
    const groups: Record<string, {
        tipo: string;
        label: string;
        totalVendido: number;
        quantidade: number;
        orderIds: Set<number>;
    }> = {};

    let totalGeral = 0;

    orders.forEach((order) => {
        const items = order.items && order.items.length > 0 ? order.items : [];

        if (items.length === 0) {
            const { tipo, label } = normalizeProductionType(null);
            if (!groups[tipo]) {
                groups[tipo] = { tipo, label, totalVendido: 0, quantidade: 0, orderIds: new Set() };
            }
            const valor = typeof order.valor_total === 'number'
                ? order.valor_total
                : parseDecimal(order.valor_total ?? order.total_value);
            groups[tipo].totalVendido += valor;
            groups[tipo].quantidade += 1;
            groups[tipo].orderIds.add(order.id);
            totalGeral += valor;
            return;
        }

        // Se houver itens mas todos tiverem valor 0 e o pedido tiver valor_total > 0,
        // distribuímos o total do pedido entre os itens
        const itemsValues = items.map(item => getItemValue(item));
        const sumItemValues = itemsValues.reduce((a, b) => a + b, 0);
        const orderVal = typeof order.valor_total === 'number'
            ? order.valor_total
            : parseDecimal(order.valor_total ?? order.total_value);
        const shouldDistributeOrderVal = sumItemValues === 0 && orderVal > 0;

        items.forEach((item, index) => {
            const { tipo, label } = normalizeProductionType(item.tipo_producao);
            if (!groups[tipo]) {
                groups[tipo] = { tipo, label, totalVendido: 0, quantidade: 0, orderIds: new Set() };
            }

            const itemVal = shouldDistributeOrderVal
                ? Math.round((orderVal / items.length) * 100) / 100
                : itemsValues[index];
            const itemQty = getItemQuantity(item);

            groups[tipo].totalVendido += itemVal;
            groups[tipo].quantidade += itemQty;
            groups[tipo].orderIds.add(order.id);
            totalGeral += itemVal;
        });
    });

    const result: ProductionTypeData[] = Object.values(groups).map((g) => ({
        tipo: g.tipo,
        label: g.label,
        totalVendido: Math.round(g.totalVendido * 100) / 100,
        quantidade: g.quantidade,
        percentual: totalGeral > 0 ? Math.round((g.totalVendido / totalGeral) * 1000) / 10 : 0,
        nPedidos: g.orderIds.size,
    }));

    result.sort((a, b) => b.totalVendido - a.totalVendido);
    return result;
};

/**
 * Agrupa pedidos por dia e calcula métricas diárias
 */
export const groupByDay = (orders: DashboardOrder[]): DailyAggregation[] => {
    const groups: Record<string, DailyAggregation> = {};

    orders.forEach((order) => {
        if (!groups[order.data]) {
            groups[order.data] = {
                data: order.data,
                totalVendido: 0,
                quantidadePedidos: 0,
                ticketMedio: 0,
                prontos: 0,
                pendentes: 0,
            };
        }

        const group = groups[order.data];
        group.totalVendido += order.valor_total;
        group.quantidadePedidos += 1;

        if (order.status === OrderStatus.Concluido) {
            group.prontos += 1;
        } else {
            group.pendentes += 1;
        }
    });

    return Object.values(groups)
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((g) => ({
            ...g,
            ticketMedio: g.quantidadePedidos > 0 ? g.totalVendido / g.quantidadePedidos : 0,
        }));
};

/**
 * Calcula estatísticas globais do conjunto de dados
 */
export const calculateStats = (orders: DashboardOrder[]): DashboardStats => {
    const totalVendido = orders.reduce((sum, o) => sum + o.valor_total, 0);
    const nPedidos = orders.length;
    const ticketMedio = nPedidos > 0 ? totalVendido / nPedidos : 0;

    const dailyData = groupByDay(orders);

    let melhorDia = null;
    let piorDia = null;

    if (dailyData.length > 0) {
        const sortedByTotal = [...dailyData].sort((a, b) => b.totalVendido - a.totalVendido);
        melhorDia = {
            data: sortedByTotal[0].data,
            total: sortedByTotal[0].totalVendido,
            count: sortedByTotal[0].quantidadePedidos
        };

        // Pior dia com vendas > 0
        const salesDays = dailyData.filter(d => d.totalVendido > 0);
        if (salesDays.length > 0) {
            const sortedByTotalAsc = [...salesDays].sort((a, b) => a.totalVendido - b.totalVendido);
            piorDia = {
                data: sortedByTotalAsc[0].data,
                total: sortedByTotalAsc[0].totalVendido,
                count: sortedByTotalAsc[0].quantidadePedidos
            };
        }
    }

    const prontos = orders.filter((o) => o.status === OrderStatus.Concluido).length;
    const pendentes = nPedidos - prontos;
    const altaPrioridade = orders.filter(o => o.prioridade === 'ALTA').length;

    // Top Clientes
    const clientVendas: Record<string, number> = {};
    orders.forEach(o => {
        clientVendas[o.cliente] = (clientVendas[o.cliente] || 0) + o.valor_total;
    });
    const topClientes = Object.entries(clientVendas)
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

    return {
        totalVendido,
        nPedidos,
        ticketMedio,
        melhorDia,
        piorDia,
        porcentagemProntos: nPedidos > 0 ? (prontos / nPedidos) * 100 : 0,
        porcentagemPendentes: nPedidos > 0 ? (pendentes / nPedidos) * 100 : 0,
        porcentagemAltaPrioridade: nPedidos > 0 ? (altaPrioridade / nPedidos) * 100 : 0,
        dailyData,
        topClientes,
    };
};

/**
 * Gera insights baseados nas estatísticas e no mix de produção
 */
export const generateInsights = (stats: DashboardStats, mix?: ProductionTypeData[]): string[] => {
    const insights: string[] = [];
    const {
        totalVendido,
        nPedidos,
        dailyData,
        porcentagemProntos,
        porcentagemPendentes,
        melhorDia,
        piorDia,
        topClientes
    } = stats;

    if (nPedidos === 0) return [];

    // Regra: Poucos dados
    if (nPedidos < 5) {
        return ["Poucos dados no período; amplie o intervalo para insights mais confiáveis."];
    }

    // Insight: Pico de vendas
    if (melhorDia) {
        const [, m, d] = melhorDia.data.split('-');
        insights.push(`Seu pico de vendas foi em ${d}/${m} com R$ ${melhorDia.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${melhorDia.count} ${melhorDia.count === 1 ? 'pedido' : 'pedidos'}).`);
    }

    // Insight: Pior dia (se houver variação)
    if (piorDia && piorDia.data !== melhorDia?.data) {
        const [, m, d] = piorDia.data.split('-');
        insights.push(`Seu menor dia de vendas foi em ${d}/${m} com R$ ${piorDia.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
    }

    // Insight: Concentração (Actionable)
    if (dailyData.length >= 3) {
        const sorted = [...dailyData].sort((a, b) => b.totalVendido - a.totalVendido);
        const top3Sum = sorted.slice(0, 3).reduce((sum, d) => sum + d.totalVendido, 0);
        const concentration = (top3Sum / totalVendido) * 100;
        if (concentration > 70) {
            insights.push(`Alerta: 70% das suas vendas estão concentradas em apenas 3 dias. Considere ações para equilibrar a demanda.`);
        } else {
            insights.push(`Os 3 melhores dias representam ${concentration.toFixed(1)}% do total vendido no período.`);
        }
    }

    // Insight: Mix de Produção (Carro-chefe e Concentração)
    if (mix && mix.length > 0) {
        const carroChefe = mix[0];
        if (carroChefe && carroChefe.totalVendido > 0) {
            if (carroChefe.percentual >= 50) {
                insights.push(`🏆 Carro-chefe: ${carroChefe.label} domina sua produção representando ${carroChefe.percentual.toFixed(1)}% do faturamento de itens (R$ ${carroChefe.totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${carroChefe.quantidade.toLocaleString('pt-BR')} peças).`);
            } else {
                insights.push(`🏆 Linha principal: ${carroChefe.label} lidera as vendas com R$ ${carroChefe.totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${carroChefe.percentual.toFixed(1)}% do faturamento de itens).`);
            }
        }

        if (mix.length >= 3 && carroChefe && carroChefe.percentual > 70) {
            insights.push(`Alerta de concentração: Mais de 70% das vendas de produtos dependem exclusivamente de ${carroChefe.label}. Diversificar linhas pode diminuir riscos operacionais.`);
        }
    }

    // Insight: Status (Actionable)
    if (porcentagemPendentes > 50) {
        insights.push(`Atenção: Mais de 50% dos seus pedidos ainda estão pendentes. Verifique possíveis gargalos na produção.`);
    } else if (nPedidos > 5) {
        insights.push(`${porcentagemProntos.toFixed(1)}% dos pedidos já foram concluídos.`);
    }

    // Insight: Clientes
    if (topClientes.length > 0 && topClientes[0].valor > (totalVendido * 0.3)) {
        insights.push(`Top cliente ${topClientes[0].nome} representa mais de 30% do seu faturamento no período.`);
    }

    // Insight: Upsell (Actionable)
    if (stats.ticketMedio < 100 && nPedidos > 10) {
        insights.push("Dica: Seu ticket médio está abaixo de R$ 100. Sugira produtos complementares (upsell) para aumentar a rentabilidade.");
    }

    return insights;
};
