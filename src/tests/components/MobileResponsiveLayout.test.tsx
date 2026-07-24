import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PwaLayout } from '@/components/layouts/PwaLayout';
import { BottomNavBar } from '@/components/layouts/BottomNavBar';
import ExpedicaoCard from '@/components/ExpedicaoCard';
import type { OrderWithItems } from '@/types';

// Mock do hook useAuthStore
vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    username: 'operador_mobile',
    isAdmin: false,
  }),
}));

// Mock do service api
vi.mock('@/services/api', () => ({
  api: {
    logout: vi.fn(),
  },
}));

// Mock do store de notificações
vi.mock('@/store/designerNotificationStore', () => ({
  useDesignerNotificationStore: () => ({
    notifications: [],
    unreadCount: 0,
  }),
}));

describe('Otimizações de Layout Mobile e PWA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o PwaLayout com cabeçalho e botão de notificações', () => {
    render(
      <BrowserRouter>
        <PwaLayout>
          <div data-testid="mobile-content">Conteúdo da tela</div>
        </PwaLayout>
      </BrowserRouter>
    );

    expect(screen.getByText('SGP')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notificações de artes/i })).toBeInTheDocument();
  });

  it('deve renderizar a BottomNavBar com itens principais acessíveis', () => {
    render(
      <BrowserRouter>
        <BottomNavBar />
      </BrowserRouter>
    );

    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Mais')).toBeInTheDocument();
  });

  it('deve renderizar ExpedicaoCard com botão de detalhes acessível por toque', () => {
    const mockOrder: OrderWithItems = {
      id: 101,
      numero: '101',
      cliente: 'Cliente Teste Mobile',
      customer_name: 'Cliente Teste Mobile',
      status: 'EM_PRODUCAO',
      prioridade: 'NORMAL',
      expedicao: false,
      items: [
        {
          id: 1,
          item_name: 'Painel Tecido 3x2m',
          quantity: 1,
          tipo_producao: 'PAINEL',
        },
      ],
    };

    render(
      <ExpedicaoCard
        order={mockOrder}
        onOpenDetails={vi.fn()}
        onToggleExpedition={vi.fn()}
        isUpdating={false}
      />
    );

    const detailsButton = screen.getByRole('button', { name: /ver detalhes/i });
    expect(detailsButton).toBeInTheDocument();
    expect(detailsButton.className).toContain('h-10');
    expect(detailsButton.className).toContain('w-10');
  });
});
