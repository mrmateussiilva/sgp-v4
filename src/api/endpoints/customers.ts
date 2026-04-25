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
    getClientes: async (): Promise<Cliente[]> => {
        requireSessionToken();
        const response = await hybridClient.get<Cliente[]>('/clientes/');
        return response ?? [];
    },

    getClienteById: async (clienteId: number): Promise<Cliente> => {
        requireSessionToken();
        return await hybridClient.get<Cliente>(`/clientes/${clienteId}`);
    },

    createCliente: async (request: CreateClienteRequest): Promise<Cliente> => {
        requireSessionToken();
        return await hybridClient.post<Cliente>('/clientes/', request);
    },

    updateCliente: async (request: UpdateClienteRequest): Promise<Cliente> => {
        requireSessionToken();
        return await hybridClient.patch<Cliente>(`/clientes/${request.id}`, request);
    },

    deleteCliente: async (clienteId: number): Promise<boolean> => {
        requireSessionToken();
        await hybridClient.delete<null>(`/clientes/${clienteId}`);
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
