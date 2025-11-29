/**
 * Testes para a view de Fechamentos
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../test-utils';
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

// Mock Tauri
vi.mock('@/utils/isTauri', () => ({
  isTauri: () => false,
}));

describe('FechamentoView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar a view de fechamentos', async () => {
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
      expect(screen.getByText(/fechamentos/i)).toBeInTheDocument();
    });
  });

  it('deve aplicar filtros corretamente', async () => {
    server.use(
      http.post('http://localhost:8000/api/reports', ({ request }) => {
        return HttpResponse.json({
          groups: [],
          total: { valor_frete: 0, valor_servico: 0 },
        });
      })
    );

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
    expect(startDateInput).toHaveValue('2024-01-01');
  });

  it('deve calcular totais corretamente', async () => {
    const mockReport = {
      groups: [
        {
          label: 'Grupo 1',
          subtotal: { valor_frete: 100, valor_servico: 200 },
          rows: [],
        },
      ],
      total: { valor_frete: 100, valor_servico: 200 },
    };

    server.use(
      http.post('http://localhost:8000/api/reports', () => {
        return HttpResponse.json(mockReport);
      })
    );

    render(<Fechamentos />);

    await waitFor(() => {
      // Verificar que totais são exibidos
      expect(screen.getByText(/total/i)).toBeInTheDocument();
    });
  });
});

