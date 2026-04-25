import { invoke } from '@tauri-apps/api/core';
import { logger } from '../utils/logger';
import { isTauri } from '../utils/isTauri';

export const rustClient = {
    /**
     * Dispara uma requisição HTTP GET usando o pacote `reqwest` internamente no Rust.
     * Evita headers CORS e limites do navegador.
     */
    get: async <T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> => {
        if (!isTauri()) {
            throw new Error("Rust Client só funciona em ambiente Desktop (Tauri).");
        }

        try {
            // Tauri serializa o params para Hashmap
            const data = await invoke<T>('rust_api_get', { endpoint, params });
            return data;
        } catch (err: any) {
            const errorMsg = typeof err === 'string' ? err : JSON.stringify(err);
            logger.error(`[Rust Client GET] Erro nativo em ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    },

    /**
     * Sincroniza a URL Base e o Token atual da sessão do usuário
     * protegendo o Token dentro de um Mutex no Core Native em C++.
     */
    
    post: async <T>(endpoint: string, body?: any): Promise<T> => {
        if (!isTauri()) throw new Error("Rust Client só funciona em ambiente Desktop (Tauri).");
        try {
            return await invoke<T>('rust_api_mutate', { method: 'POST', endpoint, body });
        } catch (err: any) {
            const errorMsg = typeof err === 'string' ? err : JSON.stringify(err);
            logger.error(`[Rust Client POST] Erro nativo em ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    },

    patch: async <T>(endpoint: string, body?: any): Promise<T> => {
        if (!isTauri()) throw new Error("Rust Client só funciona em ambiente Desktop (Tauri).");
        try {
            return await invoke<T>('rust_api_mutate', { method: 'PATCH', endpoint, body });
        } catch (err: any) {
            const errorMsg = typeof err === 'string' ? err : JSON.stringify(err);
            logger.error(`[Rust Client PATCH] Erro nativo em ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    },

    delete: async <T>(endpoint: string, body?: any): Promise<T> => {
        if (!isTauri()) throw new Error("Rust Client só funciona em ambiente Desktop (Tauri).");
        try {
            return await invoke<T>('rust_api_mutate', { method: 'DELETE', endpoint, body });
        } catch (err: any) {
            const errorMsg = typeof err === 'string' ? err : JSON.stringify(err);
            logger.error(`[Rust Client DELETE] Erro nativo em ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
    },
    syncAuthAndConfig: async (baseUrl: string, token: string | null): Promise<void> => {
        if (!isTauri()) return;
        try {
            await invoke('set_api_config', { baseUrl, token });
            logger.debug('[Rust Client] Sync Auth bem sucedido no core native.');
        } catch (err: any) {
            logger.error(`[Rust Client Config Sync] Erro:`, err);
        }
    }
};
