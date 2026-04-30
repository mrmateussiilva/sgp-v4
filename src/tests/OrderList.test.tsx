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
    getAllLogs: vi.fn(() => Promise.resolve([])),
  },
}));

describe('OrderList Component', () => {
  it('renders the order list title', () => {
    render(<OrderList />);

    expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
  });

  it('renders action buttons with accessible names', () => {
    render(<OrderList />);

    expect(screen.getByRole('button', { name: /ver atalhos de teclado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /atualizar pedidos/i })).toBeInTheDocument();
  });
});
