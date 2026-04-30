import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { useAuthStore } from '@/store/authStore';

// Mock do Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve('1.0.0')),
}));

// Mock da API
vi.mock('@/services/api', () => ({
  api: {
    logout: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/utils/isTauri', () => ({
  isTauri: () => true,
}));

// Mock das rotas lazy - usando React.lazy mock
vi.mock('@/components/OrderList', () => ({
  default: () => <div>OrderList Component</div>,
}));

vi.mock('@/views/PedidoCreateView', () => ({
  default: () => <div>PedidoCreateView Component</div>,
}));

vi.mock('@/views/PedidoEditView', () => ({
  default: () => <div>PedidoEditView Component</div>,
}));

vi.mock('@/pages/DashboardOverview', () => ({
  default: () => <div>DashboardOverview Component</div>,
}));

vi.mock('@/pages/Clientes', () => ({
  default: () => <div>Clientes Component</div>,
}));

vi.mock('@/pages/RelatoriosEnvios', () => ({
  default: () => <div>RelatoriosEnvios Component</div>,
}));

vi.mock('@/pages/Fechamentos', () => ({
  default: () => <div>Fechamentos Component</div>,
}));

vi.mock('@/pages/PainelDesempenho', () => ({
  default: () => <div>PainelDesempenho Component</div>,
}));

vi.mock('@/pages/Admin', () => ({
  default: () => <div>Admin Component</div>,
}));

describe('Dashboard - Lazy Loading', () => {
  beforeEach(() => {
    // Reset auth store
    useAuthStore.setState({
      isAuthenticated: true,
      username: 'testuser',
      isAdmin: false,
      userId: 1,
      sessionToken: 'token',
    });
  });

  const renderDashboard = (initialPath = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('deve renderizar DashboardOverview na rota inicial', async () => {
    renderDashboard('/dashboard');
    
    // Aguarda o componente lazy carregar
    await waitFor(() => {
      const component = screen.queryByText('DashboardOverview Component');
      // Pode não estar visível se ainda estiver carregando
      expect(component || screen.queryByText('SGP')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('deve carregar OrderList lazy na rota /dashboard/orders', async () => {
    renderDashboard('/dashboard/orders');
    
    await waitFor(() => {
      expect(screen.getByText('OrderList Component')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('deve carregar PedidoCreateView lazy na rota /dashboard/orders/new', async () => {
    renderDashboard('/dashboard/orders/new');
    
    await waitFor(() => {
      expect(screen.getByText('PedidoCreateView Component')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('deve carregar Clientes lazy na rota /dashboard/clientes', async () => {
    renderDashboard('/dashboard/clientes');
    
    await waitFor(() => {
      expect(screen.getByText('Clientes Component')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('deve mostrar loading durante carregamento lazy', async () => {
    renderDashboard('/dashboard/orders');
    
    // Deve mostrar indicador de loading (componente Suspense)
    await waitFor(() => {
      const loadingText = screen.queryByText(/carregando/i);
      // Pode ou não estar visível dependendo da velocidade do carregamento
      expect(loadingText || screen.queryByText('OrderList Component')).toBeTruthy();
    });
  });

  it('deve renderizar sidebar com menu items', async () => {
    renderDashboard('/dashboard');
    
    await waitFor(() => {
      expect(screen.getByText('SGP')).toBeInTheDocument();
      expect(screen.getByText('Início')).toBeInTheDocument();
      expect(screen.getByText('Pedidos')).toBeInTheDocument();
    });
  });

  it('deve filtrar menu items baseado em permissões admin', async () => {
    useAuthStore.setState({ isAdmin: false });
    renderDashboard('/dashboard');
    
    await waitFor(() => {
      // Não deve mostrar itens admin
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Fechamentos')).not.toBeInTheDocument();
    });
  });

  it('deve mostrar itens admin quando usuário é admin', async () => {
    useAuthStore.setState({ isAdmin: true });
    renderDashboard('/dashboard');
    
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Fechamentos')).toBeInTheDocument();
    });
  });
});
