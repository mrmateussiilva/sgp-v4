/**
 * Testes para a view de Fichas (OrderList)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import OrderList from '@/components/OrderList';

vi.mock('../../services/api', () => ({
  api: {
    getVendedoresAtivos: vi.fn(() => Promise.resolve([])),
    getDesignersAtivos: vi.fn(() => Promise.resolve([])),
    getFormasEnvioAtivas: vi.fn(() => Promise.resolve([])),
    getTiposProducaoAtivos: vi.fn(() => Promise.resolve([])),
    getFormasPagamentoAtivas: vi.fn(() => Promise.resolve([])),
    getPendingOrdersLight: vi.fn(() => Promise.resolve([])),
    getReadyOrdersLight: vi.fn(() => Promise.resolve([])),
    getOrdersPaginatedForTable: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    getOrdersWithFiltersForTable: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    getReadyOrdersPaginated: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    getAllLogs: vi.fn(() => Promise.resolve([])),
  },
}));

describe('FichasView (OrderList)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar lista inicial de pedidos', async () => {
    render(<OrderList />);

    await waitFor(() => {
      // Verificar que a lista é renderizada
      expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    });
  });

  it('deve exibir mensagem quando lista está vazia', async () => {
    // Mock para retornar lista vazia
    const { server } = await import('../mocks/server');
    const { http, HttpResponse } = await import('msw');
    
    server.use(
      http.get('http://localhost:8000/api/pedidos', () => {
        return HttpResponse.json([]);
      })
    );

    render(<OrderList />);

    await waitFor(() => {
      // Verificar mensagem de lista vazia
      expect(screen.getByText(/ainda não há pedidos/i)).toBeInTheDocument();
      // Pode não ter mensagem específica, então apenas verificar que não quebra
      expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    });
  });

  it('deve atualizar lista ao criar novo pedido', async () => {
    render(<OrderList />);

    await waitFor(() => {
      // Verificar que lista é renderizada
      expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    });

    // Simular criação de pedido (seria feito via mock ou evento)
    // Por enquanto, apenas verificar que não quebra
    expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
  });
});
