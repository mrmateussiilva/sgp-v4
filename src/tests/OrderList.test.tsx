import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from './test-utils';
import OrderList from '../components/OrderList';
import { api } from '../services/api';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  ToastContainer: () => null,
}));

vi.mock('../services/api', () => ({
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
    listarRascunhos: vi.fn(() => Promise.resolve([])),
    getAllLogs: vi.fn(() => Promise.resolve([])),
    getTotalOrdersCount: vi.fn(() => Promise.resolve(0)),
    getDashboardSummary: vi.fn(() => Promise.resolve({
      total: 0,
      pendentes: 0,
      em_producao: 0,
      concluidos: 0,
      atrasados: 0,
      urgentes: 0,
      hoje: 0,
      efficiency_rate: 0,
      avg_production_time: 0,
      avg_delay_time: 0,
      production_efficiency: {},
      shipping_methods: [],
      status_counts: {},
    })),
  },
}));

// Mock OrderEvents hook
vi.mock('../hooks/useOrderEvents', () => ({
  useOrderAutoSync: vi.fn(),
  subscribeToOrderEvents: vi.fn(() => () => {}),
}));

// Mock modal provider to avoid unmounted state updates in dialogs
vi.mock('../components/modals/OrderModalsProvider', () => ({
  OrderModalsProvider: () => null,
}));

describe('OrderList Component', () => {
  it('renders the order list title', async () => {
    render(<OrderList />);

    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    expect(await screen.findByText(/nenhum pedido encontrado/i)).toBeInTheDocument();
  });

  it('renders action buttons with accessible names', async () => {
    render(<OrderList />);

    expect(await screen.findByRole('button', { name: /ver atalhos de teclado/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /atualizar pedidos/i })).toBeInTheDocument();
    expect(await screen.findByText(/nenhum pedido encontrado/i)).toBeInTheDocument();
  });

  it('renders only drafts and excludes pending orders when viewing the drafts tab', async () => {
    const mockPending = [
      {
        id: 101,
        numero: 101,
        cliente: 'Cliente Pedido Pendente',
        customer_name: 'Cliente Pedido Pendente',
        total_value: 100,
        valor_total: 100,
        status: 'pendente',
        pronto: false,
        rascunho: false,
        items: [],
      },
    ];
    const mockDrafts = [
      {
        id: 202,
        numero: 202,
        cliente: 'Cliente Apenas Rascunho',
        customer_name: 'Cliente Apenas Rascunho',
        total_value: 200,
        valor_total: 200,
        status: 'pendente',
        pronto: false,
        rascunho: true,
        items: [],
      },
    ];

    vi.mocked(api.getPendingOrdersLight).mockResolvedValue(mockPending as any);
    vi.mocked(api.listarRascunhos).mockResolvedValue(mockDrafts as any);

    render(<OrderList />);

    // Initial load shows pending order
    expect(await screen.findByText('Cliente Pedido Pendente')).toBeInTheDocument();

    // Click on drafts tab/chip
    const draftsButtons = screen.getAllByRole('button', { name: /rascunhos/i });
    fireEvent.click(draftsButtons[0]);

    // Now draft order should be displayed
    expect(await screen.findByText('Cliente Apenas Rascunho')).toBeInTheDocument();
    // And pending order must NOT be displayed
    expect(screen.queryByText('Cliente Pedido Pendente')).not.toBeInTheDocument();
  });
});

