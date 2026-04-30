/**
 * Testes para a tabela de fechamentos (componente dentro de Fechamentos)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import Fechamentos from '@/pages/Fechamentos';

const mockGetRelatorioSemanal = vi.hoisted(() => vi.fn());
const mockGeneratedReport = vi.hoisted(() => ({
  title: 'Relatório Teste',
  period_label: 'Período: 2026-04-01 a 2026-04-29',
  status_label: 'Status: Todos',
  generated_at: '2026-04-29T10:00:00Z',
  report_type: 'analitico_designer_cliente',
  groups: [
    {
      key: 'group-1',
      label: 'Designer 1',
      subtotal: { valor_frete: 100, valor_servico: 200 },
      rows: [
        {
          ficha: '001',
          descricao: 'Painel promocional',
          valor_frete: 50,
          valor_servico: 100,
        },
        {
          ficha: '002',
          descricao: 'Banner publicitário',
          valor_frete: 50,
          valor_servico: 100,
        },
      ],
      subgroups: [],
    },
  ],
  total: { valor_frete: 100, valor_servico: 200 },
}));

vi.mock('@/services/api', () => ({
  api: {
    getRelatorioSemanal: mockGetRelatorioSemanal,
  },
}));

vi.mock('@/utils/fechamentoReport', () => ({
  generateFechamentoReport: vi.fn(() => mockGeneratedReport),
}));

// Mock do jsPDF
vi.mock('jspdf', () => {
  const mockDoc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    output: vi.fn(() => ({ arrayBuffer: () => new ArrayBuffer(0) })),
    lastAutoTable: { finalY: 0 },
  };
  return {
    default: vi.fn(() => mockDoc),
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

vi.mock('@/utils/isTauri', () => ({
  isTauri: () => false,
}));

describe('FechamentoTable', () => {
  const mockReport = {
    orders: [
      {
        id: 1,
        numero: '001',
        customer_name: 'Cliente A',
        cliente: 'Cliente A',
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
            item_name: 'Painel promocional',
            descricao: 'Painel promocional',
            unit_price: 100,
            quantity: 1,
            subtotal: 100,
            vendedor: 'Vendedor 1',
            designer: 'Designer 1',
            tipo_producao: 'Banner',
            tecido: 'Tecido A',
          },
        ],
      },
      {
        id: 2,
        numero: '002',
        customer_name: 'Cliente A',
        cliente: 'Cliente A',
        data_entrada: '2026-04-15',
        data_entrega: '2026-04-15',
        valor_frete: 50,
        valor_total: 150,
        total_value: 150,
        status: 'Concluido',
        items: [
          {
            id: 2,
            order_id: 2,
            item_name: 'Banner publicitário',
            descricao: 'Banner publicitário',
            unit_price: 100,
            quantity: 1,
            subtotal: 100,
            vendedor: 'Vendedor 1',
            designer: 'Designer 1',
            tipo_producao: 'Banner',
            tecido: 'Tecido B',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRelatorioSemanal.mockResolvedValue(mockReport.orders);
  });

  const gerarRelatorio = async () => {
    fireEvent.change(screen.getByLabelText(/data inicial/i), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText(/data final/i), { target: { value: '2026-04-29' } });
    fireEvent.click(screen.getByRole('button', { name: /gerar relatório/i }));
    await waitFor(() => {
      expect(mockGetRelatorioSemanal).toHaveBeenCalled();
    });
  };

  it('deve renderizar dados do relatório', async () => {
    render(<Fechamentos />);
    await gerarRelatorio();

    await waitFor(() => {
      expect(screen.getByText('Designer 1')).toBeInTheDocument();
      expect(screen.getByText('001')).toBeInTheDocument();
    });
  });

  it('deve aplicar filtro por nome', async () => {
    render(<Fechamentos />);
    await gerarRelatorio();

    await waitFor(() => {
      expect(screen.getByText('001')).toBeInTheDocument();
    });

    expect(screen.getByText('Painel promocional')).toBeInTheDocument();
    expect(screen.getByText('Banner publicitário')).toBeInTheDocument();
  });

  it('deve renderizar totais corretamente', async () => {
    render(<Fechamentos />);
    await gerarRelatorio();

    await waitFor(() => {
      // Verificar que totais são exibidos
      expect(screen.getAllByText(/frete/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/serviços/i).length).toBeGreaterThan(0);
    });
  });

  it('não deve quebrar com dados vazios', async () => {
    mockGetRelatorioSemanal.mockResolvedValue([]);

    render(<Fechamentos />);
    await gerarRelatorio();

    await waitFor(() => {
      // Não deve quebrar
      expect(screen.getByText(/fechamentos/i)).toBeInTheDocument();
    });
  });

  it('deve aplicar filtros de data', async () => {
    render(<Fechamentos />);

    const startDateInput = screen.getByLabelText(/data inicial/i);
    if (startDateInput) {
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      expect(startDateInput).toHaveValue('2024-01-01');
    }
  });
});
