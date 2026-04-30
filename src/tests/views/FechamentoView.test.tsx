/**
 * Testes para a view de Fechamentos
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../test-utils';
import Fechamentos from '@/pages/Fechamentos';
import { useAuthStore } from '@/store/authStore';
import { setApiUrl } from '@/api/client';

const mockGetRelatorioSemanal = vi.hoisted(() => vi.fn());

vi.mock('@/services/api', () => ({
  api: {
    getRelatorioSemanal: mockGetRelatorioSemanal,
    batchUpdateStatus: vi.fn(() => Promise.resolve()),
  },
}));

// Mock do jsPDF
vi.mock('jspdf', () => {
  const mockDoc = {
    setFont: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    output: vi.fn(() => ({ arrayBuffer: () => new ArrayBuffer(0) })),
    lastAutoTable: { finalY: 0 },
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    save: vi.fn(),
  };
  const jsPDF = vi.fn(() => mockDoc);
  return {
    default: jsPDF,
    jsPDF: jsPDF,
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// Mock Tauri
vi.mock('@/utils/isTauri', () => ({
  isTauri: () => false,
}));

describe('FechamentoView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiUrl('http://localhost:8000/api');
    useAuthStore.getState().login({
      userId: 1,
      username: 'testuser',
      sessionToken: 'mock-token',
      isAdmin: true,
    });
  });

  it('deve renderizar a view de fechamentos', async () => {
    mockGetRelatorioSemanal.mockResolvedValue([]);

    render(<Fechamentos />);

    await waitFor(() => {
      // O h1 é "Fechamentos"
      expect(screen.getByRole('heading', { name: /^Fechamentos$/i })).toBeTruthy();
    });
  });

  it('deve aplicar filtros corretamente', async () => {
    mockGetRelatorioSemanal.mockResolvedValue([]);

    render(<Fechamentos />);

    // Encontrar e preencher filtros
    const startDateInput = screen.getByLabelText(/data inicial/i);
    if (startDateInput) {
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    }

    const endDateInput = screen.getByLabelText(/data final/i);
    if (endDateInput) {
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
    }

    // Verificar que filtros foram aplicados
    expect((startDateInput as HTMLInputElement).value).toBe('2024-01-01');
  });

  it('deve calcular totais corretamente', async () => {
    const mockPedidos = [
      {
        id: 1,
        numero: 'PED-001',
        customer_name: 'Cliente A',
        cliente: 'Cliente A',
        data_entrada: '2024-01-15',
        data_entrega: '2024-01-15',
        valor_frete: 100,
        total_value: 300,
        valor_total: 300,
        status: 'Concluido',
        items: [
          {
            id: 1,
            order_id: 1,
            item_name: 'Item 1',
            unit_price: 200,
            quantity: 1,
            subtotal: 200,
            vendedor: 'Vendedor 1',
            designer: 'Designer 1',
            tipo_producao: 'Banner',
          }
        ]
      }
    ];

    mockGetRelatorioSemanal.mockResolvedValue(mockPedidos);

    render(<Fechamentos />);

    // Encontrar e preencher filtros para bater com o mock
    const startDateInput = screen.getByLabelText(/data inicial/i);
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    const endDateInput = screen.getByLabelText(/data final/i);
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

    // Clicar no botão gerar relatório
    const generateBtn = screen.getByRole('button', { name: /gerar relatório/i });
    expect(generateBtn).not.toBeDisabled();
    fireEvent.click(generateBtn);

    // Verificar se entrou em estado de carregamento
    await waitFor(() => {
      expect(screen.getByText(/gerando relatório/i)).toBeTruthy();
    });

    // Aguardar o relatório aparecer
    try {
      await waitFor(() => {
        // Se aparecer a mensagem de "Nenhum dado encontrado", o filtro falhou
        const emptyMsg = screen.queryByText(/Nenhum dado encontrado/i);
        if (emptyMsg) {
          console.error('Relatório vazio encontrado!');
        }

        // Verificar que o cliente aparece na tabela (pode estar como "Cliente: Cliente A")
        expect(screen.getByText(/Cliente A/i)).toBeTruthy();

        // Valores - usando regex flexível para separador decimal e ignorando R$ / espaços
        expect(screen.getAllByText(/100[.,]00/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/200[.,]00/).length).toBeGreaterThan(0);
      }, { timeout: 15000 });
    } catch (error) {
      console.log('Teste falhou. Conteúdo atual da tela:');
      screen.debug(undefined, 20000);
      throw error;
    }
  }, 30000);
});
