import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { SameDayWarningBanner } from '@/components/SameDayWarningBanner';
import { SameDayConfirmationModal } from '@/components/modals/SameDayConfirmationModal';
import { getSameDayDetails } from '@/utils/date';

describe('getSameDayDetails Utility', () => {
  it('detects same day delivery correctly for today', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const result = getSameDayDetails(today, today);
    expect(result.isSameDay).toBe(true);
    expect(result.nextDate).toBeDefined();
    expect(result.nextDateDisplay).toBeDefined();
  });

  it('detects non-same day delivery correctly', () => {
    const now = new Date();
    const future = `${now.getFullYear() + 1}-05-20`;
    const result = getSameDayDetails(future);
    expect(result.isSameDay).toBe(false);
  });
});

describe('SameDayWarningBanner Component', () => {
  it('does not render when delivery date is in the future', () => {
    const handleApply = vi.fn();
    render(
      <SameDayWarningBanner
        dataEntrega="2099-01-01"
        formaEnvio="Transportadora"
        onApplyNextDate={handleApply}
      />
    );
    expect(screen.queryByText(/Atenção: Entrega agendada para/i)).not.toBeInTheDocument();
  });

  it('renders alert and next day button when delivery date is today', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const handleApply = vi.fn();

    render(
      <SameDayWarningBanner
        dataEntrega={today}
        dataEntrada={today}
        formaEnvio="Transportadora"
        onApplyNextDate={handleApply}
      />
    );

    expect(screen.getByText(/Atenção: Entrega agendada para/i)).toBeInTheDocument();
    expect(screen.getByText(/Transportadora/i)).toBeInTheDocument();

    const changeButton = screen.getByRole('button', { name: /Mudar para/i });
    expect(changeButton).toBeInTheDocument();

    fireEvent.click(changeButton);
    expect(handleApply).toHaveBeenCalled();
  });
});

describe('SameDayConfirmationModal Component', () => {
  it('keeps "Confirmar para Hoje" disabled until checkbox is checked', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const handleOpenChange = vi.fn();
    const handleConfirmSameDay = vi.fn();
    const handleConfirmNextDate = vi.fn();

    render(
      <SameDayConfirmationModal
        open={true}
        onOpenChange={handleOpenChange}
        dataEntrega={today}
        formaEnvio="Sedex"
        clienteNome="Acme Corp"
        onConfirmSameDay={handleConfirmSameDay}
        onConfirmNextDate={handleConfirmNextDate}
      />
    );

    expect(screen.getByText(/Confirmação: Pedido para o Mesmo Dia/i)).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument();
    expect(screen.getByText(/Sedex/i)).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /Confirmar para Hoje/i });
    expect(confirmButton).toBeDisabled();

    // Check the authorization checkbox
    const checkbox = screen.getByRole('checkbox', { name: /Confirmo que consultei a administração/i });
    fireEvent.click(checkbox);

    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);
    expect(handleConfirmSameDay).toHaveBeenCalled();
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('allows switching to next day and saving directly', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const handleOpenChange = vi.fn();
    const handleConfirmSameDay = vi.fn();
    const handleConfirmNextDate = vi.fn();

    render(
      <SameDayConfirmationModal
        open={true}
        onOpenChange={handleOpenChange}
        dataEntrega={today}
        formaEnvio="Transportadora"
        clienteNome="Beta Corp"
        onConfirmSameDay={handleConfirmSameDay}
        onConfirmNextDate={handleConfirmNextDate}
      />
    );

    const switchButton = screen.getByRole('button', { name: /Mudar para .* e Salvar/i });
    fireEvent.click(switchButton);

    expect(handleConfirmNextDate).toHaveBeenCalled();
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
