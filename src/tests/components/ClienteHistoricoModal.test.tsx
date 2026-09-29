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
});
