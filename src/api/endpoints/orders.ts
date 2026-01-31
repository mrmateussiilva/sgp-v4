import { apiClient } from '../client';
import {
    ApiPedido,
    OrderWithItems,
    PaginatedOrders,
    OrderStatus,
    CreateOrderRequest,
    UpdateOrderRequest,
    UpdateOrderMetadataRequest,
    UpdateOrderStatusRequest,
    OrderFicha,
} from '../types';
import {
    mapPedidoFromApi,
    buildPedidoCreatePayload,
    buildPedidoUpdatePayload,
    buildMetadataPayload,
    buildStatusPayload,
    mapOrderToFicha,
    buildItemPayloadFromRequest,
} from '../mappers';
import { logger } from '../../utils/logger';
import { ordersSocket } from '../../lib/realtimeOrders';
import { useAuthStore } from '../../store/authStore';
import { setAuthToken } from '../client';

// Cache constants
const ORDER_BY_ID_CACHE_TTL_MS = 2_000;
const DEFAULT_PAGE_SIZE = 20;

interface TimedCache<T> {
    data: T;
    timestamp: number;
}

const isCacheFresh = <T>(cache: TimedCache<T> | null, ttlMs: number): cache is TimedCache<T> => {
    if (!cache) {
        return false;
    }
    return Date.now() - cache.timestamp < ttlMs;
};

const createCacheEntry = <T>(data: T): TimedCache<T> => ({
    data,
    timestamp: Date.now(),
});

// Cache simples por ID com limite de tamanho (LRU básico)
const MAX_CACHE_SIZE = 100;
const ordersByIdCache: Map<number, TimedCache<OrderWithItems>> = new Map();

const setCacheWithLimit = (orderId: number, order: OrderWithItems): void => {
    // LRU básico: remove o mais antigo se exceder limite
    if (ordersByIdCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = ordersByIdCache.keys().next().value;
        if (oldestKey !== undefined) {
            ordersByIdCache.delete(oldestKey);
        }
    }
    ordersByIdCache.set(orderId, createCacheEntry(order));
};

export const clearOrderCache = (orderId: number): void => {
    ordersByIdCache.delete(orderId);
    logger.debug(`[clearOrderCache] Cache invalidado para pedido ${orderId}`);
};

export const clearAllOrderCache = (): void => {
    ordersByIdCache.clear();
    logger.debug('[clearAllOrderCache] Todo cache de pedidos invalidado');
};

const requireSessionToken = (): string => {
    const token = useAuthStore.getState().sessionToken;
    if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    setAuthToken(token);
    return token;
};

// Status mapping for API
const STATUS_MAP: Record<OrderStatus, string> = {
    [OrderStatus.Pendente]: 'pendente',
    [OrderStatus.EmProcessamento]: 'em_producao',
    [OrderStatus.Concluido]: 'pronto',
    [OrderStatus.Cancelado]: 'cancelado',
};

interface FetchOrdersParams {
    skip?: number;
    limit?: number;
    status?: string;
    cliente?: string;
    data_inicio?: string;
    data_fim?: string;
}

const fetchOrdersPaginated = async (
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE,
    status?: OrderStatus,
    cliente?: string,
    data_inicio?: string,
    data_fim?: string
): Promise<PaginatedOrders> => {
    requireSessionToken();

    const skip = (page - 1) * pageSize;
    // Busca um item a mais para detectar se há próxima página
    const limit = pageSize + 1;

    const params: FetchOrdersParams = { skip, limit };

    if (status) {
        params.status = STATUS_MAP[status] || status;
    }
    if (cliente) {
        params.cliente = cliente;
    }
    if (data_inicio) {
        params.data_inicio = data_inicio;
    }
    if (data_fim) {
        params.data_fim = data_fim;
    }

    const response = await apiClient.get<ApiPedido[]>('/pedidos/', { params });
    logger.debug('[fetchOrdersPaginated] Response status:', response.status);
    logger.debug('[fetchOrdersPaginated] Response data type:', typeof response.data);
    logger.debug('[fetchOrdersPaginated] Response data is array:', Array.isArray(response.data));
    logger.debug('[fetchOrdersPaginated] Response data length:', Array.isArray(response.data) ? response.data.length : 'not array');
    logger.debug('[fetchOrdersPaginated] Response data sample:', Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : 'empty');

    const allData = (response.data ?? []).map(mapPedidoFromApi);
    logger.debug('[fetchOrdersPaginated] Mapped data length:', allData.length);
    logger.debug('[fetchOrdersPaginated] Mapped data sample:', allData.length > 0 ? allData[0] : 'empty');

    // Verifica se há mais páginas
    const hasNextPage = allData.length > pageSize;
    const paginatedData = hasNextPage ? allData.slice(0, pageSize) : allData;

    // Estimativa conservadora do total
    // Se estamos na página 1 e não tem próxima, sabemos o total exato
    // Caso contrário, estimamos baseado no que temos
    let total: number;
    let totalPages: number;

    if (!hasNextPage) {
        // Última página - sabemos o total exato
        total = skip + paginatedData.length;
        totalPages = Math.max(1, Math.ceil(total / pageSize));
    } else {
        // Há mais páginas - estimativa baseada na página atual
        // Assume pelo menos mais uma página
        total = skip + pageSize + pageSize;
        totalPages = Math.ceil(total / pageSize);
    }

    return {
        orders: paginatedData,
        total,
        page,
        page_size: pageSize,
        total_pages: totalPages,
    };
};

// Exporting the API object
export const ordersApi = {
    getOrders: async (): Promise<OrderWithItems[]> => {
        requireSessionToken();
        const response = await apiClient.get<ApiPedido[]>('/pedidos/');
        return (response.data ?? []).map(mapPedidoFromApi);
    },

    getOrdersPaginated: async (
        page: number = 1,
        pageSize: number = DEFAULT_PAGE_SIZE,
        status?: OrderStatus,
        cliente?: string,
        data_inicio?: string,
        data_fim?: string
    ): Promise<PaginatedOrders> => {
        return await fetchOrdersPaginated(page, pageSize, status, cliente, data_inicio, data_fim);
    },

    getOrderById: async (orderId: number): Promise<OrderWithItems> => {
        requireSessionToken();

        const cached = ordersByIdCache.get(orderId);
        if (cached && isCacheFresh(cached, ORDER_BY_ID_CACHE_TTL_MS)) {
            logger.debug(`[getOrderById] Cache hit para pedido ${orderId}`);
            return cached.data;
        }

        try {
            const jsonResponse = await apiClient.get(`/pedidos/${orderId}/json`);
            const mappedOrder = mapPedidoFromApi(jsonResponse.data);
            setCacheWithLimit(orderId, mappedOrder);
            return mappedOrder;
        } catch {
            const response = await apiClient.get<ApiPedido>(`/pedidos/${orderId}`);
            const mappedOrder = mapPedidoFromApi(response.data);
            setCacheWithLimit(orderId, mappedOrder);
            return mappedOrder;
        }
    },
    getOrderByIdFresh: async (orderId: number): Promise<OrderWithItems> => {
        requireSessionToken();
        const response = await apiClient.get<ApiPedido>(`/pedidos/${orderId}`);
        return mapPedidoFromApi(response.data);
    },

    getOrdersByDeliveryDateRange: async (
        startDate: string,
        endDate?: string
    ): Promise<OrderWithItems[]> => {
        requireSessionToken();

        const params: FetchOrdersParams = {
            data_inicio: startDate,
            data_fim: endDate || startDate,
            limit: 1000, // Limite razoável para relatórios
        };

        const response = await apiClient.get<ApiPedido[]>('/pedidos/', { params });
        return (response.data ?? []).map(mapPedidoFromApi);
    },

    createOrder: async (request: CreateOrderRequest): Promise<OrderWithItems> => {
        requireSessionToken();
        const payload = buildPedidoCreatePayload(request);
        const response = await apiClient.post<ApiPedido>('/pedidos/', payload);
        const order = mapPedidoFromApi(response.data);

        try {
            await apiClient.post(`/pedidos/save-json/${order.id}`, order);
        } catch (error) {
            logger.warn('[api.createOrder] Erro ao salvar JSON do pedido na API:', error);
        }

        try {
            ordersSocket.broadcastOrderCreated(order.id, order);
        } catch (error) {
            logger.warn('[api.createOrder] Erro ao enviar broadcast WebSocket:', error);
        }

        return order;
    },

    updateOrder: async (request: UpdateOrderRequest): Promise<OrderWithItems> => {
        requireSessionToken();
        const payload = buildPedidoUpdatePayload(request);
        const response = await apiClient.patch<ApiPedido>(`/pedidos/${request.id}`, payload);
        const order = mapPedidoFromApi(response.data);

        try {
            await apiClient.post(`/pedidos/save-json/${order.id}`, order);
        } catch (error) {
            logger.warn('[api.updateOrder] Erro ao salvar JSON do pedido na API:', error);
        }

        try {
            ordersSocket.broadcastOrderUpdate(order.id, order);
        } catch (error) {
            logger.warn('[api.updateOrder] Erro ao enviar broadcast WebSocket:', error);
        }

        return order;
    },

    updateOrderMetadata: async (request: UpdateOrderMetadataRequest): Promise<OrderWithItems> => {
        requireSessionToken();
        const payload = buildMetadataPayload(request);
        const response = await apiClient.patch<ApiPedido>(`/pedidos/${request.id}`, payload);
        return mapPedidoFromApi(response.data);
    },

    updateOrderStatus: async (request: UpdateOrderStatusRequest): Promise<OrderWithItems> => {
        requireSessionToken();
        const payload = buildStatusPayload(request);

        const isFinanceiroUpdate = (request as any)._isFinanceiroUpdate === true;
        if (!isFinanceiroUpdate) {
            delete payload.financeiro;
            delete payload.financeiro_aprovado;
            delete payload.status_financeiro;
            delete payload.financeiroStatus;
        }

        await apiClient.patch<ApiPedido>(`/pedidos/${request.id}`, payload);

        clearOrderCache(request.id);

        const freshResponse = await apiClient.get<ApiPedido>(`/pedidos/${request.id}`);
        const updatedOrder = mapPedidoFromApi(freshResponse.data);

        try {
            await apiClient.post(`/pedidos/save-json/${updatedOrder.id}`, updatedOrder);
        } catch (error) {
            logger.warn('[api.updateOrderStatus] Erro ao salvar JSON do pedido na API:', error);
        }

        try {
            ordersSocket.broadcastOrderStatusUpdate(updatedOrder.id, updatedOrder);
        } catch (error) {
            logger.warn('[api.updateOrderStatus] Erro ao enviar broadcast WebSocket:', error);
        }

        return updatedOrder;
    },

    deleteOrder: async (orderId: number): Promise<boolean> => {
        requireSessionToken();
        await apiClient.delete(`/pedidos/${orderId}`);

        clearOrderCache(orderId);

        try {
            ordersSocket.broadcastOrderDeleted(orderId);
        } catch (error) {
            logger.warn('[api.deleteOrder] Erro ao enviar broadcast WebSocket:', error);
        }

        return true;
    },

    getOrderFicha: async (orderId: number): Promise<OrderFicha> => {
        const order = await ordersApi.getOrderById(orderId);
        return mapOrderToFicha(order);
    },

    updateOrderItem: async (itemId: number, data: any): Promise<boolean> => {
        requireSessionToken();
        const payload = buildItemPayloadFromRequest(data);
        if (data?.pedido_id != null) {
            payload.pedido_id = data.pedido_id;
        }
        await apiClient.patch(`/pedidos/pedido-itens/${itemId}`, payload);
        return true;
    },

    /**
     * Duplica um pedido existente, criando uma cópia com novo número
     */
    duplicateOrder: async (
        orderId: number,
        options?: {
            resetStatus?: boolean;
            newDataEntrada?: string;
            data_entrada?: string;
            data_entrega?: string;
        }
    ): Promise<OrderWithItems> => {
        requireSessionToken();

        // Busca o pedido original
        const original = await ordersApi.getOrderById(orderId);

        // Prepara os itens para o novo pedido (remove IDs)
        const newItems = original.items.map((item) => ({
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tipo_producao: item.tipo_producao,
            descricao: item.descricao,
            largura: item.largura,
            altura: item.altura,
            metro_quadrado: item.metro_quadrado,
            vendedor: item.vendedor,
            designer: item.designer,
            tecido: item.tecido,
            overloque: item.overloque,
            elastico: item.elastico,
            tipo_acabamento: item.tipo_acabamento,
            quantidade_ilhos: item.quantidade_ilhos,
            espaco_ilhos: item.espaco_ilhos,
            valor_ilhos: item.valor_ilhos,
            quantidade_cordinha: item.quantidade_cordinha,
            espaco_cordinha: item.espaco_cordinha,
            valor_cordinha: item.valor_cordinha,
            observacao: item.observacao,
            imagem: item.imagem,
            legenda_imagem: item.legenda_imagem,
            quantidade_paineis: item.quantidade_paineis,
            valor_painel: item.valor_painel,
            valores_adicionais: item.valores_adicionais,
            valor_unitario: item.valor_unitario,
            emenda: item.emenda,
            emenda_qtd: item.emenda_qtd,
            terceirizado: item.terceirizado,
            acabamento_lona: item.acabamento_lona,
            valor_lona: item.valor_lona,
            quantidade_lona: item.quantidade_lona,
            outros_valores_lona: item.outros_valores_lona,
            tipo_adesivo: item.tipo_adesivo,
            valor_adesivo: item.valor_adesivo,
            quantidade_adesivo: item.quantidade_adesivo,
            outros_valores_adesivo: item.outros_valores_adesivo,
            ziper: item.ziper,
            cordinha_extra: item.cordinha_extra,
            alcinha: item.alcinha,
            toalha_pronta: item.toalha_pronta,
            acabamento_totem: item.acabamento_totem,
            acabamento_totem_outro: item.acabamento_totem_outro,
            valor_totem: item.valor_totem,
            quantidade_totem: item.quantidade_totem,
            outros_valores_totem: item.outros_valores_totem,
            composicao_tecidos: item.composicao_tecidos,
            rip_maquina: item.rip_maquina,
            data_impressao: item.data_impressao,
            perfil_cor: item.perfil_cor,
            tecido_fornecedor: item.tecido_fornecedor,
        }));

        // Cria o novo pedido
        const createRequest: CreateOrderRequest = {
            cliente: original.cliente || original.customer_name,
            cidade_cliente: original.cidade_cliente || original.address,
            estado_cliente: original.estado_cliente,
            telefone_cliente: original.telefone_cliente,
            data_entrada: options?.data_entrada || options?.newDataEntrada || new Date().toISOString().split('T')[0],
            data_entrega: options?.data_entrega || original.data_entrega,
            forma_envio: original.forma_envio,
            forma_pagamento_id: original.forma_pagamento_id,
            prioridade: original.prioridade,
            observacao: original.observacao ? `[Cópia do pedido #${original.numero || original.id}] ${original.observacao}` : `Cópia do pedido #${original.numero || original.id}`,
            status: options?.resetStatus ? OrderStatus.Pendente : original.status,
            valor_frete: typeof original.valor_frete === 'string' ? parseFloat(original.valor_frete) : original.valor_frete,
            items: newItems,
        };

        const newOrder = await ordersApi.createOrder(createRequest);
        logger.info(`[duplicateOrder] Pedido ${orderId} duplicado como ${newOrder.id}`);

        return newOrder;
    },

    /**
     * Cria uma ficha de reposição baseada em um pedido existente
     * Reseta o status para Pendente e usa a data atual como data de entrada
     */
    createReplacementOrder: async (
        orderId: number,
        options?: {
            data_entrega?: string;
            zeroValues?: boolean;
        }
    ): Promise<OrderWithItems> => {
        requireSessionToken();

        // Busca o pedido original
        const original = await ordersApi.getOrderById(orderId);

        // Prepara os itens para o novo pedido (remove IDs)
        const newItems = original.items.map((item) => ({
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: options?.zeroValues ? 0 : item.unit_price,
            tipo_producao: item.tipo_producao,
            descricao: item.descricao,
            largura: item.largura,
            altura: item.altura,
            metro_quadrado: item.metro_quadrado,
            vendedor: item.vendedor,
            designer: item.designer,
            tecido: item.tecido,
            overloque: item.overloque,
            elastico: item.elastico,
            tipo_acabamento: item.tipo_acabamento,
            quantidade_ilhos: item.quantidade_ilhos,
            espaco_ilhos: item.espaco_ilhos,
            valor_ilhos: options?.zeroValues ? "0" : item.valor_ilhos,
            quantidade_cordinha: item.quantidade_cordinha,
            espaco_cordinha: item.espaco_cordinha,
            valor_cordinha: options?.zeroValues ? "0" : item.valor_cordinha,
            observacao: item.observacao,
            imagem: item.imagem,
            legenda_imagem: item.legenda_imagem,
            quantidade_paineis: item.quantidade_paineis,
            valor_painel: options?.zeroValues ? "0" : item.valor_painel,
            valores_adicionais: options?.zeroValues ? "0" : item.valores_adicionais,
            valor_unitario: options?.zeroValues ? "0" : item.valor_unitario,
            emenda: item.emenda,
            emenda_qtd: item.emenda_qtd,
            terceirizado: item.terceirizado,
            acabamento_lona: item.acabamento_lona,
            valor_lona: options?.zeroValues ? "0" : item.valor_lona,
            quantidade_lona: item.quantidade_lona,
            outros_valores_lona: options?.zeroValues ? "0" : item.outros_valores_lona,
            tipo_adesivo: item.tipo_adesivo,
            valor_adesivo: options?.zeroValues ? "0" : item.valor_adesivo,
            quantidade_adesivo: item.quantidade_adesivo,
            outros_valores_adesivo: options?.zeroValues ? "0" : item.outros_valores_adesivo,
            ziper: item.ziper,
            cordinha_extra: item.cordinha_extra,
            alcinha: item.alcinha,
            toalha_pronta: item.toalha_pronta,
            acabamento_totem: item.acabamento_totem,
            acabamento_totem_outro: item.acabamento_totem_outro,
            valor_totem: options?.zeroValues ? "0" : item.valor_totem,
            quantidade_totem: item.quantidade_totem,
            outros_valores_totem: options?.zeroValues ? "0" : item.outros_valores_totem,
            composicao_tecidos: item.composicao_tecidos,
            rip_maquina: item.rip_maquina,
            data_impressao: item.data_impressao,
            perfil_cor: item.perfil_cor,
            tecido_fornecedor: item.tecido_fornecedor,
        }));

        // Cria o novo pedido de reposição
        const createRequest: CreateOrderRequest = {
            cliente: original.cliente || original.customer_name,
            cidade_cliente: original.cidade_cliente || original.address,
            estado_cliente: original.estado_cliente,
            telefone_cliente: original.telefone_cliente,
            data_entrada: new Date().toISOString().split('T')[0], // Data atual
            data_entrega: options?.data_entrega || original.data_entrega,
            forma_envio: original.forma_envio,
            forma_pagamento_id: original.forma_pagamento_id,
            prioridade: original.prioridade,
            observacao: `[REPOSIÇÃO${options?.zeroValues ? ' CORTESIA' : ''}] Baseado no pedido #${original.numero || original.id}${original.observacao ? ' - ' + original.observacao : ''}`,
            status: OrderStatus.Pendente, // Sempre resetado para Pendente
            valor_frete: options?.zeroValues ? 0 : (typeof original.valor_frete === 'string' ? parseFloat(original.valor_frete) : original.valor_frete),
            items: newItems,
        };

        const newOrder = await ordersApi.createOrder(createRequest);
        logger.info(`[createReplacementOrder] Ficha de reposição criada para pedido ${orderId} como ${newOrder.id}`);

        return newOrder;
    },
};
