import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import ExpedicaoCard from '../../components/ExpedicaoCard';
import { OrderWithItems, OrderStatus } from '../../types';

// Mock utils
vi.mock('@/utils/date', () => ({
  formatDateForDisplay: vi.fn((date) => date),
}));
vi.mock('@/utils/imagePreview', () => ({
  getImagePreviewUrl: vi.fn(() => Promise.resolve('mock-url')),
}));

const mockOrder: OrderWithItems = {
  id: 1,
  numero: '1234',
  cliente: 'Cliente Teste',
  data_entrega: '2023-12-01',
  status: OrderStatus.Pronto,
  forma_envio: 'Correios',
  items: [
    {
      id: 101,
      order_id: 1,
      item_name: 'Camiseta Básica',
      quantity: 2,
      tipo_producao: 'Sublimação',
      imagem: 'http://example.com/img.png',
      status: 'pendente'
    }
  ],
  observacao: 'Embalar para presente',
};

describe('ExpedicaoCard Component', () => {
  it('renders order information correctly', () => {
    const onOpenDetails = vi.fn();
    const onToggleExpedition = vi.fn();
    const onPrintFicha = vi.fn();

    render(
      <ExpedicaoCard 
        order={mockOrder} 
        onOpenDetails={onOpenDetails}
        onToggleExpedition={onToggleExpedition}
        onPrintFicha={onPrintFicha}
        isUpdating={false}
      />
    );

    // Verificar dados do cabeçalho
    expect(screen.getByText('#1234')).toBeInTheDocument();
    expect(screen.getByText('Cliente Teste')).toBeInTheDocument();
    
    // Verificar observação
    expect(screen.getByText('Embalar para presente')).toBeInTheDocument();
    
    // Verificar itens do pedido
    expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
  });

  it('calls onToggleExpedition when expedite button is clicked', () => {
    const onToggleExpedition = vi.fn();

    render(
      <ExpedicaoCard 
        order={mockOrder} 
        onOpenDetails={vi.fn()}
        onToggleExpedition={onToggleExpedition}
        onPrintFicha={vi.fn()}
        isUpdating={false}
      />
    );

    // O botão principal agora se chama "EXPEDIR PEDIDO"
    const expediteBtn = screen.getByRole('button', { name: /EXPEDIR PEDIDO/i });
    fireEvent.click(expediteBtn);
    
    // O mockOrder tem currentStatus de expedicao false
    expect(onToggleExpedition).toHaveBeenCalledWith(1, false);
  });

  it('renders "Desfazer Expedição" button when order is expedited', () => {
    const onToggleExpedition = vi.fn();
    const expeditedOrder = { ...mockOrder, expedicao: true };

    render(
      <ExpedicaoCard 
        order={expeditedOrder} 
        onOpenDetails={vi.fn()}
        onToggleExpedition={onToggleExpedition}
        onPrintFicha={vi.fn()}
        isUpdating={false}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /Desfazer Expedição/i });
    expect(undoBtn).toBeInTheDocument();
    
    fireEvent.click(undoBtn);
    expect(onToggleExpedition).toHaveBeenCalledWith(1, true);
  });
});
