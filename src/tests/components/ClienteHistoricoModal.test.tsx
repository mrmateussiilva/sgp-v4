import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ClienteHistoricoModal } from '@/components/ClienteHistoricoModal';
import { api } from '@/services/api';
import { Cliente, OrderStatus } from '@/types';

vi.mock('@/services/api', () => ({
  api: {
    getOrdersPaginated: vi.fn(),
  },
}));

describe('ClienteHistoricoModal Component', () => {
  const mockCliente: Cliente = {
    id: 10,
    nome: 'Andres Martins',
    telefone: '(27) 99999-8888',
    cidade: 'Vitória',
    estado: 'ES',
    cep: '29000-000',
  };

  const mockOrders = [
    {
      id: 101,
      numero: '0000000101',
      cliente: 'Andres Martins',
      data_entrada: '2026-09-10',
      data_entrega: '2026-09-15',
      status: OrderStatus.Pronto,
      pronto: true,
      valor_total: 450,
      items: [
        {
          id: 1,
          tipo_producao: 'painel',
          descricao: 'PAINEL TACTEL REDONDO',
          quantidade_paineis: '5',
          quantity: 5,
          unit_price: 50,
          largura: '2,50',
          altura: '2,50',
          tecido: 'TACTEL',
        },
        {
          id: 2,
          tipo_producao: 'totem',
          descricao: 'TOTEM MENINA MDF',
          quantidade_totem: '10',
          quantity: 10,
          unit_price: 20,
          tecido: 'MDF',
        },
      ],
    },
    {
      id: 102,
      numero: '0000000102',
      cliente: 'Andres Martins',
      data_entrada: '2026-09-20',
      data_entrega: '2026-09-25',
      status: OrderStatus.Pendente,
      pronto: false,
      valor_total: 180,
      items: [
        {
          id: 3,
          tipo_producao: 'mesa',
          descricao: 'MESA DE BABADO COM SOBREPOSIÇÃO',
          quantity: 2,
          unit_price: 90,
          largura: '2,20',
          altura: '0,80',
          tecido: 'SUEDI',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getOrdersPaginated as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      orders: mockOrders,
      total: 2,
    });
  });

  it('renders client name and consolidated metrics correctly', async () => {
    render(
      <ClienteHistoricoModal
        cliente={mockCliente}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Cliente name in title
    expect(screen.getByText('Andres Martins')).toBeInTheDocument();
    expect(screen.getByText('ID #10')).toBeInTheDocument();

    // Wait for orders to load and compute totals
    await waitFor(() => {
      // 5 paineis + 10 totens + 2 mesas = 17 itens produzidos
      expect(screen.getByText('17')).toBeInTheDocument();
    });

    // 2 pedidos no total
    expect(screen.getByText('Total de Pedidos')).toBeInTheDocument();

    // Categorias de produtos exibidas
    expect(screen.getAllByText('Painéis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Totens').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mesas & Toalhas').length).toBeGreaterThan(0);
  });

  it('displays the list of products requested by the client', async () => {
    render(
      <ClienteHistoricoModal
        cliente={mockCliente}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('PAINEL TACTEL REDONDO')).toBeInTheDocument();
      expect(screen.getByText('TOTEM MENINA MDF')).toBeInTheDocument();
      expect(screen.getByText('MESA DE BABADO COM SOBREPOSIÇÃO')).toBeInTheDocument();
    });

    // Badges de quantidade (5x, 10x, 2x)
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.getByText('10x')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
  });

  it('calcula métricas monetárias preservando centavos com strings no padrão BR e ignora cancelados', async () => {
    const ordersWithStrings = [
      {
        id: 201,
        numero: '0000000201',
        cliente: 'Andres Martins',
        data_entrada: '2026-10-01',
        status: OrderStatus.Pendente,
        valor_total: '150,50', // string formatada
        items: [
          {
            id: 1,
            tipo_producao: 'painel',
            descricao: 'PAINEL FESTA',
            quantidade_paineis: '2',
            valor_unitario: '75,25', // 2 * 75,25 = 150,50
            largura: '2,00',
            altura: '2,00',
          },
        ],
      },
      {
        id: 202,
        numero: '0000000202',
        cliente: 'Andres Martins',
        data_entrada: '2026-10-02',
        status: OrderStatus.Cancelado, // Cancelado: não deve entrar na soma financeira!
        valor_total: '5000,00',
        items: [
          {
            id: 2,
            tipo_producao: 'painel',
            descricao: 'PAINEL CANCELADO',
            quantidade_paineis: '10',
            valor_unitario: '500,00',
          },
        ],
      },
    ];

    (api.getOrdersPaginated as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      orders: ordersWithStrings,
      total: 2,
    });

    render(
      <ClienteHistoricoModal
        cliente={mockCliente}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      // Deve exibir R$ 150,50 (e NÃO R$ 150,00 do parseInt, e NÃO R$ 5.150,50 somando o cancelado)
      expect(screen.getAllByText('R$ 150,50').length).toBeGreaterThan(0);
    });

    // O item do pedido cancelado não deve aparecer no resumo de itens comprados
    expect(screen.queryByText('PAINEL CANCELADO')).not.toBeInTheDocument();
  });

  it('diferencia itens com a mesma descrição mas medidas diferentes', async () => {
    const ordersDifferentSizes = [
      {
        id: 301,
        numero: '0000000301',
        cliente: 'Andres Martins',
        data_entrada: '2026-10-01',
        status: OrderStatus.Pronto,
        valor_total: 200,
        items: [
          {
            id: 1,
            tipo_producao: 'painel',
            descricao: 'PAINEL BOSQUE',
            quantidade_paineis: '1',
            largura: '1,50',
            altura: '1,50',
          },
          {
            id: 2,
            tipo_producao: 'painel',
            descricao: 'PAINEL BOSQUE',
            quantidade_paineis: '2',
            largura: '3,00',
            altura: '2,00',
          },
        ],
      },
    ];

    (api.getOrdersPaginated as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      orders: ordersDifferentSizes,
      total: 1,
    });

    render(
      <ClienteHistoricoModal
        cliente={mockCliente}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1,50m × 1,50m')).toBeInTheDocument();
      expect(screen.getByText('3,00m × 2,00m')).toBeInTheDocument();
    });

    // Ambas as variações foram discriminadas
    expect(screen.getByText('1x')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
  });
});
