/// <reference lib="webworker" />

import type { OrderWithItems } from '../types';

export interface FilterWorkerInput {
    orders: OrderWithItems[];
    filters: {
        activeSearchTerm: string;
        isBackendPaginated: boolean;
        dateFrom: string | null;
        dateTo: string | null;
        productionStatusFilter: string;
        selectedStatuses: string[];
        selectedVendedor: string;
        selectedDesigner: string;
        selectedCidade: string;
        selectedFormaEnvio: string;
        selectedTipoProducao: string;
        sortColumn: string | null;
        sortDirection: 'asc' | 'desc';
        isAdmin: boolean;
        isImpressaoUser: boolean;
    };
}

const normalizeText = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

self.onmessage = (e: MessageEvent<FilterWorkerInput>) => {
    const { orders, filters } = e.data;
    let filtered = orders;

    // Busca textual
    if (filters.activeSearchTerm && filters.activeSearchTerm.trim().length > 0) {
        const normalizedTerm = normalizeText(filters.activeSearchTerm);
        const termDigits = normalizedTerm.replace(/\D/g, '');
        filtered = filtered.filter((order) => {
            const clienteName = order.cliente || order.customer_name || '';
            const normalizedCliente = normalizeText(clienteName);
            const idStr = String(order.id ?? '');
            const numeroStr = order.numero ? String(order.numero) : '';
            const numeroStrNoZeros = numeroStr.replace(/^0+/, '');

            return (
                (normalizedTerm.length > 0 && normalizedCliente.includes(normalizedTerm)) ||
                (termDigits.length > 0 &&
                    (idStr.includes(termDigits) ||
                        numeroStr.includes(termDigits) ||
                        numeroStrNoZeros.includes(termDigits)))
            );
        });
    }

    // Se nao tiver backend pagination, processar datas
    if (!filters.isBackendPaginated) {
        if (filters.dateFrom || filters.dateTo) {
            const startDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
            const endDate = filters.dateTo ? new Date(filters.dateTo) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);

            filtered = filtered.filter((order) => {
                if (!order.data_entrega) return false;
                const deliveryDate = new Date(order.data_entrega);
                if (Number.isNaN(deliveryDate.getTime())) return false;
                if (startDate && deliveryDate < startDate) return false;
                if (endDate && deliveryDate > endDate) return false;
                return true;
            });
        }

        // Status de Produção (pending, ready, delayed)
        if (filters.productionStatusFilter === 'pending') {
            filtered = filtered.filter((order) => !order.pronto);
        } else if (filters.productionStatusFilter === 'ready') {
            filtered = filtered.filter((order) => order.pronto);
        } else if (filters.productionStatusFilter === 'delayed') {
            filtered = filtered.filter((order) => {
                if (order.pronto || !order.data_entrega) return false;
                const limitDate = new Date(order.data_entrega);
                limitDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return limitDate < today;
            });
        }
    }

    // Statuses (Checkbox)
    if (filters.selectedStatuses.length > 0) {
        filtered = filtered.filter((order) => {
            const statusChecks = [];
            if (filters.selectedStatuses.includes('financeiro')) statusChecks.push(order.financeiro === true);
            if (filters.selectedStatuses.includes('conferencia')) statusChecks.push(order.conferencia === true);
            if (filters.selectedStatuses.includes('sublimacao')) statusChecks.push(order.sublimacao === true);
            if (filters.selectedStatuses.includes('costura')) statusChecks.push(order.costura === true);
            if (filters.selectedStatuses.includes('expedicao')) statusChecks.push(order.expedicao === true);
            if (filters.selectedStatuses.includes('pronto')) statusChecks.push(order.pronto === true);
            return statusChecks.some((check) => check);
        });
    }

    if (filters.selectedVendedor) {
        filtered = filtered.filter((order) => {
            if (!order.items || order.items.length === 0) return true;
            return order.items.some((item) => item.vendedor === filters.selectedVendedor);
        });
    }

    if (filters.selectedDesigner) {
        filtered = filtered.filter((order) => {
            if (!order.items || order.items.length === 0) return true;
            return order.items.some((item) => item.designer === filters.selectedDesigner);
        });
    }

    if (filters.selectedCidade) {
        filtered = filtered.filter((order) => order.cidade_cliente === filters.selectedCidade);
    }

    if (filters.selectedFormaEnvio) {
        filtered = filtered.filter((order) => order.forma_envio === filters.selectedFormaEnvio);
    }

    if (filters.selectedTipoProducao) {
        filtered = filtered.filter((order) => {
            if (!order.items || order.items.length === 0) return true;
            return order.items.some((item) =>
                item.tipo_producao?.toLowerCase() === filters.selectedTipoProducao.toLowerCase()
            );
        });
    }

    // Ordenação
    if (filters.sortColumn) {
        filtered = [...filtered].sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            switch (filters.sortColumn) {
                case 'id':
                    aValue = a.id;
                    bValue = b.id;
                    break;
                case 'cliente':
                    aValue = (a.cliente || a.customer_name || '').toLowerCase();
                    bValue = (b.cliente || b.customer_name || '').toLowerCase();
                    break;
                case 'data_entrega':
                    aValue = a.data_entrega ? new Date(a.data_entrega).getTime() : 0;
                    bValue = b.data_entrega ? new Date(b.data_entrega).getTime() : 0;
                    break;
                case 'prioridade':
                    aValue = a.prioridade === 'ALTA' ? 1 : 0;
                    bValue = b.prioridade === 'ALTA' ? 1 : 0;
                    break;
                case 'cidade':
                    aValue = (a.cidade_cliente || '').toLowerCase();
                    bValue = (b.cidade_cliente || '').toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return filters.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return filters.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    } else if (filters.isAdmin) {
        filtered = [...filtered].sort((a, b) => {
            if (a.financeiro !== b.financeiro) return a.financeiro ? 1 : -1;
            if (a.prioridade !== b.prioridade) return a.prioridade === 'ALTA' ? -1 : 1;
            return (b.id || 0) - (a.id || 0);
        });
    } else if (filters.isImpressaoUser) {
        filtered = [...filtered].sort((a, b) => {
            const aPendente = a.sublimacao !== true;
            const bPendente = b.sublimacao !== true;
            if (aPendente !== bPendente) return aPendente ? -1 : 1;
            if (a.prioridade !== b.prioridade) return a.prioridade === 'ALTA' ? -1 : 1;
            return (b.id || 0) - (a.id || 0);
        });
    }

    // Manda de volta pra Main Thread
    self.postMessage({ filteredOrders: filtered });
};
