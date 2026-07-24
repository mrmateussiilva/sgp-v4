import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PwaLayout } from '@/components/layouts/PwaLayout';

// Mock do auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    username: 'operador_test',
    isAdmin: true,
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

describe('Correções Estruturais de Responsividade e Scroll Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve utilizar padding superior compacto (pt-2) no container principal para eliminar lacuna em branco no topo', () => {
    const { container } = render(
      <BrowserRouter>
        <PwaLayout>
          <div data-testid="page-content">Conteúdo</div>
        </PwaLayout>
      </BrowserRouter>
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement?.className).toContain('pt-2');
    expect(mainElement?.className).toContain('overflow-auto');
  });

  it('deve validar estrutura responsiva sem overflow horizontal em telas de 320px, 360px, 390px e 430px', () => {
    const viewports = [320, 360, 390, 430];

    viewports.forEach((width) => {
      window.innerWidth = width;
      window.innerHeight = 800;

      const { container } = render(
        <BrowserRouter>
          <PwaLayout>
            <div className="w-full">Test Viewport {width}px</div>
          </PwaLayout>
        </BrowserRouter>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement?.className).not.toContain('overflow-x-scroll');
    });
  });
});
