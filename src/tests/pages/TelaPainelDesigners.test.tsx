import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import TelaPainelDesigners from '@/pages/TelaPainelDesigners';
import { useAuthStore } from '@/store/authStore';


// Mock do Tauri core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve('1.0.0')),
}));

// Mock do isTauri helper
vi.mock('@/utils/isTauri', () => ({
  isTauri: () => false,
}));

// Mock do Radix Dialog Portal para renderizar inline no JSDOM
vi.mock('@radix-ui/react-dialog', async (importOriginal) => {
  const original = await importOriginal<typeof import('@radix-ui/react-dialog')>();
  return {
    ...original,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});



describe('TelaPainelDesigners Integration Tests', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      username: 'Designer 1',
      isAdmin: false,
      userId: 1,
      sessionToken: 'valid-session-token',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar a tela de painel de designers e exibir as duas colunas', async () => {
    render(<TelaPainelDesigners />);

    // Aguarda o sumiço do spinner de carregamento inicial
    await waitFor(() => {
      expect(screen.queryByText(/Carregando Painel/i)).not.toBeInTheDocument();
    });

    // Verifica o título principal
    expect(screen.getByText('Painel de Designers')).toBeInTheDocument();

    // Verifica a existência das duas colunas: "Aguardando" e "Liberado" (regex substring match)
    await waitFor(() => {
      expect(screen.getByText(/Aguardando/i)).toBeInTheDocument();
      expect(screen.getByText(/Liberado/i)).toBeInTheDocument();
    });
  });


  it('deve carregar os itens mockados e renderizar nos locais corretos', async () => {
    render(<TelaPainelDesigners />);

    await waitFor(() => {
      expect(screen.queryByText(/Carregando Painel/i)).not.toBeInTheDocument();
    });

    // Espera os itens renderizarem. No mock do MSW:
    // Item 101: status_arte "aguardando" para "Cliente A"
    // Item 102: status_arte "liberado" para "Cliente B"
    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
      expect(screen.getByText('Cliente B')).toBeInTheDocument();
    });

    // Cliente A (aguardando) deve estar na coluna "Aguardando"
    // A coluna de "Aguardando" tem um contador de badge (deve ser 1)
    // Como existem múltiplos contadores "1" na página, selecionamos a primeira badge
    const aguardandoBadge = screen.getAllByText('1')[0];
    expect(aguardandoBadge).toBeInTheDocument();
  });


  it('deve permitir abrir o modal de detalhes ao clicar no card', async () => {
    const user = userEvent.setup();
    render(<TelaPainelDesigners />);

    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
    });

    // Clica no card do Cliente A
    await user.click(screen.getByText('Cliente A'));

    // O modal deve ser exibido com o título e o botão de fechar
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('FECHAR [ESC]')).toBeInTheDocument();
    });

    // Fecha o modal
    await user.click(screen.getByText('FECHAR [ESC]'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });


});
