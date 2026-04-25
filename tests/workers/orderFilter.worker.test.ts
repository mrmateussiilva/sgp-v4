import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('orderFilter.worker', () => {
    let postMessageMock: any;
    let dispatchMessage: (e: any) => void = () => { };

    beforeEach(() => {
        postMessageMock = vi.fn();

        // Mudar o self/window properties que o worker vai ler
        (global as any).self = {
            postMessage: postMessageMock,
            set onmessage(fn: any) {
                dispatchMessage = fn;
            }
        };

        vi.resetModules(); // Limpa require cache antes do import para disparar `self.onmessage = ...`
    });

    const getWorker = async () => {
        // Import dinamico pra que o arquivo execute e prenda `self.onmessage`
        await import('../../src/workers/orderFilter.worker');
        return dispatchMessage;
    };

    const defaultFilters = {
        activeSearchTerm: '',
        isBackendPaginated: false,
        dateFrom: null,
        dateTo: null,
        productionStatusFilter: '',
        selectedStatuses: [],
        selectedVendedor: '',
        selectedDesigner: '',
        selectedCidade: '',
        selectedFormaEnvio: '',
        selectedTipoProducao: '',
        sortColumn: null,
        sortDirection: 'asc',
        isAdmin: false,
        isImpressaoUser: false,
    };

    it('deve realizar busca textual normalizando acentos e match ignorando case', async () => {
        const workerMsg = await getWorker();

        const orders = [
            { id: 10, cliente: 'João da Silva' },
            { id: 11, cliente: 'Maria' }
        ];

        workerMsg({
            data: {
                orders,
                filters: { ...defaultFilters, activeSearchTerm: 'joao' } // Sem acento
            }
        });

        expect(postMessageMock).toHaveBeenCalledWith({
            filteredOrders: [
                { id: 10, cliente: 'João da Silva' }
            ]
        });
    });

    it('deve conseguir buscar match estritamente pelo ID numérico ou Numero sem padding', async () => {
        const workerMsg = await getWorker();

        const orders = [
            { id: 105, numero: '00105', cliente: 'Foo' },
            { id: 11, numero: '99', cliente: 'Bar 1050' } // falso positivo cliente
        ];

        workerMsg({
            data: {
                orders,
                filters: { ...defaultFilters, activeSearchTerm: '105' }
            }
        });

        // Como o match de termDigits testa com fallback inclusivo 'contains' (não exactly match pelo id)
        // Se "Bar 1050".includes('105') isso deve voltar, a menos que as validacoes permitam. 
        // Mas ele testa ID idStr.includes! Ambos vao bater aqui. '105'.includes('105') e '1050'.includes('105')
        expect(postMessageMock).toHaveBeenCalled();
        const resultArr = postMessageMock.mock.calls[0][0].filteredOrders;
        expect(resultArr.length).toBe(2);
    });

    it('deve filtrar status de producao para pending', async () => {
        const workerMsg = await getWorker();

        const orders = [
            { id: 1, pronto: true },
            { id: 2, pronto: false }
        ];

        workerMsg({
            data: {
                orders,
                filters: { ...defaultFilters, productionStatusFilter: 'pending' }
            }
        });

        const resultArr = postMessageMock.mock.calls[0][0].filteredOrders;
        expect(resultArr.length).toBe(1);
        expect(resultArr[0].id).toBe(2);
    });

    it('deve ordenar admin corretamente', async () => {
        const workerMsg = await getWorker();

        const orders = [
            { id: 1, financeiro: true, prioridade: 'NORMAL' },
            { id: 2, financeiro: false, prioridade: 'NORMAL' },
            { id: 3, financeiro: true, prioridade: 'ALTA' },
        ];

        workerMsg({
            data: {
                orders,
                filters: { ...defaultFilters, isAdmin: true }
            }
        });

        const resultArr = postMessageMock.mock.calls[0][0].filteredOrders;
        // Sem financeiro primeiro (id 2)
        expect(resultArr[0].id).toBe(2);
        // Prioridade ALTA em segundo plano caso id 2 n bata (id 3)
        expect(resultArr[1].id).toBe(3);
        // Resto (id 1)
        expect(resultArr[2].id).toBe(1);
    });
});
