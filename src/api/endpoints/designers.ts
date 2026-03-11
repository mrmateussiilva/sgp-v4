/**
 * designers.ts
 *
 * Módulo dedicado ao Painel de Designers.
 * Usa rotas próprias do backend para evitar buscar todos os pedidos no frontend.
 * NUNCA importa buildItemPayloadFromRequest ou qualquer mapper destrutivo de items.
 */
import { apiClient } from '../client';
import { DesignerArteItem } from '../types';
import { resourcesApi } from './resources';
import { useAuthStore } from '../../store/authStore';
import { setAuthToken } from '../client';

const requireSessionToken = (): string => {
    const token = useAuthStore.getState().sessionToken;
    if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    setAuthToken(token);
    return token;
};

export type StatusArte = 'aguardando' | 'liberado';

export const designersApi = {
    /**
     * Retorna todos os designers cadastrados e ativos no sistema.
     */
    getDesignersAtivos: (): Promise<Array<{ id: number; nome: string }>> => {
        return resourcesApi.getDesignersAtivos();
    },

    /**
     * Busca itens de pedidos atribuídos a um designer via rota dedicada do backend.
     * O backend faz a query filtrada — sem carregar 200 pedidos completos.
     */
    getItensPorDesigner: async (designerName: string): Promise<DesignerArteItem[]> => {
        requireSessionToken();
        const encodedNome = encodeURIComponent(designerName);
        const response = await apiClient.get<DesignerArteItem[]>(`/designers/${encodedNome}/itens`);
        return response.data ?? [];
    },

    /**
     * Atualiza APENAS o status de arte de um item via PATCH cirúrgico no backend.
     * Nunca sobrescreve outros campos do item (quantidade, preço, vendedor, etc.).
     */
    patchStatusArte: async (itemId: number, status: StatusArte): Promise<boolean> => {
        requireSessionToken();
        const legenda = status === 'liberado' ? 'LIBERADO' : 'AGUARDANDO';
        await apiClient.patch(`/designers/itens/${itemId}/status-arte`, { legenda_imagem: legenda });
        return true;
    },

    /**
     * Adiciona um comentário a um item.
     */
    postComentario: async (itemId: number, texto: string, autor: string): Promise<DesignerArteItem> => {
        requireSessionToken();
        const response = await apiClient.post<DesignerArteItem>(`/designers/itens/${itemId}/comentarios`, {
            texto,
            autor
        });
        return response.data;
    },
};
