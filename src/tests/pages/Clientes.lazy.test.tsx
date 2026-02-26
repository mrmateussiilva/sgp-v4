import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Clientes from '@/pages/Clientes';

// Mock de papaparse
const mockParse = vi.fn((_file: unknown, options?: unknown) => {
  const result: {
    data: Array<{ nome: string; telefone: string; email: string }>;
    errors: Array<{ row: number; message: string }>;
  } = {
    data: [
      { nome: 'Cliente 1', telefone: '11999999999', email: 'cliente1@test.com' },
      { nome: 'Cliente 2', telefone: '11888888888', email: 'cliente2@test.com' },
    ],
    errors: [],
  };
  
  if (options?.complete) {
    options.complete(result);
  }
  
  return result;
});

vi.mock('papaparse', () => ({
  default: {
    parse: mockParse,
  },
}));

// Mock da API
vi.mock('@/services/api', () => ({
  api: {
    getClientes: vi.fn(() => Promise.resolve([])),
    createCliente: vi.fn(() => Promise.resolve({ id: 1 })),
    updateCliente: vi.fn(() => Promise.resolve({ id: 1 })),
    deleteCliente: vi.fn(() => Promise.resolve()),
    bulkImportClientes: vi.fn(() =>
      Promise.resolve({
        success: 2,
        errors: [],
        skipped: 0,
      })
    ),
  },
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Clientes - Lazy Loading CSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar papaparse dinamicamente ao importar CSV', async () => {
    const user = userEvent.setup();
    
    render(<Clientes />);

    // Cria um arquivo CSV mock
    const file = new File(
      ['nome,telefone,email\nCliente 1,11999999999,cliente1@test.com'],
      'clientes.csv',
      { type: 'text/csv' }
    );

    // Encontra o input de arquivo
    const fileInput = screen.getByLabelText(/importar/i) as HTMLInputElement;
    
    // Simula upload de arquivo
    await user.upload(fileInput, file);

    // Verifica que papaparse foi carregado dinamicamente
    await waitFor(async () => {
      const papaparse = await import('papaparse');
      expect(papaparse.default.parse).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('deve processar dados do CSV corretamente', async () => {
    const user = userEvent.setup();
    
    render(<Clientes />);

    const file = new File(
      ['nome,telefone,email\nCliente 1,11999999999,cliente1@test.com'],
      'clientes.csv',
      { type: 'text/csv' }
    );

    const fileInput = screen.getByLabelText(/importar/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockParse).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          header: true,
          skipEmptyLines: true,
        })
      );
    });
  });

  it('deve lidar com erros de parsing do CSV', async () => {
    const user = userEvent.setup();
    
    // Mock de erro no parsing
    mockParse.mockImplementationOnce((_file: unknown, options?: unknown) => {
      const result: {
        data: Array<{ nome: string; telefone: string; email: string }>;
        errors: Array<{ row: number; message: string }>;
      } = {
        data: [],
        errors: [
          { row: 1, message: 'Erro de parsing' },
        ],
      };
      if (options?.complete) {
        options.complete(result);
      }
      return result;
    });

    render(<Clientes />);

    const file = new File(['invalid,csv,data'], 'clientes.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText(/importar/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockParse).toHaveBeenCalled();
    });
  });
});

