import { apiClient } from '../client';
import { MachineApi, MachinePayload, MachineDashboardData } from '../types';

export const maquinasApi = {
    /**
     * Lista todas as máquinas
     */
    async getAll() {
        const response = await apiClient.get<MachineApi[]>('/maquinas/');
        return response.data;
    },

    /**
     * Lista apenas máquinas ativas
     */
    async getAtivas() {
        const response = await apiClient.get<MachineApi[]>('/maquinas/ativos');
        return response.data;
    },

    /**
     * Busca uma máquina pelo ID
     */
    async getById(id: number) {
        const response = await apiClient.get<MachineApi>(`/maquinas/${id}`);
        return response.data;
    },

    /**
     * Cria uma nova máquina
     */
    async create(payload: MachinePayload) {
        const response = await apiClient.post<MachineApi>('/maquinas/', payload);
        return response.data;
    },

    /**
     * Atualiza uma máquina existente
     */
    async update(id: number, payload: Partial<MachinePayload>) {
        const response = await apiClient.patch<MachineApi>(`/maquinas/${id}`, payload);
        return response.data;
    },

    /**
     * Remove uma máquina
     */
    async delete(id: number) {
        await apiClient.delete(`/maquinas/${id}`);
    },

    /**
     * Retorna o dashboard de produção agrupado por máquina
     */
    async getDashboardOverview() {
        const response = await apiClient.get<MachineDashboardData[]>('/maquinas/dashboard/overview');
        return response.data;
    },
};
