import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV, exportToPDF, exportEnvioReportToPDF } from '@/utils/exportUtils';
import { OrderWithItems, OrderStatus } from '@/types';

// Mock das bibliotecas pesadas
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn((data) => {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map((row: any) => headers.map((h) => row[h]).join(','));
      return [headers.join(','), ...rows].join('\n');
    }),
  },
}));

const createMockJsPDF = () => ({
  setFontSize: vi.fn().mockReturnThis(),
  setFont: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  save: vi.fn(),
  output: vi.fn(() => 'blob:mock'),
  addPage: vi.fn().mockReturnThis(),
  setFillColor: vi.fn().mockReturnThis(),
  setTextColor: vi.fn().mockReturnThis(),
  rect: vi.fn().mockReturnThis(),
  internal: {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297,
    },
  },
});

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(createMockJsPDF),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// Mock de DOM APIs
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();
global.Blob = vi.fn().mockImplementation((parts) => ({
  size: JSON.stringify(parts).length,
  type: 'text/csv',
}));

describe('exportUtils - Lazy Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.createElement
    document.createElement = vi.fn((tagName: string) => {
      const element = {
        tagName: tagName.toUpperCase(),
        setAttribute: vi.fn(),
        style: {},
        click: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        parentNode: null,
      } as any;
      if (tagName === 'a') {
        element.href = '';
        element.download = '';
      }
      return element;
    });
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportToCSV', () => {
    it('deve carregar papaparse dinamicamente', async () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          customer_name: 'Cliente Teste',
          address: 'Rua Teste',
          total_value: 100,
          status: OrderStatus.Pendente,
          created_at: '2024-01-01',
          items: [],
        } as OrderWithItems,
      ];

      await exportToCSV(orders);

      // Verifica que papaparse foi importado dinamicamente
      const papaparse = await import('papaparse');
      expect(papaparse.default.unparse).toHaveBeenCalled();
    });

    it('deve criar e baixar arquivo CSV', async () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          customer_name: 'Cliente Teste',
          address: 'Rua Teste',
          total_value: 100,
          status: OrderStatus.Pendente,
          created_at: '2024-01-01',
          items: [],
        } as OrderWithItems,
      ];

      await exportToCSV(orders);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.Blob).toHaveBeenCalled();
    });

    it('deve lidar com array vazio', async () => {
      await exportToCSV([]);
      expect(document.createElement).toHaveBeenCalled();
    });
  });

  describe('exportToPDF', () => {
    it('deve carregar jspdf e jspdf-autotable dinamicamente', async () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          customer_name: 'Cliente Teste',
          address: 'Rua Teste',
          total_value: 100,
          status: OrderStatus.Pendente,
          created_at: '2024-01-01',
          items: [],
        } as OrderWithItems,
      ];

      await exportToPDF(orders);

      // Verifica que jspdf foi importado dinamicamente
      const jsPDF = await import('jspdf');
      expect(jsPDF.default).toHaveBeenCalled();
    });

    it('deve criar PDF com dados corretos', async () => {
      const orders: OrderWithItems[] = [
        {
          id: 1,
          customer_name: 'Cliente Teste',
          address: 'Rua Teste',
          total_value: 100,
          status: OrderStatus.Pendente,
          created_at: '2024-01-01',
          items: [],
        } as OrderWithItems,
      ];

      await exportToPDF(orders);

      const jsPDF = await import('jspdf');
      const pdfInstance = (jsPDF.default as any).mock.results[0].value;
      
      expect(pdfInstance.text).toHaveBeenCalled();
      expect(pdfInstance.save).toHaveBeenCalled();
    });
  });

  describe('exportEnvioReportToPDF', () => {
    it('deve carregar bibliotecas dinamicamente', async () => {
      const groups = [
        {
          forma_envio: 'Correios',
          pedidos: [
            {
              id: 1,
              customer_name: 'Cliente Teste',
              cliente: 'Cliente Teste',
              address: 'Rua Teste',
              total_value: 100,
              status: OrderStatus.Pendente,
              items: [],
              cidade_cliente: 'São Paulo',
              estado_cliente: 'SP',
              observacao: 'Teste',
              data_entrega: '2024-01-01',
            } as OrderWithItems,
          ],
        },
      ];

      await exportEnvioReportToPDF(groups, '2024-01-01');

      const jsPDF = await import('jspdf');
      expect(jsPDF.default).toHaveBeenCalled();
    });

    it('deve retornar early se groups estiver vazio', async () => {
      await exportEnvioReportToPDF([], '2024-01-01');

      const jsPDF = await import('jspdf');
      // Não deve criar PDF se não houver grupos
      expect(jsPDF.default).not.toHaveBeenCalled();
    });

    it('deve criar PDF com múltiplos grupos', async () => {
      const groups = [
        {
          forma_envio: 'Correios',
          pedidos: [
            {
              id: 1,
              customer_name: 'Cliente 1',
              cliente: 'Cliente 1',
              address: 'Rua Teste 1',
              total_value: 100,
              status: OrderStatus.Pendente,
              items: [],
              cidade_cliente: 'São Paulo',
              estado_cliente: 'SP',
            } as OrderWithItems,
          ],
        },
        {
          forma_envio: 'Transportadora',
          pedidos: [
            {
              id: 2,
              customer_name: 'Cliente 2',
              cliente: 'Cliente 2',
              address: 'Rua Teste 2',
              total_value: 200,
              status: OrderStatus.Pendente,
              items: [],
              cidade_cliente: 'Rio de Janeiro',
              estado_cliente: 'RJ',
            } as OrderWithItems,
          ],
        },
      ];

      await exportEnvioReportToPDF(groups, '2024-01-01', '2024-01-31');

      const jsPDF = await import('jspdf');
      expect(jsPDF.default).toHaveBeenCalled();
    });
  });
});

