import { invoke } from '@tauri-apps/api/core';
import { logger } from '../utils/logger';
import { isTauri } from '../utils/isTauri';
import { apiClient } from '../api/client';

const formatNativeError = (err: unknown): string =>
    typeof err === 'string' ? err : JSON.stringify(err);

export const hybridClient = {
    get: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
        if (!isTauri()) {
            const resp = await apiClient.get<T>(endpoint, { params });
            return resp.data as unknown as T;
        }

        try {
            return await invoke<T>('rust_api_get', { endpoint, params });
        } catch (err: unknown) {
            const errorMsg = formatNativeError(err);
            logger.error(`[Hybrid Client GET] Erro nativo em ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    },

    post: async <T>(endpoint: string, body?: unknown): Promise<T> => {
        if (!isTauri()) {
            const resp = await apiClient.post<T>(endpoint, body);
            return resp.data as unknown as T;
        }
        try {
            return await invoke<T>('rust_api_mutate', { method: 'POST', endpoint, body });
        } catch (err: unknown) {
            const errorMsg = formatNativeError(err);
            logger.error(`[Hybrid Client POST] Erro nativo em ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    },

    patch: async <T>(endpoint: string, body?: unknown): Promise<T> => {
        if (!isTauri()) {
            const resp = await apiClient.patch<T>(endpoint, body);
            return resp.data as unknown as T;
        }
        try {
            return await invoke<T>('rust_api_mutate', { method: 'PATCH', endpoint, body });
        } catch (err: unknown) {
            const errorMsg = formatNativeError(err);
            logger.error(`[Hybrid Client PATCH] Erro nativo em ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    },

    delete: async <T>(endpoint: string, body?: unknown): Promise<T> => {
        if (!isTauri()) {
            const resp = await apiClient.delete<T>(endpoint, { data: body });
            return resp.data as unknown as T;
        }
        try {
            return await invoke<T>('rust_api_mutate', { method: 'DELETE', endpoint, body });
        } catch (err: unknown) {
            const errorMsg = formatNativeError(err);
            logger.error(`[Hybrid Client DELETE] Erro nativo em ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    },

    syncAuthAndConfig: async (baseUrl: string, token: string | null): Promise<void> => {
        if (!isTauri()) return;
        try {
            await invoke('set_api_config', { baseUrl, token });
        } catch (err: unknown) {
            logger.error(`[Hybrid Client Config Sync] Erro:`, err);
        }
    }
};
