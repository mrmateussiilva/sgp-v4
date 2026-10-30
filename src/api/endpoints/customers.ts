import {
    Cliente,
    CreateClienteRequest,
    UpdateClienteRequest,
    BulkClienteImportItem,
    BulkClienteImportResult,
    BulkClienteImportError,
} from '../types';
import { useAuthStore } from '../../store/authStore';
import { setAuthToken } from '../client';
import { hybridClient } from '../../services/hybridClient';

interface TimedCache<T> {
    data: T;
    timestamp: number;
}

const CLIENTES_CACHE_TTL_MS = 60_000;
let clientesCache: TimedCache<Cliente[]> | null = null;

export const getCachedClientes = (): Cliente[] | null => {
    return clientesCache ? clientesCache.data : null;
};

export const isClientesCacheFresh = (): boolean => {
    if (!clientesCache) return false;
    return Date.now() - clientesCache.timestamp < CLIENTES_CACHE_TTL_MS;
};

export const clearClientesCache = (): void => {
    clientesCache = null;
};

const requireSessionToken = (): string => {
    const token = useAuthStore.getState().sessionToken;
    if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    // setAuthToken triggers the rustClient sync
    setAuthToken(token);
    return token;
};

const buildBulkImportError = (index: number, item: BulkClienteImportItem, error: unknown): BulkClienteImportError => {
    const message = error instanceof Error
        ? error.message
        : 'Falha nativa desconhecida ao importar cliente';

    return {
        index,
        nome: item.nome,
        message,
    };
};

export const customersApi = {
    getClientes: async (forceRefresh = false): Promise<Cliente[]> => {
        requireSessionToken();
        if (!forceRefresh && clientesCache && Date.now() - clientesCache.timestamp < CLIENTES_CACHE_TTL_MS) {
            return clientesCache.data;
        }
        const response = await hybridClient.get<Cliente[]>('/clientes/');
        const data = response ?? [];
        clientesCache = {
            data,
            timestamp: Date.now(),
        };
        return data;
    },

    getClienteById: async (clienteId: number): Promise<Cliente> => {
        requireSessionToken();
        return await hybridClient.get<Cliente>(`/clientes/${clienteId}`);
    },

    createCliente: async (request: CreateClienteRequest): Promise<Cliente> => {
        requireSessionToken();
        const created = await hybridClient.post<Cliente>('/clientes/', request);
        clearClientesCache();
        return created;
    },

    updateCliente: async (request: UpdateClienteRequest): Promise<Cliente> => {
        requireSessionToken();
        const updated = await hybridClient.patch<Cliente>(`/clientes/${request.id}`, request);
        clearClientesCache();
        return updated;
    },

    deleteCliente: async (clienteId: number): Promise<boolean> => {
        requireSessionToken();
        await hybridClient.delete<null>(`/clientes/${clienteId}`);
        clearClientesCache();
        return true;
    },

    importClientesBulk: async (clientes: BulkClienteImportItem[]): Promise<BulkClienteImportResult> => {
        const imported: Cliente[] = [];
        const errors: BulkClienteImportError[] = [];

        for (let index = 0; index < clientes.length; index += 1) {
            const item = clientes[index];
            try {
                const created = await customersApi.createCliente({
                    nome: item.nome,
                    cep: item.cep ?? undefined,
                    cidade: item.cidade ?? undefined,
                    estado: item.estado ?? undefined,
                    telefone: item.telefone ?? undefined,
                });
                imported.push(created);
            } catch (error) {
                errors.push(buildBulkImportError(index, item, error));
            }
        }

        clearClientesCache();
        return { imported, errors };
    },
};
