import { weekBoundsContaining } from './week-bounds.js';

const UTC_OFFSET_MINUTES = -180;

describe('weekBoundsContaining', () => {
  it('returns the Monday-Sunday week when given a Monday', () => {
    const bounds = weekBoundsContaining('2026-09-28', UTC_OFFSET_MINUTES);

    expect(bounds.weekStartKey).toBe('2026-09-28');
    expect(bounds.weekEndKey).toBe('2026-10-04');
  });

  it('snaps to the containing Monday when given a mid-week date', () => {
    const bounds = weekBoundsContaining('2026-09-30', UTC_OFFSET_MINUTES);

    expect(bounds.weekStartKey).toBe('2026-09-28');
    expect(bounds.weekEndKey).toBe('2026-10-04');
  });

  it('snaps to the containing Monday when given a Sunday', () => {
    const bounds = weekBoundsContaining('2026-10-04', UTC_OFFSET_MINUTES);

    expect(bounds.weekStartKey).toBe('2026-09-28');
    expect(bounds.weekEndKey).toBe('2026-10-04');
  });

  it('computes salon-local UTC instant bounds for the current and previous week', () => {
    const bounds = weekBoundsContaining('2026-09-28', UTC_OFFSET_MINUTES);

    expect(bounds.currentWeekStartUtc.toISOString()).toBe('2026-09-28T03:00:00.000Z');
    expect(bounds.currentWeekEndUtc.toISOString()).toBe('2026-10-05T03:00:00.000Z');
    expect(bounds.previousWeekStartUtc.toISOString()).toBe('2026-09-21T03:00:00.000Z');
  });
});
