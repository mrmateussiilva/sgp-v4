import { describe, it, expect, vi } from 'vitest';
import { render, screen } from './test-utils';
import OrderList from '../components/OrderList';

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
});
