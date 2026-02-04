import { OrderWithItems, OrderStatus } from '../types';
import { parseDecimal } from '../api/utils';

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

/**
 * Normaliza um pedido para o formato simplificado do dashboard
 */
export const normalizeOrder = (order: OrderWithItems, mode: DateMode): DashboardOrder | null => {
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
    const normalizedDate = dateMatch ? dateMatch[1] : null;

    if (!normalizedDate) return null;

    const valor = typeof order.valor_total === 'number' ? order.valor_total : parseDecimal(order.valor_total);

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
 * Gera insights baseados nas estatísticas
 */
export const generateInsights = (stats: DashboardStats): string[] => {
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
