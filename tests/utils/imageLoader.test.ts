import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadAuthenticatedImage, clearImageCache } from '../../src/utils/imageLoader';
import { apiClient } from '../../src/api/client';

// Mocks reais evitam chamadas de rede no test runner
vi.mock('../../src/api/client', () => ({
    apiClient: {
        get: vi.fn(),
    },
    getApiUrl: vi.fn().mockReturnValue('http://localhost:8000/'),
}));

vi.mock('../../src/utils/localImageManager', () => ({
    getLocalImagePath: vi.fn().mockResolvedValue(null),
    loadLocalImageAsBase64: vi.fn(),
    cacheImageFromUrl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/isTauri', () => ({
    isTauri: vi.fn().mockReturnValue(false),
}));

describe('imageLoader - LRU Cache', () => {
    let createObjectURLMock: any;
    let revokeObjectURLMock: any;

    beforeEach(() => {
        // Espionar as magias de URL blob global do browser (Memory Leaks ocorrem aqui)
        createObjectURLMock = vi.fn().mockImplementation((_blob) => `blob:mock-url-${Math.random()}`);
        revokeObjectURLMock = vi.fn();

        global.URL.createObjectURL = createObjectURLMock;
        global.URL.revokeObjectURL = revokeObjectURLMock;

        (apiClient.get as any).mockResolvedValue({
            data: new Blob(['fake-image-data-unit-test'], { type: 'image/jpeg' }),
            headers: { 'content-type': 'image/jpeg' }
        });
    });

    afterEach(() => {
        // Reset limpar os mocks test a test
        vi.clearAllMocks();
        clearImageCache();
    });

    it('deve armazenar imagens ate o MAX_CACHE_SIZE sem revogar urls antigas', async () => {
        const TEST_LIMIT = 20; // Algo abaixo de 50 (MAX_CACHE_SIZE atual da aplicacao)

        for (let i = 0; i < TEST_LIMIT; i++) {
            await loadAuthenticatedImage(`http://localhost:8000/image-${i}.jpg`);
        }

        // Deve ter criado 20 blobs
        expect(createObjectURLMock).toHaveBeenCalledTimes(TEST_LIMIT);
        // NENHUM blob deve ter sido destruido (Memory limit nao explodido)
        expect(revokeObjectURLMock).not.toHaveBeenCalled();
    });

    it('deve revogar blobs antigos apos MAX_CACHE_SIZE (LRU mechanism)', async () => {
        const MAX_CACHE_SIZE = 25;
        const TOTAL_IMAGES = 55;

        // Forcar carregamento de imagens acima do limite do cache.
        for (let i = 0; i < TOTAL_IMAGES; i++) {
            await loadAuthenticatedImage(`http://localhost:8000/image-lru-${i}.jpg`);
        }

        expect(createObjectURLMock).toHaveBeenCalledTimes(TOTAL_IMAGES);

        // Como o limite e 25, cada imagem acima do limite revoga a mais antiga.
        expect(revokeObjectURLMock).toHaveBeenCalledTimes(TOTAL_IMAGES - MAX_CACHE_SIZE);
    });

    it('nao deve duplicar URLs da mesma imagem em cache (evitar render infinitos)', async () => {
        const repeatedQuery = `http://localhost:8000/image-repetida.jpg`;

        await loadAuthenticatedImage(repeatedQuery);
        await loadAuthenticatedImage(repeatedQuery);
        await loadAuthenticatedImage(repeatedQuery);

        // Retornou sempre o cache! Criou a url blob e buscou a api apenas uma unica veez
        expect(createObjectURLMock).toHaveBeenCalledTimes(1);
        expect(apiClient.get).toHaveBeenCalledTimes(1);

        // Limpar nao revoga nada ainda de fora do cache bounds.
        expect(revokeObjectURLMock).not.toHaveBeenCalled();
    });
});
