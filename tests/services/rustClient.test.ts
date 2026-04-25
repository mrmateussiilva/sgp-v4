import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { rustClient } from '@/services/rustClient';
import { isTauri } from '@/utils/isTauri';
import { logger } from '@/utils/logger';

// Mock dependentes
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@/utils/isTauri', () => ({
    isTauri: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('rustClient', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('get()', () => {
        it('deve disparar invoke na api get quando em ambiente Tauri', async () => {
            vi.mocked(isTauri).mockReturnValue(true);
            const mockResponse = { id: 1, object: 'order' };
            vi.mocked(invoke).mockResolvedValue(mockResponse);

            const endpoint = '/orders';
            const params = { status: 'pending' };

            const result = await rustClient.get(endpoint, params);

            expect(invoke).toHaveBeenCalledWith('rust_api_get', { endpoint, params });
            expect(result).toEqual(mockResponse);
        });

        it('deve formatar erro e avisar o logger quando invoke falha', async () => {
            vi.mocked(isTauri).mockReturnValue(true);
            vi.mocked(invoke).mockRejectedValue('Servidor offline - 500');

            await expect(rustClient.get('/error')).rejects.toThrow('Servidor offline - 500');

            expect(logger.error).toHaveBeenCalledWith(
                '[Rust Client GET] Erro nativo em /error:',
                'Servidor offline - 500'
            );
        });

        it('deve recusar a operacao se isTauri() for falso', async () => {
            vi.mocked(isTauri).mockReturnValue(false);

            await expect(rustClient.get('/orders')).rejects.toThrow(
                'Rust Client só funciona em ambiente Desktop (Tauri).'
            );
            expect(invoke).not.toHaveBeenCalled();
        });
    });

    describe('syncAuthAndConfig()', () => {
        it('deve comunicar baseUrl e jwt auth ao backend native', async () => {
            vi.mocked(isTauri).mockReturnValue(true);

            await rustClient.syncAuthAndConfig('http://api.local', 'token.secreto');

            expect(invoke).toHaveBeenCalledWith('set_api_config', {
                baseUrl: 'http://api.local',
                token: 'token.secreto'
            });
            expect(logger.debug).toHaveBeenCalledWith(
                '[Rust Client] Sync Auth bem sucedido no core native.'
            );
        });

        it('deve abortar sync de forma silenciosa se isTauri for falso', async () => {
            vi.mocked(isTauri).mockReturnValue(false);

            await rustClient.syncAuthAndConfig('x', 'y');

            expect(invoke).not.toHaveBeenCalled();
        });
    });
});
