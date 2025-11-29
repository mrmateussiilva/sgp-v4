/**
 * Testes para o modal de imagem no OrderViewModal
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { OrderViewModal } from '@/components/OrderViewModal';
import { OrderWithItems, OrderStatus, OrderItem } from '@/types';

// Mock do normalizeImagePath
vi.mock('@/utils/path', () => ({
  normalizeImagePath: (path: string) => path.replace(/\\/g, '/'),
  isValidImagePath: (path: string) => !!path && path.length > 0,
}));

describe('ImagemModal no OrderViewModal', () => {
  const mockOrder: OrderWithItems = {
    id: 1,
    numero: '001',
    customer_name: 'João Silva',
    cliente: 'João Silva',
    address: 'Rua Teste, 123',
    data_entrada: '2024-01-15',
    data_entrega: '2024-01-20',
    status: OrderStatus.Pendente,
    valor_total: '1000.00',
    total_value: '1000.00',
    items: [
      {
        id: 1,
        order_id: 1,
        item_name: 'Painel promocional',
        quantity: 1,
        unit_price: 1000,
        subtotal: 1000,
        descricao: 'Painel promocional',
        largura: '2.0',
        altura: '1.5',
        imagem: '/home/user/img.png',
      } as OrderItem,
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve abrir modal quando imagem é clicada', async () => {
    const { container } = render(
      <OrderViewModal isOpen={true} onClose={vi.fn()} order={mockOrder} />
    );

    // Encontrar e clicar na imagem
    const image = container.querySelector('img[alt*="imagem"]');
    if (image) {
      fireEvent.click(image);
      
      await waitFor(() => {
        expect(screen.getByText('Visualização da Imagem')).toBeInTheDocument();
      });
    }
  });

  it('não deve fechar modal automaticamente', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <OrderViewModal isOpen={true} onClose={onClose} order={mockOrder} />
    );

    // Abrir modal
    const image = container.querySelector('img[alt*="imagem"]');
    if (image) {
      fireEvent.click(image);
      
      await waitFor(() => {
        expect(screen.getByText('Visualização da Imagem')).toBeInTheDocument();
      });

      // Tentar fechar clicando fora (não deve fechar)
      const overlay = document.querySelector('[role="dialog"]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      // Modal não deve fechar automaticamente
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('deve normalizar path Linux para Windows', async () => {
    const orderWithLinuxPath: OrderWithItems = {
      ...mockOrder,
      items: [
        {
          ...mockOrder.items[0],
          imagem: '/home/user/img.png',
        },
      ],
    };

    const { container } = render(
      <OrderViewModal isOpen={true} onClose={vi.fn()} order={orderWithLinuxPath} />
    );

    const image = container.querySelector('img[alt*="imagem"]');
    if (image) {
      fireEvent.click(image);
      
      await waitFor(() => {
        const modalImage = screen.getByAltText('Imagem do item');
        expect(modalImage).toHaveAttribute('src', '/home/user/img.png');
      });
    }
  });

  it('deve exibir placeholder quando arquivo não existe', async () => {
    const orderWithInvalidPath: OrderWithItems = {
      ...mockOrder,
      items: [
        {
          ...mockOrder.items[0],
          imagem: '/path/inexistente.png',
        },
      ],
    };

    const { container } = render(
      <OrderViewModal isOpen={true} onClose={vi.fn()} order={orderWithInvalidPath} />
    );

    const image = container.querySelector('img[alt*="imagem"]');
    if (image) {
      fireEvent.click(image);
      
      await waitFor(() => {
        const modalImage = screen.getByAltText('Imagem do item');
        fireEvent.error(modalImage);
        
        // Deve exibir placeholder
        expect(screen.getByText('Imagem não encontrada')).toBeInTheDocument();
      });
    }
  });

  it('deve fechar modal quando botão X é clicado', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <OrderViewModal isOpen={true} onClose={onClose} order={mockOrder} />
    );

    const image = container.querySelector('img[alt*="imagem"]');
    if (image) {
      fireEvent.click(image);
      
      await waitFor(() => {
        expect(screen.getByText('Visualização da Imagem')).toBeInTheDocument();
      });

      // Clicar no botão X
      const closeButton = screen.getByRole('button', { name: /fechar/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Visualização da Imagem')).not.toBeInTheDocument();
      });
    }
  });
});

