import { formatCents } from '@/shared/utils/money';

describe('formatCents', () => {
  it('formats whole reais', () => {
    expect(formatCents(8000)).toBe('R$ 80,00');
  });

  it('formats cents that are not a whole real', () => {
    expect(formatCents(8050)).toBe('R$ 80,50');
  });

  it('formats zero', () => {
    expect(formatCents(0)).toBe('R$ 0,00');
  });
});
