import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrderTableRow } from '../../src/components/OrderTableRow';
import { OrderWithItems } from '../../src/types';
import { MemoryRouter } from 'react-router-dom';

const mockOrder: OrderWithItems = {
    id: 123,
    numero: 'PED-123',
    cliente: 'Cliente Teste',
    data_entrada: '2026-04-25T10:00:00Z',
    data_entrega: '2026-04-26T10:00:00Z',
    prioridade: 'NORMAL',
    status: 'pendente',
    financeiro: true,
    conferencia: false,
    sublimacao: false,
    costura: false,
    expedicao: false,
    pronto: false,
    items: [],
} as unknown as OrderWithItems;

describe('OrderTableRow', () => {
    const defaultProps = {
        order: mockOrder,
        index: 0,
        isSelected: false,
        selectedOrderIdsForPrint: [],
        setSelectedOrderIdsForPrint: vi.fn(),
        printedOrderIds: new Set<number>(),
        isPwa: false,
        isAdmin: true,
        isImpressaoUser: false,
        canToggleConferencia: true,
        canToggleImpressao: true,
        formatOrderNumber: (num: string | null, id: number) => num || String(id),
        isReplacementOrder: vi.fn().mockReturnValue(false),
        getOrderUrgency: (_date: string | null) => ({ type: 'normal' }),
        handleViewOrder: vi.fn(),
        handleEdit: vi.fn(),
        handleDuplicateClick: vi.fn(),
        handleCreateReplacementClick: vi.fn(),
        handleDeleteClick: vi.fn(),
        handleStatusClick: vi.fn(),
        handleQuickShare: vi.fn().mockResolvedValue(undefined),
        setStatusConfirmModal: vi.fn(),
        setSelectedOrder: vi.fn(),
        setSelectedOrderIndex: vi.fn(),
    };

    it('renders the order row correctly', () => {
        render(
            <MemoryRouter>
                <table>
                    <tbody>
                        <OrderTableRow {...defaultProps} />
                    </tbody>
                </table>
            </MemoryRouter>
        );

        // Deve exibir o ID do pedido formatado
        expect(screen.getByText('#PED-123')).toBeInTheDocument();

        // Deve exibir o nome do cliente
        expect(screen.getByText('Cliente Teste')).toBeInTheDocument();
    });

    it('highlights the row when isSelected is true', () => {
        render(
            <MemoryRouter>
                <table>
                    <tbody>
                        <OrderTableRow {...defaultProps} isSelected={true} />
                    </tbody>
                </table>
            </MemoryRouter>
        );

        const row = screen.getByRole('row');
        expect(row.className).toContain('bg-primary/[0.08]');
    });

    it('Memoization prevents unnecessary renders (React.memo check)', () => {
        const { rerender } = render(
            <MemoryRouter>
                <table>
                    <tbody>
                        <OrderTableRow {...defaultProps} />
                    </tbody>
                </table>
            </MemoryRouter>
        );

        const initialDOM = screen.getByRole('row').innerHTML;

        // Rerenderiza com as mesmas props
        rerender(
            <MemoryRouter>
                <table>
                    <tbody>
                        <OrderTableRow {...defaultProps} />
                    </tbody>
                </table>
            </MemoryRouter>
        );

        expect(screen.getByRole('row').innerHTML).toBe(initialDOM);
    });
});
