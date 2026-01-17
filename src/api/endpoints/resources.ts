import { apiClient } from '../client';
import {
    MaterialApi,
    MaterialEntity,
    MaterialPayload,
    DesignerApi,
    DesignerEntity,
    DesignerPayload,
    VendedorApi,
    VendedorEntity,
    VendedorPayload,
    FormaEnvioApi,
    FormaEnvioEntity,
    FormaEnvioPayload,
    FormaPagamentoApi,
    FormaPagamentoEntity,
    FormaPagamentoPayload,
    UserApi,
    UserEntity,
    UserCreatePayload,
    UserUpdatePayload,
    TipoProducaoApi,
    TipoProducaoEntity,
    TipoProducaoPayload,
    FichaTemplatesConfig,
    RelatorioTemplatesConfig,
    ReportRequestPayload,
    ReportResponse,
} from '../types';
import {
    mapMaterialFromApi,
    buildMaterialCreatePayload,
    buildMaterialUpdatePayload,
    mapDesignerFromApi,
    buildDesignerCreatePayload,
    buildDesignerUpdatePayload,
    mapVendedorFromApi,
    buildVendedorCreatePayload,
    buildVendedorUpdatePayload,
    mapFormaEnvioFromApi,
    buildFormaEnvioCreatePayload,
    buildFormaEnvioUpdatePayload,
    mapFormaPagamentoFromApi,
    buildFormaPagamentoCreatePayload,
    buildFormaPagamentoUpdatePayload,
    mapUserFromApi,
    buildUserCreatePayload,
    buildUserUpdatePayload,
    mapTipoProducaoFromApi,
    buildTipoProducaoCreatePayload,
    buildTipoProducaoUpdatePayload,
} from '../mappers';
import { useAuthStore } from '../../store/authStore';
import { setAuthToken } from '../client';
import { logger } from '../../utils/logger';

// Constants
const MATERIAIS_LIST_ENDPOINT = '/materiais/';
const MATERIAIS_ENDPOINT = '/materiais';
const DESIGNERS_LIST_ENDPOINT = '/designers/';
const DESIGNERS_ENDPOINT = '/designers';

// Cache System
interface TimedCache<T> {
    data: T;
    timestamp: number;
}
const RESOURCE_CACHE_TTL_MS = 60_000;

const isCacheFresh = <T>(cache: TimedCache<T> | null, ttlMs: number = RESOURCE_CACHE_TTL_MS): cache is TimedCache<T> => {
    if (!cache) return false;
    return Date.now() - cache.timestamp < ttlMs;
};

const createCacheEntry = <T>(data: T): TimedCache<T> => ({
    data,
    timestamp: Date.now(),
});

let materiaisCache: TimedCache<MaterialApi[]> | null = null;
let designersCache: TimedCache<DesignerApi[]> | null = null;
let vendedoresCache: TimedCache<Array<{ id: number; nome: string }>> | null = null;
let tiposPagamentoCache: TimedCache<Array<{ id: number; nome: string }>> | null = null;

const clearMateriaisCache = () => { materiaisCache = null; };
const clearDesignersCache = () => { designersCache = null; };

const requireSessionToken = (): string => {
    const token = useAuthStore.getState().sessionToken;
    if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    setAuthToken(token);
    return token;
};

// Internal raw fetchers for caching
const fetchMateriaisRaw = async (): Promise<MaterialApi[]> => {
    requireSessionToken();
    if (isCacheFresh(materiaisCache)) {
        return materiaisCache.data;
    }
    const response = await apiClient.get<MaterialApi[]>(MATERIAIS_LIST_ENDPOINT);
    const data = response.data ?? [];
    materiaisCache = createCacheEntry(data);
    return data;
};

const fetchDesignersRaw = async (): Promise<DesignerApi[]> => {
    requireSessionToken();
    if (isCacheFresh(designersCache)) {
        return designersCache.data;
    }
    const response = await apiClient.get<DesignerApi[]>(DESIGNERS_LIST_ENDPOINT);
    const data = response.data ?? [];
    designersCache = createCacheEntry(data);
    return data;
};

export const resourcesApi = {
    // --- Materiais ---
    getMateriais: async (): Promise<MaterialEntity[]> => {
        const raw = await fetchMateriaisRaw();
        return raw.map(mapMaterialFromApi);
    },

    createMaterial: async (request: MaterialPayload): Promise<MaterialEntity> => {
        requireSessionToken();
        const payload = buildMaterialCreatePayload(request);
        const response = await apiClient.post<MaterialApi>(MATERIAIS_LIST_ENDPOINT, payload);
        const material = mapMaterialFromApi(response.data);
        clearMateriaisCache();
        return material;
    },

    updateMaterial: async (request: MaterialPayload & { id: number }): Promise<MaterialEntity> => {
        requireSessionToken();
        const { id, ...rest } = request;
        const payload = buildMaterialUpdatePayload(rest);
        const response = await apiClient.patch<MaterialApi>(`${MATERIAIS_ENDPOINT}/${id}`, payload);
        const material = mapMaterialFromApi(response.data);
        clearMateriaisCache();
        return material;
    },

    deleteMaterial: async (materialId: number): Promise<boolean> => {
        requireSessionToken();
        await apiClient.delete(`${MATERIAIS_ENDPOINT}/${materialId}`);
        clearMateriaisCache();
        return true;
    },

    getTecidosAtivos: async (): Promise<string[]> => {
        return resourcesApi.getMateriaisAtivosPorTipo('tecido');
    },

    getMateriaisAtivosPorTipo: async (tipo: string): Promise<string[]> => {
        const normalizedTipo = String(tipo ?? '').trim().toLowerCase();
        if (!normalizedTipo) return [];

        const materiais = await fetchMateriaisRaw();
        const unique = new Set<string>();

        materiais.forEach((material) => {
            if (!material?.ativo) return;
            const materialTipo = String(material.tipo ?? '').trim().toLowerCase();
            if (materialTipo !== normalizedTipo) return;
            const nome = String(material.nome ?? '').trim();
            if (!nome) return;
            unique.add(nome);
        });

        return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },

    // --- Designers ---
    getDesigners: async (): Promise<DesignerEntity[]> => {
        const raw = await fetchDesignersRaw();
        return raw.map(mapDesignerFromApi);
    },

    getDesignersAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
        const designers = await fetchDesignersRaw();
        const unique = new Map<string, DesignerApi>();
        designers.forEach((designer) => {
            if (!designer?.ativo) return;
            const nome = designer.nome?.trim();
            if (!nome) return;
            const key = nome.toLowerCase();
            if (!unique.has(key)) {
                unique.set(key, designer);
            }
        });
        return Array.from(unique.values())
            .map((designer) => ({ id: designer.id, nome: designer.nome.trim() }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },

    createDesigner: async (request: DesignerPayload): Promise<DesignerEntity> => {
        requireSessionToken();
        const payload = buildDesignerCreatePayload(request);
        const response = await apiClient.post<DesignerApi>(DESIGNERS_LIST_ENDPOINT, payload);
        const designer = mapDesignerFromApi(response.data);
        clearDesignersCache();
        return designer;
    },

    updateDesigner: async (request: DesignerPayload & { id: number }): Promise<DesignerEntity> => {
        requireSessionToken();
        const { id, ...rest } = request;
        const payload = buildDesignerUpdatePayload(rest);
        const response = await apiClient.patch<DesignerApi>(`${DESIGNERS_ENDPOINT}/${id}`, payload);
        const designer = mapDesignerFromApi(response.data);
        clearDesignersCache();
        return designer;
    },

    deleteDesigner: async (designerId: number): Promise<boolean> => {
        requireSessionToken();
        await apiClient.delete(`${DESIGNERS_ENDPOINT}/${designerId}`);
        clearDesignersCache();
        return true;
    },

    // --- Vendedores ---
    getVendedores: async (): Promise<VendedorEntity[]> => {
        requireSessionToken();
        const response = await apiClient.get<VendedorApi[]>('/vendedores');
        return (response.data ?? []).map(mapVendedorFromApi);
    },

    getVendedoresAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
        requireSessionToken();
        if (isCacheFresh(vendedoresCache)) {
            return vendedoresCache.data;
        }
        const response = await apiClient.get<VendedorApi[]>('/vendedores/ativos');
        const result = (response.data ?? [])
            .filter((vendedor) => Boolean(vendedor?.nome))
            .map((vendedor) => ({ id: vendedor.id, nome: vendedor.nome.trim() }))
            .filter((vendedor) => vendedor.nome.length > 0);

        vendedoresCache = createCacheEntry(result);
        return result;
    },

    createVendedor: async (request: VendedorPayload): Promise<VendedorEntity> => {
        requireSessionToken();
        const payload = buildVendedorCreatePayload(request);
        const response = await apiClient.post<VendedorApi>('/vendedores', payload);
        return mapVendedorFromApi(response.data);
    },

    updateVendedor: async (request: VendedorPayload & { id: number }): Promise<VendedorEntity> => {
        requireSessionToken();
        const { id, ...rest } = request;
        const payload = buildVendedorUpdatePayload(rest);
        const response = await apiClient.patch<VendedorApi>(`/vendedores/${id}`, payload);
        return mapVendedorFromApi(response.data);
    },

    deleteVendedor: async (vendedorId: number): Promise<boolean> => {
        requireSessionToken();
        await apiClient.delete(`/vendedores/${vendedorId}`);
        return true;
    },

    // --- Formas de Envio ---
    getFormasEnvio: async (): Promise<FormaEnvioEntity[]> => {
        requireSessionToken();
        const response = await apiClient.get<FormaEnvioApi[]>('/tipos-envios');
        return (response.data ?? []).map(mapFormaEnvioFromApi);
    },

    getFormasEnvioAtivas: async (): Promise<Array<{ id: number; nome: string; valor: number }>> => {
        requireSessionToken();
        const response = await apiClient.get<FormaEnvioApi[]>('/tipos-envios/ativos');
        return (response.data ?? [])
            .filter((forma) => Boolean(forma?.nome))
            .map((forma) => ({
                id: forma.id,
                nome: (forma.nome ?? '').trim(),
                valor: Number(forma.valor ?? 0),
            }))
            .filter((forma) => forma.nome.length > 0);
    },

    createFormaEnvio: async (request: FormaEnvioPayload): Promise<FormaEnvioEntity> => {
        requireSessionToken();
        const payload = buildFormaEnvioCreatePayload(request);
        const response = await apiClient.post<FormaEnvioApi>('/tipos-envios', payload);
        return mapFormaEnvioFromApi(response.data);
    },

    updateFormaEnvio: async (request: FormaEnvioPayload & { id: number }): Promise<FormaEnvioEntity> => {
        requireSessionToken();
        const { id, ...rest } = request;
        const payload = buildFormaEnvioUpdatePayload(rest);
        const response = await apiClient.patch<FormaEnvioApi>(`/tipos-envios/${id}`, payload);
        return mapFormaEnvioFromApi(response.data);
    },

    deleteFormaEnvio: async (formaId: number): Promise<boolean> => {
        requireSessionToken();
        await apiClient.delete(`/tipos-envios/${formaId}`);
        return true;
    },

    // --- Formas de Pagamento ---
    getFormasPagamento: async (): Promise<FormaPagamentoEntity[]> => {
        requireSessionToken();
        const response = await apiClient.get<FormaPagamentoApi[]>('/tipos-pagamentos');
        return (response.data ?? []).map(mapFormaPagamentoFromApi);
    },

    getFormasPagamentoAtivas: async (): Promise<Array<{ id: number; nome: string }>> => {
        requireSessionToken();
        if (isCacheFresh(tiposPagamentoCache)) {
            return tiposPagamentoCache.data;
        }
        const response = await apiClient.get<FormaPagamentoApi[]>('/tipos-pagamentos/ativos');
        const result = (response.data ?? [])
            .filter((forma) => Boolean(forma?.nome))
            .map((forma) => ({ id: forma.id, nome: forma.nome }));

        tiposPagamentoCache = createCacheEntry(result);
        return result;
    },

    createFormaPagamento: async (request: FormaPagamentoPayload): Promise<FormaPagamentoEntity> => {
        requireSessionToken();
        const payload = buildFormaPagamentoCreatePayload(request);
        const response = await apiClient.post<FormaPagamentoApi>('/tipos-pagamentos', payload);
        return mapFormaPagamentoFromApi(response.data);
    },

    updateFormaPagamento: async (request: FormaPagamentoPayload & { id: number }): Promise<FormaPagamentoEntity> => {
        requireSessionToken();
        const { id, ...rest } = request;
        const payload = buildFormaPagamentoUpdatePayload(rest);
        const response = await apiClient.patch<FormaPagamentoApi>(`/tipos-pagamentos/${id}`, payload);
        return mapFormaPagamentoFromApi(response.data);
    },

    deleteFormaPagamento: async (formaId: number): Promise<boolean> => {
        requireSessionToken();
        await apiClient.delete(`/tipos-pagamentos/${formaId}`);
        return true;
    },

    // --- Usuários ---
    getUsers: async (): Promise<UserEntity[]> => {
        requireSessionToken();
        const response = await apiClient.get<UserApi[]>('/users');
        return (response.data ?? []).map(mapUserFromApi);
    },

    createUser: async (request: UserCreatePayload): Promise<UserEntity> => {
        requireSessionToken();
        const payload = buildUserCreatePayload(request);
        const response = await apiClient.post<UserApi>('/users', payload);
        return mapUserFromApi(response.data);
    },

    updateUser: async (request: UserUpdatePayload & { id: number }): Promise<UserEntity> => {
        requireSessionToken();
        const { id, ...rest } = request;
        const payload = buildUserUpdatePayload(rest);
        const response = await apiClient.patch<UserApi>(`/users/${id}`, payload);
        return mapUserFromApi(response.data);
    },

    deleteUser: async (userId: number): Promise<boolean> => {
        requireSessionToken();
        if (!userId || typeof userId !== 'number' || isNaN(userId) || userId <= 0) {
            throw new Error('ID do usuário inválido');
        }
        const url = `/users/${encodeURIComponent(userId)}`;
        try {
            await apiClient.delete(url);
            return true;
        } catch (error: any) {
            logger.error('Erro ao excluir usuário:', error);
            if (error?.response?.data?.detail) throw new Error(error.response.data.detail);
            if (error?.message) throw error;
            throw new Error('Erro desconhecido ao excluir usuário');
        }
    },

    // --- Tipos de Produção ---
    getTiposProducao: async (): Promise<TipoProducaoEntity[]> => {
        requireSessionToken();
        const response = await apiClient.get<TipoProducaoApi[]>('/producoes');
        return (response.data ?? []).map(mapTipoProducaoFromApi);
    },

    getTiposProducaoAtivos: async (): Promise<Array<{ value: string; label: string }>> => {
        try {
            const response = await apiClient.get<TipoProducaoApi[]>('/producoes/ativos');
            return (response.data ?? []).map(tipo => ({
                value: tipo.name.toLowerCase(),
                label: tipo.description || tipo.name,
            }));
        } catch (error) {
            logger.error('Erro ao buscar tipos de produção ativos:', error);
            return [];
        }
    },

    createTipoProducao: async (request: TipoProducaoPayload): Promise<TipoProducaoEntity> => {
        requireSessionToken();
        const payload = buildTipoProducaoCreatePayload(request);
        const response = await apiClient.post<TipoProducaoApi>('/producoes', payload);
        return mapTipoProducaoFromApi(response.data);
    },

    updateTipoProducao: async (request: TipoProducaoPayload & { id: number }): Promise<TipoProducaoEntity> => {
        requireSessionToken();
        const { id, ...rest } = request;
        const payload = buildTipoProducaoUpdatePayload(rest);
        const response = await apiClient.patch<TipoProducaoApi>(`/producoes/${id}`, payload);
        return mapTipoProducaoFromApi(response.data);
    },

    deleteTipoProducao: async (tipoId: number): Promise<boolean> => {
        requireSessionToken();
        await apiClient.delete(`/producoes/${tipoId}`);
        return true;
    },

    // --- Templates & Relatórios ---
    getFichaTemplates: async (): Promise<FichaTemplatesConfig> => {
        requireSessionToken();
        const response = await apiClient.get<FichaTemplatesConfig>('/fichas/templates');
        return response.data;
    },

    saveFichaTemplates: async (payload: FichaTemplatesConfig): Promise<FichaTemplatesConfig> => {
        requireSessionToken();
        const response = await apiClient.put<FichaTemplatesConfig>('/fichas/templates', payload);
        return response.data;
    },

    saveFichaTemplatesHTML: async (
        htmlContent: { geral: string; resumo: string }
    ): Promise<{ message: string; files: { geral?: string; resumo?: string } }> => {
        requireSessionToken();
        const response = await apiClient.put<{ message: string; files: { geral?: string; resumo?: string } }>(
            '/fichas/templates/html',
            htmlContent
        );
        return response.data;
    },

    getFichaTemplateHTML: async (templateType: 'geral' | 'resumo'): Promise<{ html: string | null; exists: boolean }> => {
        requireSessionToken();
        try {
            const response = await apiClient.get<{ html: string | null; exists: boolean }>(
                `/fichas/templates/html/${templateType}/content`
            );
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return { html: null, exists: false };
            }
            logger.warn('[api] Erro ao buscar template HTML editado:', error);
            return { html: null, exists: false };
        }
    },

    getRelatorioTemplates: async (): Promise<RelatorioTemplatesConfig> => {
        requireSessionToken();
        const response = await apiClient.get<RelatorioTemplatesConfig>('/relatorios/templates');
        return response.data;
    },

    saveRelatorioTemplates: async (payload: RelatorioTemplatesConfig): Promise<RelatorioTemplatesConfig> => {
        requireSessionToken();
        const response = await apiClient.put<RelatorioTemplatesConfig>('/relatorios/templates', payload);
        return response.data;
    },

    generateReport: async (request: ReportRequestPayload): Promise<ReportResponse> => {
        requireSessionToken();
        const params: Record<string, any> = {
            report_type: request.report_type,
            date_mode: request.date_mode || 'entrada',
        };
        if (request.start_date) params.start_date = request.start_date;
        if (request.end_date) params.end_date = request.end_date;
        if (request.status && request.status !== 'Todos') params.status = request.status;
        if (request.vendedor) params.vendedor = request.vendedor;
        if (request.designer) params.designer = request.designer;
        if (request.cliente) params.cliente = request.cliente;
        if (request.frete_distribution) params.frete_distribution = request.frete_distribution;

        const response = await apiClient.get<ReportResponse>('/relatorios-fechamentos/pedidos/relatorio', { params });
        return response.data;
    },

    getRelatorioSemanal: async (params: {
        start_date?: string;
        end_date?: string;
        date_mode?: string;
        cliente?: string;
    }): Promise<any> => {
        requireSessionToken();
        const requestParams = {
            ...params,
            date_mode: params.date_mode || 'entrada',
        };
        const response = await apiClient.get('/relatorios-fechamentos/pedidos/relatorio-semanal', { params: requestParams });
        return response.data;
    },

    getFechamentoStatistics: async (params: {
        start_date?: string;
        end_date?: string;
        status?: string;
        date_mode?: string;
        vendedor?: string;
        designer?: string;
        cliente?: string;
    }): Promise<{
        total_pedidos: number;
        total_items: number;
        total_revenue: number;
        total_frete: number;
        total_servico: number;
        average_ticket: number;
    }> => {
        requireSessionToken();
        const response = await apiClient.get('/relatorios/fechamentos/statistics', { params });
        return response.data;
    },

    getFechamentoTrends: async (params: {
        start_date?: string;
        end_date?: string;
        status?: string;
        date_mode?: string;
        group_by?: 'day' | 'week' | 'month';
    }): Promise<{
        trends: Array<{
            period: string;
            pedidos: number;
            revenue: number;
            frete: number;
            servico: number;
        }>;
    }> => {
        requireSessionToken();
        const response = await apiClient.get('/relatorios/fechamentos/trends', { params });
        return response.data;
    },

    getFechamentoRankings: async (
        category: 'vendedor' | 'designer' | 'cliente' | 'tipo_producao',
        params: {
            start_date?: string;
            end_date?: string;
            status?: string;
            date_mode?: string;
            limit?: number;
        },
    ): Promise<{
        category: string;
        rankings: Array<{
            name: string;
            pedidos: number;
            items: number;
            revenue: number;
        }>;
    }> => {
        requireSessionToken();
        const response = await apiClient.get(`/relatorios/fechamentos/rankings/${category}`, { params });
        return response.data;
    },
};
