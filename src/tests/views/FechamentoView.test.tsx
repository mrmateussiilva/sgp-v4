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
      http.get('http://localhost:8000/api/relatorios-fechamentos/pedidos/relatorio-semanal', () => {
        return HttpResponse.json([]);
      })
    );

    render(<Fechamentos />);

    await waitFor(() => {
      expect(screen.getByText(/Relatórios de Fechamentos/i)).toBeTruthy();
    });
  });

  it('deve aplicar filtros corretamente', async () => {
    server.use(
      http.get('http://localhost:8000/api/relatorios-fechamentos/pedidos/relatorio-semanal', () => {
        return HttpResponse.json([]);
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
    expect((startDateInput as HTMLInputElement).value).toBe('2024-01-01');
  });

  it('deve calcular totais corretamente', async () => {
    const mockPedidos = [
      {
        id: 1,
        numero: 'PED-001',
        cliente: 'Cliente A',
        data_entrada: '2024-01-15',
        valor_frete: 100,
        total_value: 300,
        status: 'Concluido',
        items: [
          {
            id: 1,
            item_name: 'Item 1',
            unit_price: 200,
            quantity: 1,
            vendedor: 'Vendedor 1',
            designer: 'Designer 1',
          }
        ]
      }
    ];

    server.use(
      http.get('http://localhost:8000/api/relatorios-fechamentos/pedidos/relatorio-semanal', () => {
        return HttpResponse.json(mockPedidos);
      })
    );

    render(<Fechamentos />);

    // Clicar no botão gerar relatório
    const generateBtn = screen.getByRole('button', { name: /gerar relatório/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      // Verificar que o valor do serviço ou frete aparece na tela
      // O utilitário formata como moeda R$ 100,00 etc.
      expect(screen.getByText(/R\$ 100,00/i)).toBeTruthy();
    }, { timeout: 3000 });
  });
});

