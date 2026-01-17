import { apiClient, onApiFailure } from '../client';
import {
    ApiPedido,
    OrderWithItems,
    PaginatedOrders,
    OrderStatus,
    OrderFilters,
    CreateOrderRequest,
    UpdateOrderRequest,
    UpdateOrderMetadataRequest,
    UpdateOrderStatusRequest,
    ApiOrderStatus,
    OrderFicha,
    CreateOrderItemRequest,
    OrderItem,
    OrderAuditLogEntry,
} from '../types';
import {
    mapPedidoFromApi,
    buildPedidoCreatePayload,
    buildPedidoUpdatePayload,
    buildMetadataPayload,
    buildStatusPayload,
    mapStatusToApi,
    mapOrderToFicha,
} from '../mappers';
import { logger } from '../../utils/logger';
import { ordersSocket } from '../../lib/realtimeOrders';
import { useAuthStore } from '../../store/authStore';
import { setAuthToken } from '../client';

// Cache constants
const CATALOG_CACHE_TTL_MS = 60_000;
const ORDER_BY_ID_CACHE_TTL_MS = 2_000;
const ORDERS_BY_STATUS_CACHE_TTL_MS = 2_000;
const DEFAULT_PAGE_SIZE = 20;

interface TimedCache<T> {
    data: T;
    timestamp: number;
}

const isCacheFresh = <T>(cache: TimedCache<T> | null, ttlMs: number = CATALOG_CACHE_TTL_MS): cache is TimedCache<T> => {
    if (!cache) {
        return false;
    }
    return Date.now() - cache.timestamp < ttlMs;
};

const createCacheEntry = <T>(data: T): TimedCache<T> => ({
    data,
    timestamp: Date.now(),
});

let ordersByIdCache: Map<number, TimedCache<OrderWithItems>> = new Map();
let ordersByStatusCache: Map<string, TimedCache<OrderWithItems[]>> = new Map();

export const clearOrderCache = (orderId: number): void => {
    ordersByIdCache.delete(orderId);
    logger.debug(`[clearOrderCache] 🗑️ Cache invalidado para pedido ${orderId}`);
};

const requireSessionToken = (): string => {
    const token = useAuthStore.getState().sessionToken;
    if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    setAuthToken(token);
    return token;
};

// ... copy of fetchOrderById, fetchOrdersRaw, etc.

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
    const limit = pageSize;

    const params: Record<string, any> = { skip, limit };

    if (status) {
        const statusMap: Record<OrderStatus, string> = {
            [OrderStatus.Pendente]: 'pendente',
            [OrderStatus.EmProcessamento]: 'em_producao',
            [OrderStatus.Concluido]: 'pronto',
            [OrderStatus.Cancelado]: 'cancelado',
        };
        params.status = statusMap[status] || status;
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
    const paginatedData = (response.data ?? []).map(mapPedidoFromApi);

    let total = paginatedData.length;
    let totalPages = 1;

    if (paginatedData.length < pageSize) {
        total = skip + paginatedData.length;
        totalPages = Math.ceil(total / pageSize);
    } else if (page === 1) {
        const countParams = { ...params };
        delete countParams.skip;
        delete countParams.limit;
        countParams.limit = 10000;

        try {
            const countResponse = await apiClient.get<ApiPedido[]>('/pedidos/', { params: countParams });
            total = (countResponse.data ?? []).length;
            totalPages = Math.ceil(total / pageSize);
        } catch (error) {
            logger.warn('Erro ao contar total de pedidos, usando estimativa:', error);
            total = paginatedData.length + pageSize;
            totalPages = Math.ceil(total / pageSize);
        }
    } else {
        total = skip + paginatedData.length + pageSize;
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
            return cached.data;
        }

        try {
            const jsonResponse = await apiClient.get(`/pedidos/${orderId}/json`);
            const mappedOrder = mapPedidoFromApi(jsonResponse.data);
            ordersByIdCache.set(orderId, createCacheEntry(mappedOrder));
            return mappedOrder;
        } catch (error) {
            const response = await apiClient.get<ApiPedido>(`/pedidos/${orderId}`);
            const mappedOrder = mapPedidoFromApi(response.data);
            ordersByIdCache.set(orderId, createCacheEntry(mappedOrder));
            return mappedOrder;
        }
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

        ordersByStatusCache.clear();

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
        ordersByStatusCache.clear();

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
        ordersByStatusCache.clear();

        try {
            ordersSocket.broadcastOrderDeleted(orderId);
        } catch (error) {
            logger.warn('[api.deleteOrder] Erro ao enviar broadcast WebSocket:', error);
        }

        return true;
    },

    getOrderFicha: async (orderId: number): Promise<OrderFicha> => {
        // Reimplement fetchOrderFicha logic locally or import (fetchOrderFicha was a helper in api.ts)
        // Assuming fetchOrderFicha logic is just getById and mapToFicha
        const order = await ordersApi.getOrderById(orderId);
        return mapOrderToFicha(order);
    },
};
