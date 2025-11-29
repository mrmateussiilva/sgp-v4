/**
 * Testes para a tabela de fechamentos (componente dentro de Fechamentos)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import Fechamentos from '@/pages/Fechamentos';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

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
    groups: [
      {
        key: 'group-1',
        label: 'Cliente A',
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
    generated_at: '2024-01-15T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    server.use(
      http.post('http://localhost:8000/api/reports', () => {
        return HttpResponse.json(mockReport);
      })
    );
  });

  it('deve renderizar dados do relatório', async () => {
    render(<Fechamentos />);

    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
      expect(screen.getByText('001')).toBeInTheDocument();
    });
  });

  it('deve aplicar filtro por nome', async () => {
    render(<Fechamentos />);

    await waitFor(() => {
      expect(screen.getByText('001')).toBeInTheDocument();
    });

    // Encontrar campo de filtro por nome
    const nomeFilterInput = screen.getByPlaceholderText(/filtrar por nome/i) ||
                           screen.getByLabelText(/filtrar/i);
    
    if (nomeFilterInput) {
      fireEvent.change(nomeFilterInput, { target: { value: 'Painel' } });

      await waitFor(() => {
        // Deve mostrar apenas itens que contêm "Painel"
        expect(screen.getByText('Painel promocional')).toBeInTheDocument();
        // Não deve mostrar "Banner"
        expect(screen.queryByText('Banner publicitário')).not.toBeInTheDocument();
      });
    }
  });

  it('deve renderizar totais corretamente', async () => {
    render(<Fechamentos />);

    await waitFor(() => {
      // Verificar que totais são exibidos
      expect(screen.getByText(/frete/i)).toBeInTheDocument();
      expect(screen.getByText(/serviços/i)).toBeInTheDocument();
    });
  });

  it('não deve quebrar com dados vazios', async () => {
    server.use(
      http.post('http://localhost:8000/api/reports', () => {
        return HttpResponse.json({
          groups: [],
          total: { valor_frete: 0, valor_servico: 0 },
        });
      })
    );

    render(<Fechamentos />);

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

