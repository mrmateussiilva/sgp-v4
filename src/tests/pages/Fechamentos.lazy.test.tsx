import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Fechamentos from '@/pages/Fechamentos';
import { useToast } from '@/hooks/use-toast';

// Mock das bibliotecas pesadas
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    addPage: vi.fn(),
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    rect: vi.fn(),
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
  })),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock da API
vi.mock('@/services/api', () => ({
  api: {
    getFechamentoReport: vi.fn(() =>
      Promise.resolve({
        title: 'Relatório Teste',
        period_label: 'Período: 2024-01-01',
        status_label: 'Status: Todos',
        generated_at: '2024-01-01',
        page: 1,
        groups: [
          {
            label: 'Grupo Teste',
            subtotal: {
              valor_frete: 100,
              valor_servico: 200,
            },
            rows: [
              {
                ficha: 'F001',
                descricao: 'Descrição Teste',
                valor_frete: 50,
                valor_servico: 100,
              },
            ],
          },
        ],
      })
    ),
  },
}));

describe('Fechamentos - Lazy Loading PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar jspdf e jspdf-autotable dinamicamente ao exportar PDF', async () => {
    const user = userEvent.setup();
    
    render(<Fechamentos />);

    // Simula gerar relatório primeiro
    const generateButton = screen.getByText(/gerar relatório/i);
    await user.click(generateButton);

    // Aguarda o relatório ser gerado
    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });

    // Clica no botão de exportar PDF
    const exportButton = screen.getByText(/exportar pdf/i);
    await user.click(exportButton);

    // Verifica que as bibliotecas foram carregadas dinamicamente
    await waitFor(async () => {
      const jsPDF = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      expect(jsPDF.default).toHaveBeenCalled();
      expect(autoTable.default).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('deve mostrar erro se tentar exportar sem relatório', async () => {
    const user = userEvent.setup();
    const { toast } = useToast();
    
    render(<Fechamentos />);

    // Tenta exportar sem gerar relatório
    const exportButton = screen.getByText(/exportar pdf/i);
    await user.click(exportButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nenhum relatório disponível',
        })
      );
    });
  });
});

