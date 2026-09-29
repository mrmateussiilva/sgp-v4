import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { hybridClient } from '@/services/hybridClient';
import { apiClient } from '@/api/client';

vi.mock('@/utils/logger', () => ({
    logger: { error: vi.fn(), debug: vi.fn() },
}));

describe('hybridClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Ambiente Desktop (Tauri)', () => {
        beforeEach(() => {
            (window as any).__TAURI__ = true;
        });

        afterEach(() => {
            delete (window as any).__TAURI__;
        });

        it('deve formatar erro nativo', async () => {
            vi.mocked(invoke).mockRejectedValue('500 internal');
            await expect(hybridClient.get('/x')).rejects.toThrow('500 internal');
        });

        it('deve delegar GET para invoke rust', async () => {
            vi.mocked(invoke).mockResolvedValue({ id: 1 });
            const resp = await hybridClient.get('/x');
            expect(invoke).toHaveBeenCalledWith('rust_api_get', { endpoint: '/x', params: undefined });
            expect(resp).toEqual({ id: 1 });
        });

        it('deve delegar POST nativamente via mutator', async () => {
            vi.mocked(invoke).mockResolvedValue({ success: true });
            await hybridClient.post('/c', { a: 2 });
            expect(invoke).toHaveBeenCalledWith('rust_api_mutate', { method: 'POST', endpoint: '/c', body: { a: 2 } });
        });
    });

    describe('Ambiente Web/PWA (Fallback Axios)', () => {
        beforeEach(() => {
            delete (window as any).__TAURI__;
            delete (window as any).__TAURI_IPC__;
            delete (window as any).__TAURI_INTERNALS__;
        });

        it('deve usar apiClient.get quando for web', async () => {
            const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { mocked: 1 } } as any);

            const resp = await hybridClient.get('/x', { termo: 'a' });

            expect(spy).toHaveBeenCalledWith('/x', { params: { termo: 'a' } });
            expect(resp).toEqual({ mocked: 1 });
            expect(invoke).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('deve usar apiClient.post quando for web', async () => {
            const spy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { ok: true } } as any);
            const resp = await hybridClient.post('/y', { email: 'x@x.com' });
            expect(spy).toHaveBeenCalledWith('/y', { email: 'x@x.com' });
            expect(resp).toEqual({ ok: true });
            spy.mockRestore();
        });
    });
});
