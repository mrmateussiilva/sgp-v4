import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrderList from '../components/OrderList';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
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

describe('OrderList Component', () => {
  it('renders the order list title', () => {
    render(
      <BrowserRouter>
        <OrderList />
      </BrowserRouter>
    );

    expect(screen.getByText('Gerenciamento de Pedidos')).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    render(
      <BrowserRouter>
        <OrderList />
      </BrowserRouter>
    );

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });
});


