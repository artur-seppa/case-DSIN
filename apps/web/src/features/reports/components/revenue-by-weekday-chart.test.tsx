import { render, screen } from '@testing-library/react';
import { RevenueByWeekdayChart } from '@/features/reports/components/revenue-by-weekday-chart';

const DATA = [
  { weekday: 1, revenueCents: 10000 },
  { weekday: 2, revenueCents: 0 },
  { weekday: 3, revenueCents: 5000 },
  { weekday: 4, revenueCents: 0 },
  { weekday: 5, revenueCents: 0 },
  { weekday: 6, revenueCents: 20000 },
  { weekday: 7, revenueCents: 0 },
];

class ResizeObserverStub {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [{ target, contentRect: { width: 600, height: 220 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  unobserve() {}
  disconnect() {}
}

describe('RevenueByWeekdayChart', () => {
  it('renders a bar chart with a weekday label for each of the 7 entries', () => {
    const widthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(600);
    const heightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(220);
    const originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

    render(<RevenueByWeekdayChart data={DATA} />);

    expect(screen.getAllByText('SEG').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TER').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QUA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QUI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SEX').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SÁB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DOM').length).toBeGreaterThan(0);

    widthSpy.mockRestore();
    heightSpy.mockRestore();
    globalThis.ResizeObserver = originalResizeObserver;
  });
});
