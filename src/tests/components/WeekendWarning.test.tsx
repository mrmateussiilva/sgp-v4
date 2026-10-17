import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { WeekendWarningBanner } from '@/components/WeekendWarningBanner';
import { WeekendConfirmationModal } from '@/components/modals/WeekendConfirmationModal';

describe('WeekendWarningBanner Component', () => {
  it('does not render for a weekday (e.g., Friday)', () => {
    const handleApply = vi.fn();
    render(
      <WeekendWarningBanner dateValue="2026-10-16" onApplyNextBusinessDay={handleApply} />
    );
    expect(screen.queryByText(/Atenção: A data selecionada é um/i)).not.toBeInTheDocument();
  });

  it('renders alert and next business day button for Saturday', () => {
    const handleApply = vi.fn();
    render(
      <WeekendWarningBanner dateValue="2026-10-17" onApplyNextBusinessDay={handleApply} />
    );

    expect(screen.getByText(/Atenção: A data selecionada é um/i)).toBeInTheDocument();
    expect(screen.getByText('Sábado')).toBeInTheDocument();

    const changeButton = screen.getByRole('button', { name: /Mudar para Segunda/i });
    expect(changeButton).toBeInTheDocument();

    fireEvent.click(changeButton);
    expect(handleApply).toHaveBeenCalledWith('2026-10-19');
  });

  it('renders alert and next business day button for Sunday', () => {
    const handleApply = vi.fn();
    render(
      <WeekendWarningBanner dateValue="2026-10-18" onApplyNextBusinessDay={handleApply} />
    );

    expect(screen.getByText('Domingo')).toBeInTheDocument();
    const changeButton = screen.getByRole('button', { name: /Mudar para Segunda/i });
    fireEvent.click(changeButton);
    expect(handleApply).toHaveBeenCalledWith('2026-10-19');
  });
});

describe('WeekendConfirmationModal Component', () => {
  it('renders modal with options when opened for a weekend date', () => {
    const handleOpenChange = vi.fn();
    const handleConfirmCurrent = vi.fn();
    const handleConfirmNext = vi.fn();

    render(
      <WeekendConfirmationModal
        open={true}
        onOpenChange={handleOpenChange}
        dateValue="2026-10-17"
        onConfirmCurrentDate={handleConfirmCurrent}
        onConfirmNextBusinessDay={handleConfirmNext}
      />
    );

    expect(screen.getByRole('heading', { name: 'Data de Entrega no Final de Semana' })).toBeInTheDocument();
    expect(screen.getByText(/17\/10\/2026/)).toBeInTheDocument();

    // Test switch to Monday button
    const mondayButton = screen.getByRole('button', { name: /Mudar para Segunda/i });
    fireEvent.click(mondayButton);
    expect(handleConfirmNext).toHaveBeenCalledWith('2026-10-19');
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('allows keeping the weekend date as exception', () => {
    const handleOpenChange = vi.fn();
    const handleConfirmCurrent = vi.fn();
    const handleConfirmNext = vi.fn();

    render(
      <WeekendConfirmationModal
        open={true}
        onOpenChange={handleOpenChange}
        dateValue="2026-10-18"
        onConfirmCurrentDate={handleConfirmCurrent}
        onConfirmNextBusinessDay={handleConfirmNext}
      />
    );

    expect(screen.getByText(/18\/10\/2026/)).toBeInTheDocument();
    const exceptionButton = screen.getByRole('button', { name: /Manter Fim de Semana/i });
    fireEvent.click(exceptionButton);
    expect(handleConfirmCurrent).toHaveBeenCalled();
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
