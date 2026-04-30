import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Fechamentos from '@/pages/Fechamentos';
import { useToast } from '@/hooks/use-toast';

const mockToast = vi.hoisted(() => vi.fn());
const mockGetRelatorioSemanal = vi.hoisted(() => vi.fn(() =>
  Promise.resolve([
    {
      id: 1,
      numero: 'F001',
      customer_name: 'Grupo Teste',
      cliente: 'Grupo Teste',
      data_entrada: '2026-04-15',
      data_entrega: '2026-04-15',
      valor_frete: 50,
      valor_total: 150,
      total_value: 150,
      status: 'Concluido',
      items: [
        {
          id: 1,
          order_id: 1,
          item_name: 'Descrição Teste',
          descricao: 'Descrição Teste',
          unit_price: 100,
          quantity: 1,
          subtotal: 100,
          vendedor: 'Vendedor Teste',
          designer: 'Designer Teste',
          tipo_producao: 'Banner',
          tecido: 'Tecido Teste',
        },
      ],
    },
  ])
));
const mockGeneratedReport = vi.hoisted(() => ({
  title: 'Relatório Teste',
  period_label: 'Período: 2026-04-01 a 2026-04-29',
  status_label: 'Status: Todos',
  generated_at: '2026-04-29T10:00:00Z',
  report_type: 'analitico_designer_cliente',
  groups: [
    {
      key: 'grupo-teste',
      label: 'Grupo Teste',
      subtotal: { valor_frete: 50, valor_servico: 100 },
      rows: [
        {
          ficha: 'F001',
          descricao: 'Descrição Teste',
          valor_frete: 50,
          valor_servico: 100,
        },
      ],
      subgroups: [],
    },
  ],
  total: { valor_frete: 50, valor_servico: 100 },
}));

// Mock das bibliotecas pesadas
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    output: vi.fn(() => ({ arrayBuffer: () => new ArrayBuffer(0) })),
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
    toast: mockToast,
  }),
}));

// Mock da API
vi.mock('@/services/api', () => ({
  api: {
    getRelatorioSemanal: mockGetRelatorioSemanal,
  },
}));

vi.mock('@/utils/fechamentoReport', () => ({
  generateFechamentoReport: vi.fn(() => mockGeneratedReport),
}));

describe('Fechamentos - Lazy Loading PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar jspdf e jspdf-autotable dinamicamente ao exportar PDF', async () => {
    const user = userEvent.setup();
    
    render(<Fechamentos />);
    await user.clear(screen.getByLabelText(/data inicial/i));
    await user.type(screen.getByLabelText(/data inicial/i), '2026-04-01');
    await user.clear(screen.getByLabelText(/data final/i));
    await user.type(screen.getByLabelText(/data final/i), '2026-04-29');

    // Simula gerar relatório primeiro
    const generateButton = screen.getByText(/gerar relatório/i);
    await user.click(generateButton);
    await waitFor(() => {
      expect(mockGetRelatorioSemanal).toHaveBeenCalled();
    });

    // Aguarda o relatório ser gerado
    await waitFor(() => {
      expect(screen.getByText('Grupo Teste')).toBeInTheDocument();
    });

    // Clica no botão de exportar PDF
    const exportButton = screen.getByText(/exportar pdf/i);
    await user.click(exportButton);

    // Verifica que as bibliotecas foram carregadas dinamicamente
    await waitFor(async () => {
      const jsPDF = await import('jspdf');
      
      expect(jsPDF.default).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('deve manter exportação PDF desabilitada sem relatório', async () => {
    render(<Fechamentos />);

    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeDisabled();
    expect(useToast().toast).not.toHaveBeenCalled();
  });
});
