import { describe, it, expect } from 'vitest';
import {
    calculateProductionTypeMix,
    filterRawOrdersByPeriod,
    normalizeProductionType,
    getItemQuantity,
    getItemValue,
    getOrderDate,
    generateInsights,
    DashboardStats,
} from './dashboardService';
import { OrderWithItems, OrderStatus, OrderItem } from '../types';

describe('dashboardService - Mix de Produção', () => {
    describe('normalizeProductionType', () => {
        it('deve normalizar tipos comuns para chaves e rótulos amigáveis', () => {
            expect(normalizeProductionType('painel')).toEqual({ tipo: 'painel', label: 'Painel' });
            expect(normalizeProductionType('PAINEL')).toEqual({ tipo: 'painel', label: 'Painel' });
            expect(normalizeProductionType('totem')).toEqual({ tipo: 'totem', label: 'Totem' });
            expect(normalizeProductionType('lona')).toEqual({ tipo: 'lona', label: 'Lona' });
            expect(normalizeProductionType('adesivo')).toEqual({ tipo: 'adesivo', label: 'Adesivo' });
            expect(normalizeProductionType('canga')).toEqual({ tipo: 'canga', label: 'Canga' });
            expect(normalizeProductionType('generica')).toEqual({ tipo: 'generica', label: 'Genérica' });
            expect(normalizeProductionType('mesa_babado')).toEqual({ tipo: 'mesa_babado', label: 'Mesa de Babado' });
        });

        it('deve identificar variações de impressão 3D', () => {
            expect(normalizeProductionType('impressao_3d')).toEqual({ tipo: 'impressao_3d', label: 'Impressão 3D' });
            expect(normalizeProductionType('impressao 3d')).toEqual({ tipo: 'impressao_3d', label: 'Impressão 3D' });
            expect(normalizeProductionType('impressão 3d')).toEqual({ tipo: 'impressao_3d', label: 'Impressão 3D' });
        });

        it('deve identificar variações de mochilinha / bolsinha', () => {
            expect(normalizeProductionType('mochilinha')).toEqual({ tipo: 'mochilinha', label: 'Mochilinha / Bolsinha' });
            expect(normalizeProductionType('bolsinha')).toEqual({ tipo: 'mochilinha', label: 'Mochilinha / Bolsinha' });
        });

        it('deve tratar tipo vazio ou nulo como "Sem Tipo"', () => {
            expect(normalizeProductionType(null)).toEqual({ tipo: 'sem_tipo', label: 'Sem Tipo' });
            expect(normalizeProductionType('')).toEqual({ tipo: 'sem_tipo', label: 'Sem Tipo' });
            expect(normalizeProductionType('   ')).toEqual({ tipo: 'sem_tipo', label: 'Sem Tipo' });
        });

        it('deve capitalizar tipos não mapeados genericamente', () => {
            expect(normalizeProductionType('banner')).toEqual({ tipo: 'banner', label: 'Banner' });
        });
    });

    describe('getItemQuantity', () => {
        it('deve priorizar item.quantity quando presente e > 0', () => {
            const item = { quantity: 5 } as OrderItem;
            expect(getItemQuantity(item)).toBe(5);
        });

        it('deve fallback para campos específicos quando quantity não estiver definido', () => {
            const item = { quantidade_paineis: '10' } as unknown as OrderItem;
            expect(getItemQuantity(item)).toBe(10);
        });

        it('deve retornar 1 como fallback se nenhum campo estiver preenchido', () => {
            const item = {} as OrderItem;
            expect(getItemQuantity(item)).toBe(1);
        });
    });

    describe('getItemValue', () => {
        it('deve usar subtotal quando disponível', () => {
            const item = { subtotal: 150, quantity: 1 } as OrderItem;
            expect(getItemValue(item)).toBe(150);
        });

        it('deve calcular quantity * unit_price quando subtotal não existir', () => {
            const item = { quantity: 3, unit_price: 50 } as OrderItem;
            expect(getItemValue(item)).toBe(150);
        });

        it('deve parsear valor_unitario quando for string formatada', () => {
            const item = { quantity: 2, valor_unitario: '75,50' } as unknown as OrderItem;
            expect(getItemValue(item)).toBe(151);
        });

        it('deve parsear campo específico do tipo quando valor_unitario não existir', () => {
            const item = { quantity: 1, valor_painel: '200,00' } as unknown as OrderItem;
            expect(getItemValue(item)).toBe(200);
        });
    });

    describe('filterRawOrdersByPeriod', () => {
        const mockOrders: OrderWithItems[] = [
            {
                id: 1,
                customer_name: 'Cliente A',
                address: '',
                total_value: 100,
                status: OrderStatus.Concluido,
                data_entrada: '2026-05-10',
                items: [{ id: 1, order_id: 1, item_name: 'Item 1', quantity: 1, unit_price: 100, subtotal: 100, vendedor: 'V1', tipo_producao: 'painel' }],
            },
            {
                id: 2,
                customer_name: 'Cliente B',
                address: '',
                total_value: 200,
                status: OrderStatus.Cancelado, // cancelado deve ser excluído
                data_entrada: '2026-05-15',
                items: [{ id: 2, order_id: 2, item_name: 'Item 2', quantity: 2, unit_price: 100, subtotal: 200, vendedor: 'V1', tipo_producao: 'totem' }],
            },
            {
                id: 3,
                customer_name: 'Cliente C',
                address: '',
                total_value: 300,
                status: OrderStatus.Pendente,
                data_entrada: '2026-06-01', // fora do período
                items: [{ id: 3, order_id: 3, item_name: 'Item 3', quantity: 1, unit_price: 300, subtotal: 300, vendedor: 'V1', tipo_producao: 'lona' }],
            },
        ];

        it('deve filtrar pedidos no intervalo e excluir cancelados', () => {
            const result = filterRawOrdersByPeriod(mockOrders, '2026-05-01', '2026-05-31', 'entrada');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(1);
        });
    });

    describe('calculateProductionTypeMix', () => {
        it('deve agregar vendas, quantidades, percentuais e pedidos únicos por tipo', () => {
            const mockOrders: OrderWithItems[] = [
                {
                    id: 1,
                    customer_name: 'Cliente A',
                    address: '',
                    total_value: 500,
                    status: OrderStatus.Concluido,
                    items: [
                        { id: 1, order_id: 1, item_name: 'Painel 1', quantity: 2, unit_price: 150, subtotal: 300, vendedor: 'V1', tipo_producao: 'painel' },
                        { id: 2, order_id: 1, item_name: 'Totem 1', quantity: 1, unit_price: 200, subtotal: 200, vendedor: 'V1', tipo_producao: 'totem' },
                    ],
                },
                {
                    id: 2,
                    customer_name: 'Cliente B',
                    address: '',
                    total_value: 500,
                    status: OrderStatus.Pendente,
                    items: [
                        { id: 3, order_id: 2, item_name: 'Painel 2', quantity: 1, unit_price: 200, subtotal: 200, vendedor: 'V1', tipo_producao: 'painel' },
                        { id: 4, order_id: 2, item_name: 'Impressão 3D', quantity: 3, unit_price: 100, subtotal: 300, vendedor: 'V1', tipo_producao: 'impressao_3d' },
                    ],
                },
            ];

            const mix = calculateProductionTypeMix(mockOrders);

            // Total geral: Painel (300+200=500), Impressão 3D (300), Totem (200) -> Total 1000
            expect(mix).toHaveLength(3);

            // Ordenado por totalVendido decrescente
            expect(mix[0].tipo).toBe('painel');
            expect(mix[0].totalVendido).toBe(500);
            expect(mix[0].quantidade).toBe(3);
            expect(mix[0].nPedidos).toBe(2); // esteve nos pedidos 1 e 2
            expect(mix[0].percentual).toBe(50); // 500 / 1000 = 50%

            expect(mix[1].tipo).toBe('impressao_3d');
            expect(mix[1].label).toBe('Impressão 3D');
            expect(mix[1].totalVendido).toBe(300);
            expect(mix[1].quantidade).toBe(3);
            expect(mix[1].nPedidos).toBe(1);
            expect(mix[1].percentual).toBe(30);

            expect(mix[2].tipo).toBe('totem');
            expect(mix[2].totalVendido).toBe(200);
            expect(mix[2].quantidade).toBe(1);
            expect(mix[2].nPedidos).toBe(1);
            expect(mix[2].percentual).toBe(20);
        });

        it('deve lidar com pedido sem itens atribuindo valor para "Sem Tipo"', () => {
            const mockOrders: OrderWithItems[] = [
                {
                    id: 10,
                    customer_name: 'Cliente Sem Itens',
                    address: '',
                    total_value: 120,
                    status: OrderStatus.Concluido,
                    items: [],
                },
            ];

            const mix = calculateProductionTypeMix(mockOrders);
            expect(mix).toHaveLength(1);
            expect(mix[0].tipo).toBe('sem_tipo');
            expect(mix[0].label).toBe('Sem Tipo');
            expect(mix[0].totalVendido).toBe(120);
            expect(mix[0].percentual).toBe(100);
        });

        it('deve retornar array vazio se não houver pedidos', () => {
            const mix = calculateProductionTypeMix([]);
            expect(mix).toEqual([]);
        });
    });

    describe('generateInsights com Mix de Produção', () => {
        const baseStats: DashboardStats = {
            totalVendido: 10000,
            nPedidos: 10,
            ticketMedio: 1000,
            melhorDia: null,
            piorDia: null,
            porcentagemProntos: 80,
            porcentagemPendentes: 20,
            porcentagemAltaPrioridade: 10,
            dailyData: [],
            topClientes: [],
        };

        it('deve gerar insight de carro-chefe dominante (>= 50%)', () => {
            const mix = [
                { tipo: 'painel', label: 'Painel', totalVendido: 6000, quantidade: 30, percentual: 60, nPedidos: 8 },
                { tipo: 'totem', label: 'Totem', totalVendido: 4000, quantidade: 10, percentual: 40, nPedidos: 4 },
            ];

            const insights = generateInsights(baseStats, mix);
            const mixInsight = insights.find(i => i.includes('Carro-chefe: Painel domina sua produção'));
            expect(mixInsight).toBeDefined();
            expect(mixInsight).toContain('60.0% do faturamento');
        });

        it('deve alertar sobre concentração alta (> 70%) com 3 ou mais tipos', () => {
            const mix = [
                { tipo: 'painel', label: 'Painel', totalVendido: 8000, quantidade: 40, percentual: 80, nPedidos: 9 },
                { tipo: 'totem', label: 'Totem', totalVendido: 1000, quantidade: 5, percentual: 10, nPedidos: 2 },
                { tipo: 'lona', label: 'Lona', totalVendido: 1000, quantidade: 5, percentual: 10, nPedidos: 2 },
            ];

            const insights = generateInsights(baseStats, mix);
            const alerta = insights.find(i => i.includes('Alerta de concentração'));
            expect(alerta).toBeDefined();
            expect(alerta).toContain('Mais de 70% das vendas');
        });
    });
});
