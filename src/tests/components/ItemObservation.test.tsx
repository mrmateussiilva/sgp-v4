import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { FormPainelCompleto } from '../../components/FormPainelCompleto';
import OrderDetails from '../../components/OrderDetails';
import { OrderWithItems, OrderStatus } from '../../types';
import { useOrderStore } from '../../store/orderStore';

vi.mock('@/utils/imagePreview', () => ({
  getImagePreviewUrl: vi.fn(() => Promise.resolve('mock-url')),
}));
vi.mock('@/utils/localImageManager', () => ({
  processAndSaveImage: vi.fn(),
}));

describe('Item Observation Component Tests', () => {
  it('renders item observation textarea in FormPainelCompleto and triggers onDataChange', () => {
    const onDataChange = vi.fn();
    const tabData = {
      descricao: 'Painel Teste',
      observacao: 'Usar zíper reforçado neste item',
    };

    render(
      <FormPainelCompleto
        tabId="tab-1"
        tabData={tabData}
        vendedores={['Vend1']}
        designers={['Des1']}
        tecidos={['Oxford']}
        onDataChange={onDataChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Instruções específicas para este item...') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value.toLowerCase()).toBe('usar zíper reforçado neste item');

    fireEvent.change(textarea, { target: { value: 'Nova observação editada' } });
    expect(onDataChange).toHaveBeenCalledWith('observacao', 'NOVA OBSERVAÇÃO EDITADA');
  });

  it('renders item observation distinctly in OrderDetails modal', () => {
    const mockOrder: OrderWithItems = {
      id: 1,
      numero: '999',
      customer_name: 'Cliente Obs',
      cliente: 'Cliente Obs',
      address: 'Rua 1',
      total_value: 100,
      status: OrderStatus.Pendente,
      observacao: 'Observação Global do Pedido',
      items: [
        {
          id: 10,
          order_id: 1,
          item_name: 'Painel Redondo',
          quantity: 1,
          unit_price: 100,
          subtotal: 100,
          vendedor: 'Vend1',
          observacao: 'Fazer abertura na direita para haste',
        },
      ],
    };

    useOrderStore.setState({ selectedOrder: mockOrder });

    render(<OrderDetails open={true} onClose={vi.fn()} />);

    // Deve exibir tanto a observação do pedido quanto a observação do item
    expect(screen.getByText('Observação Global do Pedido')).toBeInTheDocument();
    expect(screen.getByText(/Fazer abertura na direita para haste/i)).toBeInTheDocument();
    expect(screen.getByText('Observação do Item:')).toBeInTheDocument();
  });
});
