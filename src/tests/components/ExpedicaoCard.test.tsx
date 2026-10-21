import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '../test-utils';
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

    render(
      <ExpedicaoCard 
        order={mockOrder} 
        onOpenDetails={onOpenDetails}
        onToggleExpedition={onToggleExpedition}
        isUpdating={false}
      />
    );

    // Verificar dados do cabeçalho
    expect(screen.getByText('Pedido #1234')).toBeInTheDocument();
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
        isUpdating={false}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /Desfazer Expedição/i });
    expect(undoBtn).toBeInTheDocument();
    
    fireEvent.click(undoBtn);
    expect(onToggleExpedition).toHaveBeenCalledWith(1, true);
  });

  it('renders item thumbnail button and opens preview modal on click', async () => {
    render(
      <ExpedicaoCard 
        order={mockOrder} 
        onOpenDetails={vi.fn()}
        onToggleExpedition={vi.fn()}
        isUpdating={false}
      />
    );

    const thumbBtn = await screen.findByRole('button', { name: /Ver estampa de Camiseta Básica/i });
    expect(thumbBtn).toBeInTheDocument();

    fireEvent.click(thumbBtn);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Camiseta Básica/i)).toBeInTheDocument();
  });

  it('allows expanding items when there are more than 3 items', () => {
    const orderWithManyItems: OrderWithItems = {
      ...mockOrder,
      items: [
        { id: 1, order_id: 1, item_name: 'Item 1', quantity: 1, status: 'pendente' },
        { id: 2, order_id: 1, item_name: 'Item 2', quantity: 1, status: 'pendente' },
        { id: 3, order_id: 1, item_name: 'Item 3', quantity: 1, status: 'pendente' },
        { id: 4, order_id: 1, item_name: 'Item 4 Extra', quantity: 1, status: 'pendente' },
      ],
    };

    render(
      <ExpedicaoCard 
        order={orderWithManyItems} 
        onOpenDetails={vi.fn()}
        onToggleExpedition={vi.fn()}
        isUpdating={false}
      />
    );

    expect(screen.queryByText('Item 4 Extra')).not.toBeInTheDocument();
    const expandBtn = screen.getByRole('button', { name: /\+ 1 itens no pedido/i });
    fireEvent.click(expandBtn);

    expect(screen.getByText('Item 4 Extra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mostrar menos itens/i })).toBeInTheDocument();
  });
});
