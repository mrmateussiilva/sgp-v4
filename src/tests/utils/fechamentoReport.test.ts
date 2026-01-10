import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateFechamentoReport } from '@/utils/fechamentoReport';
import { OrderWithItems, OrderStatus, ReportRequestPayload } from '@/types';

// Mock console.warn e console.error para não poluir os testes
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

describe('fechamentoReport', () => {
  describe('generateFechamentoReport - Validação de Input', () => {
    it('deve lançar erro se data inicial for posterior à data final', () => {
      const orders: OrderWithItems[] = [];
      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
        start_date: '2024-01-31',
        end_date: '2024-01-01',
      };

      expect(() => {
        generateFechamentoReport(orders, payload);
      }).toThrow('Payload inválido');
    });

    it('deve lançar erro se tipo de relatório for inválido', () => {
      const orders: OrderWithItems[] = [];
      const payload = {
        report_type: 'tipo_invalido',
      } as ReportRequestPayload;

      expect(() => {
        generateFechamentoReport(orders, payload);
      }).toThrow('Payload inválido');
    });

    it('deve validar formato de data inválido', () => {
      const orders: OrderWithItems[] = [];
      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
        start_date: 'data-invalida',
      };

      expect(() => {
        generateFechamentoReport(orders, payload);
      }).toThrow('Payload inválido');
    });
  });

  describe('generateFechamentoReport - Cálculo de Totais', () => {
    it('deve calcular totais corretamente com frete por pedido', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 350,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'banner',
            },
          ],
        },
        {
          id: 2,
          numero: 'PED-002',
          cliente: 'Cliente B',
          data_entrada: '2024-01-16',
          data_entrega: '2024-01-21',
          valor_frete: 30,
          total_value: 130,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 3,
              descricao: 'Item 3',
              subtotal: 100,
              quantity: 1,
              unit_price: 100,
              designer: 'Pedro',
              vendedor: 'Ana',
              tipo_producao: 'adesivo',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_designer',
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        date_mode: 'entrega',
        frete_distribution: 'por_pedido',
      };

      const result = generateFechamentoReport(orders, payload);

      // Total de frete: 50 (pedido 1) + 30 (pedido 2) = 80
      expect(result.total.valor_frete).toBe(80);
      // Total de serviço: 150 + 150 + 100 = 400
      expect(result.total.valor_servico).toBe(400);
      expect(result.groups.length).toBeGreaterThan(0);
    });

    it('deve distribuir frete proporcionalmente quando solicitado', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 100, // Frete de 100
          total_value: 400,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 200, // 50% do total de itens
              quantity: 1,
              unit_price: 200,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 100, // 33.33% do total de itens
              quantity: 1,
              unit_price: 100,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'banner',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_designer',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        date_mode: 'entrega',
        frete_distribution: 'proporcional',
      };

      const result = generateFechamentoReport(orders, payload);

      // Com distribuição proporcional, o total de frete deve ser 100 (somado diretamente)
      expect(result.total.valor_frete).toBe(100);
      expect(result.total.valor_servico).toBe(300);
    });

    it('deve calcular desconto quando houver diferença entre total e (itens + frete)', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 300, // Total menor que itens + frete = desconto de 50
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'banner',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_designer',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        date_mode: 'entrega',
      };

      const result = generateFechamentoReport(orders, payload);

      // Desconto esperado: (150 + 150 + 50) - 300 = 50
      expect(result.total.desconto).toBe(50);
      expect(result.total.valor_liquido).toBe(300); // 350 - 50
    });

    it('deve tratar pedidos sem itens corretamente', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 50,
          status: OrderStatus.Concluido,
          items: [], // Pedido sem itens
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
      };

      const result = generateFechamentoReport(orders, payload);

      expect(result.total.valor_frete).toBe(50);
      expect(result.total.valor_servico).toBe(0); // total_value - frete = 50 - 50 = 0
      expect(result.groups.length).toBeGreaterThan(0);
    });

    it('deve agrupar frete corretamente (não duplicar no total geral)', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 350,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'Maria', // Designer diferente
              vendedor: 'Ana',
              tipo_producao: 'banner',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'analitico_designer_cliente',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
      };

      const result = generateFechamentoReport(orders, payload);

      // O frete deve aparecer apenas uma vez no total geral, mesmo com múltiplos itens
      // Cada item mostra o frete, mas no total é deduplicado
      expect(result.total.valor_frete).toBe(50); // Não 100 (50 * 2 itens)
      expect(result.total.valor_servico).toBe(300); // 150 + 150
    });

    it('deve filtrar por status corretamente', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 150,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 100,
              quantity: 1,
              unit_price: 100,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
          ],
        },
        {
          id: 2,
          numero: 'PED-002',
          cliente: 'Cliente B',
          data_entrada: '2024-01-16',
          data_entrega: '2024-01-21',
          valor_frete: 30,
          total_value: 130,
          status: OrderStatus.Pendente, // Status diferente
          items: [
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 100,
              quantity: 1,
              unit_price: 100,
              designer: 'Pedro',
              vendedor: 'Ana',
              tipo_producao: 'banner',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        status: OrderStatus.Concluido,
      };

      const result = generateFechamentoReport(orders, payload);

      // Deve incluir apenas pedido com status Concluido
      expect(result.total.valor_frete).toBe(50); // Apenas pedido 1
      expect(result.total.valor_servico).toBe(100); // Apenas item 1
    });

    it('deve filtrar por data corretamente (data de entrega)', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-10',
          data_entrega: '2024-01-15', // Dentro do período
          valor_frete: 50,
          total_value: 150,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 100,
              quantity: 1,
              unit_price: 100,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
          ],
        },
        {
          id: 2,
          numero: 'PED-002',
          cliente: 'Cliente B',
          data_entrada: '2024-01-20',
          data_entrega: '2024-01-25', // Fora do período
          valor_frete: 30,
          total_value: 130,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 100,
              quantity: 1,
              unit_price: 100,
              designer: 'Pedro',
              vendedor: 'Ana',
              tipo_producao: 'banner',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        date_mode: 'entrega',
      };

      const result = generateFechamentoReport(orders, payload);

      // Deve incluir apenas pedido dentro do período
      expect(result.total.valor_frete).toBe(50); // Apenas pedido 1
      expect(result.total.valor_servico).toBe(100); // Apenas item 1
    });

    it('deve filtrar por vendedor corretamente', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 150,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 100,
              quantity: 1,
              unit_price: 100,
              designer: 'João',
              vendedor: 'Maria Silva',
              tipo_producao: 'painel',
            },
          ],
        },
        {
          id: 2,
          numero: 'PED-002',
          cliente: 'Cliente B',
          data_entrada: '2024-01-16',
          data_entrega: '2024-01-21',
          valor_frete: 30,
          total_value: 130,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 100,
              quantity: 1,
              unit_price: 100,
              designer: 'Pedro',
              vendedor: 'Ana Costa', // Vendedor diferente
              tipo_producao: 'banner',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        vendedor: 'Maria', // Busca parcial
      };

      const result = generateFechamentoReport(orders, payload);

      // Deve incluir apenas itens do vendedor Maria
      expect(result.total.valor_frete).toBe(50); // Apenas pedido 1
      expect(result.total.valor_servico).toBe(100); // Apenas item 1
    });

    it('deve gerar relatório analítico com dois níveis de agrupamento', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 350,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'banner',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'analitico_designer_cliente',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
      };

      const result = generateFechamentoReport(orders, payload);

      expect(result.groups.length).toBeGreaterThan(0);
      // Deve ter subgrupos (designer -> cliente)
      const firstGroup = result.groups[0];
      expect(firstGroup.subgroups).toBeDefined();
      expect(firstGroup.subgroups!.length).toBeGreaterThan(0);
    });

    it('deve lidar com valores null/undefined corretamente', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: null as any, // null
          total_value: 100,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: null as any, // null, deve calcular de quantity * unit_price
              quantity: 2,
              unit_price: 50,
              designer: null,
              vendedor: undefined,
              tipo_producao: null,
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
      };

      const result = generateFechamentoReport(orders, payload);

      // Frete null deve ser tratado como 0
      expect(result.total.valor_frete).toBe(0);
      // Subtotal null deve calcular de quantity * unit_price = 2 * 50 = 100
      expect(result.total.valor_servico).toBe(100);
    });

    it('deve calcular subtotal a partir de valor_unitario quando subtotal não estiver disponível', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 250,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: null as any,
              quantity: null as any,
              unit_price: null as any,
              valor_unitario: '200,00', // String formatada
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
      };

      const result = generateFechamentoReport(orders, payload);

      // Deve parsear valor_unitario = '200,00' -> 200
      expect(result.total.valor_servico).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com array vazio de pedidos', () => {
      const orders: OrderWithItems[] = [];
      const payload: ReportRequestPayload = {
        report_type: 'sintetico_data',
      };

      const result = generateFechamentoReport(orders, payload);

      expect(result.total.valor_frete).toBe(0);
      expect(result.total.valor_servico).toBe(0);
      expect(result.groups.length).toBe(0);
    });

    it('deve lidar com pedidos com múltiplos itens do mesmo pedido em grupos diferentes', () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          numero: 'PED-001',
          cliente: 'Cliente A',
          data_entrada: '2024-01-15',
          data_entrega: '2024-01-20',
          valor_frete: 50,
          total_value: 350,
          status: OrderStatus.Concluido,
          items: [
            {
              id: 1,
              descricao: 'Item 1',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'João',
              vendedor: 'Maria',
              tipo_producao: 'painel',
            },
            {
              id: 2,
              descricao: 'Item 2',
              subtotal: 150,
              quantity: 1,
              unit_price: 150,
              designer: 'Maria', // Designer diferente
              vendedor: 'Ana',
              tipo_producao: 'banner',
            },
          ],
        },
      ];

      const payload: ReportRequestPayload = {
        report_type: 'analitico_designer_cliente',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
      };

      const result = generateFechamentoReport(orders, payload);

      // Frete deve aparecer apenas uma vez no total geral
      // (mesmo que apareça em múltiplos grupos/subgrupos)
      expect(result.total.valor_frete).toBe(50);
      expect(result.total.valor_servico).toBe(300);
    });
  });
});
