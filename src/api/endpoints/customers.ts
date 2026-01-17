import { apiClient } from '../client';
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
import { AxiosError } from 'axios';

const requireSessionToken = (): string => {
    const token = useAuthStore.getState().sessionToken;
    if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    setAuthToken(token);
    return token;
};

const buildBulkImportError = (index: number, item: BulkClienteImportItem, error: unknown): BulkClienteImportError => {
    const message =
        error instanceof AxiosError
            ? error.response?.data?.detail ?? error.message
            : error instanceof Error
                ? error.message
                : 'Falha desconhecida ao importar cliente';

    return {
        index,
        nome: item.nome,
        message,
    };
};

export const customersApi = {
    getClientes: async (): Promise<Cliente[]> => {
        requireSessionToken();
        const response = await apiClient.get<Cliente[]>('/clientes/');
        return response.data ?? [];
    },

    getClienteById: async (clienteId: number): Promise<Cliente> => {
        requireSessionToken();
        const response = await apiClient.get<Cliente>(`/clientes/${clienteId}`);
        return response.data;
    },

    createCliente: async (request: CreateClienteRequest): Promise<Cliente> => {
        requireSessionToken();
        const response = await apiClient.post<Cliente>('/clientes/', request);
        return response.data;
    },

    updateCliente: async (request: UpdateClienteRequest): Promise<Cliente> => {
        requireSessionToken();
        const response = await apiClient.patch<Cliente>(`/clientes/${request.id}`, request);
        return response.data;
    },

    deleteCliente: async (clienteId: number): Promise<boolean> => {
        requireSessionToken();
        await apiClient.delete(`/clientes/${clienteId}`);
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

        return { imported, errors };
    },
};
