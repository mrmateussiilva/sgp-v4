import { describe, it, expect } from 'vitest';
import { groupOrders } from '../../pdf/groupOrders';
import { OrderWithItems, OrderStatus } from '../../types';

describe('Geração de dados de Ficha de Impressão - Tipo Lona', () => {
  it('deve extrair acabamento_lona, terceirizado e observacao para Lona corretamente', () => {
    const mockOrder: OrderWithItems = {
      id: 1234,
      numero: '1234',
      cliente: 'Cliente Teste Lona',
      customer_name: 'Cliente Teste Lona',
      data_entrada: '2026-10-21',
      data_entrega: '2026-10-22',
      status: OrderStatus.Pendente,
      prioridade: 'NORMAL',
      forma_envio: 'Balcão',
      valor_frete: '0,00',
      total_value: '100,00',
      observacao: 'Observação do pedido geral',
      items: [
        {
          id: 5678,
          tipo_producao: 'lona',
          descricao: 'Lona Frontlight 2x1m',
          largura: '2.00',
          altura: '1.00',
          vendedor: 'Vendedor 1',
          quantity: 1,
          unit_price: 100,
          subtotal: 100,
          acabamento_lona: 'refilar',
          terceirizado: true,
          observacao: 'Refilar bem rente e colocar reforço',
        },
      ],
    };

    const grouped = groupOrders([mockOrder]);

    expect(grouped).toHaveLength(1);
    const orderData = grouped[0];
    expect(orderData.observacao_pedido).toBe('Observação do pedido geral');

    const prod = orderData.produtos[0];
    expect(prod.tipo_producao).toBe('lona');
    expect(prod.acabamento_lona).toBe('refilar');
    expect(prod.terceirizado).toBe(true);
    expect(prod.observacao_item).toBe('Refilar bem rente e colocar reforço');
  });

  it('deve normalizar terceirizado mesmo quando for string "true" ou "sim"', () => {
    const mockOrder: OrderWithItems = {
      id: 1235,
      cliente: 'Cliente Teste',
      data_entrada: '2026-10-21',
      status: OrderStatus.Pendente,
      prioridade: 'NORMAL',
      forma_envio: 'Balcão',
      vendedor: 'Vendedor 1',
      items: [
        {
          id: 5679,
          tipo_producao: 'lona',
          descricao: 'Lona Brilho',
          vendedor: 'Vendedor 1',
          quantity: 1,
          unit_price: 50,
          subtotal: 50,
          acabamento_lona: 'nao_refilar',
          terceirizado: 'true' as any,
          observacao: 'Não cortar as sobras',
        },
      ],
    };

    const grouped = groupOrders([mockOrder]);
    const prod = grouped[0].produtos[0];
    expect(prod.acabamento_lona).toBe('nao_refilar');
    expect(prod.terceirizado).toBe(true);
    expect(prod.observacao_item).toBe('Não cortar as sobras');
  });
});
