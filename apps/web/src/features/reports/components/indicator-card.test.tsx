import { render, screen } from '@testing-library/react';
import { IndicatorCard } from '@/features/reports/components/indicator-card';

describe('IndicatorCard', () => {
  it('shows the label, value, and a positive variance in the improvement color when higher is better', () => {
    render(<IndicatorCard label="Faturamento" value="R$ 100,00" current={100} previous={80} invert={false} />);

    expect(screen.getByText('Faturamento')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    const variance = screen.getByText('+25%');
    expect(variance).toHaveClass('text-success-700');
  });

  it('shows a drop in the worsening color when higher is better', () => {
    render(<IndicatorCard label="Faturamento" value="R$ 80,00" current={80} previous={100} invert={false} />);

    expect(screen.getByText('-20%')).toHaveClass('text-error-700');
  });

  it('inverts the color when lower is better (e.g. cancellation rate)', () => {
    render(<IndicatorCard label="Cancelamento" value="10%" current={0.1} previous={0.2} invert />);

    expect(screen.getByText('-50%')).toHaveClass('text-success-700');
  });

  it('shows no variance when there is no previous-period baseline', () => {
    render(<IndicatorCard label="Faturamento" value="R$ 0,00" current={0} previous={0} invert={false} />);

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
