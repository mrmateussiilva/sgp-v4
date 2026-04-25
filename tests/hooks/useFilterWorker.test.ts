import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterWorker } from '../../src/hooks/useFilterWorker';

// Mock do Web Worker global 
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();

class MockWorker {
    onmessage: any = null;
    postMessage = mockPostMessage;
    terminate = mockTerminate;
}

describe('useFilterWorker Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global as any).Worker = MockWorker;
    });

    const mockOrders: any[] = [{ id: 1, c: 'Cliente A' }, { id: 2, c: 'Cliente B' }];
    const mockFilters = { activeSearchTerm: 'A' };

    it('deve inicializar com array vazio e notificar filtragem ativa no postMessage incial', () => {
        const { result } = renderHook(() => useFilterWorker(mockOrders, mockFilters));

        // Opcionalmente assincrono
        expect(result.current.filteredOrders).toEqual([]);
        expect(result.current.isFiltering).toBe(true);

        // O worker deve ter recebido a mensagem e o postMessage disparado
        expect(mockPostMessage).toHaveBeenCalledWith({
            orders: mockOrders,
            filters: mockFilters
        });
    });

    it('deve capturar resultado do worker no onmessage e atualizar estado', () => {
        // Para testar o hook alterando apos onmessage, capturamos a instancia criada do worker no global object
        let capturedWorker: MockWorker | null = null;
        (global as any).Worker = class {
            onmessage: any = null;
            postMessage = vi.fn();
            terminate = vi.fn();
            constructor() {
                capturedWorker = this;
            }
        };

        const { result } = renderHook(() => useFilterWorker(mockOrders, mockFilters));

        // Agora forçamos o worker responder
        act(() => {
            if (capturedWorker && capturedWorker.onmessage) {
                capturedWorker.onmessage({ data: { filteredOrders: [{ id: 1, c: 'Cliente A' }] } } as any);
            }
        });

        // O estado deve estar populado e carregamento false
        expect(result.current.isFiltering).toBe(false);
        expect(result.current.filteredOrders).toEqual([{ id: 1, c: 'Cliente A' }]);
    });

    it('deve matar (terminate) o worker quando o componente desmontar impedindo leak zombie', () => {
        let capturedTerminate = vi.fn();
        (global as any).Worker = class {
            onmessage: any = null;
            postMessage = vi.fn();
            terminate = capturedTerminate;
        };

        const { unmount } = renderHook(() => useFilterWorker(mockOrders, mockFilters));

        expect(capturedTerminate).not.toHaveBeenCalled();
        unmount();
        expect(capturedTerminate).toHaveBeenCalledOnce();
    });
});
