import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeSlotPicker } from '@/features/appointments/components/time-slot-picker';

describe('TimeSlotPicker', () => {
  it('shows a loading message while loading', () => {
    render(
      <TimeSlotPicker starts={[]} utcOffsetMinutes={-180} selectedStart={null} onSelect={vi.fn()} isLoading />,
    );

    expect(screen.getByText('Carregando horários…')).toBeInTheDocument();
  });

  it('shows a message when there are no available slots', () => {
    render(
      <TimeSlotPicker
        starts={[]}
        utcOffsetMinutes={-180}
        selectedStart={null}
        onSelect={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Nenhum horário disponível nesta data')).toBeInTheDocument();
  });

  it('renders each slot formatted in salon local time, and marks the selected one', () => {
    render(
      <TimeSlotPicker
        starts={['2026-10-01T18:00:00Z', '2026-10-01T18:30:00Z']}
        utcOffsetMinutes={-180}
        selectedStart="2026-10-01T18:00:00Z"
        onSelect={vi.fn()}
        isLoading={false}
      />,
    );

    const selected = screen.getByRole('button', { name: '15:00' });
    const unselected = screen.getByRole('button', { name: '15:30' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(unselected).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with the slot ISO string when clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <TimeSlotPicker
        starts={['2026-10-01T18:00:00Z']}
        utcOffsetMinutes={-180}
        selectedStart={null}
        onSelect={onSelect}
        isLoading={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: '15:00' }));

    expect(onSelect).toHaveBeenCalledWith('2026-10-01T18:00:00Z');
  });
});
