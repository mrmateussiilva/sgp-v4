import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { hybridClient } from '@/services/hybridClient';
import { isTauri } from '@/utils/isTauri';
import { apiClient } from '@/api/client';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@/utils/isTauri', () => ({ isTauri: vi.fn() }));
vi.mock('@/utils/logger', () => ({
    logger: { error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/api/client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    }
}));

describe('hybridClient', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('Ambiente Desktop (Tauri)', () => {
        beforeEach(() => vi.mocked(isTauri).mockReturnValue(true));

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
        beforeEach(() => vi.mocked(isTauri).mockReturnValue(false));

        it('deve usar apiClient.get quando for web', async () => {
            vi.mocked(apiClient.get).mockResolvedValue({ data: { mocked: 1 } } as any);

            const resp = await hybridClient.get('/x', { termo: 'a' });

            expect(apiClient.get).toHaveBeenCalledWith('/x', { params: { termo: 'a' } });
            expect(resp).toEqual({ mocked: 1 });
            expect(invoke).not.toHaveBeenCalled();
        });

        it('deve usar apiClient.post quando for web', async () => {
            vi.mocked(apiClient.post).mockResolvedValue({ data: { ok: true } } as any);
            const resp = await hybridClient.post('/y', { email: 'x@x.com' });
            expect(apiClient.post).toHaveBeenCalledWith('/y', { email: 'x@x.com' });
            expect(resp).toEqual({ ok: true });
        });
    });
});
