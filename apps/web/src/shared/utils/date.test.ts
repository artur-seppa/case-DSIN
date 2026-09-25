import {
  shiftToSalonTime,
  formatSalonTime,
  formatSalonDate,
  formatSalonWeekday,
  toDateParam,
  toSalonDateParam,
} from '@/shared/utils/date';

const SAO_PAULO_OFFSET_MINUTES = -180;

describe('shiftToSalonTime', () => {
  it('shifts a UTC instant by the salon offset', () => {
    const shifted = shiftToSalonTime('2026-10-01T18:00:00Z', SAO_PAULO_OFFSET_MINUTES);
    expect(shifted.toISOString()).toBe('2026-10-01T15:00:00.000Z');
  });
});

describe('formatSalonTime', () => {
  it('formats the salon-local time as HH:mm', () => {
    expect(formatSalonTime('2026-10-01T18:00:00Z', SAO_PAULO_OFFSET_MINUTES)).toBe('15:00');
  });

  it('rolls over the day correctly near midnight', () => {
    expect(formatSalonTime('2026-10-02T02:30:00Z', SAO_PAULO_OFFSET_MINUTES)).toBe('23:30');
  });
});

describe('formatSalonDate', () => {
  it('formats the salon-local date as dd/MM', () => {
    expect(formatSalonDate('2026-10-01T18:00:00Z', SAO_PAULO_OFFSET_MINUTES)).toBe('01/10');
  });
});

describe('formatSalonWeekday', () => {
  it('formats a short uppercase weekday abbreviation', () => {
    expect(formatSalonWeekday('2026-10-01T18:00:00Z', SAO_PAULO_OFFSET_MINUTES)).toBe('QUI');
  });
});

describe('toDateParam', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toDateParam(new Date(2026, 9, 1))).toBe('2026-10-01');
  });

  it('pads single-digit months and days', () => {
    expect(toDateParam(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('toSalonDateParam', () => {
  it('formats the salon-local date of an instant as YYYY-MM-DD', () => {
    expect(toSalonDateParam('2026-10-01T18:00:00Z', SAO_PAULO_OFFSET_MINUTES)).toBe('2026-10-01');
  });

  it('rolls over to the salon-local previous day near UTC midnight', () => {
    expect(toSalonDateParam('2026-10-02T02:30:00Z', SAO_PAULO_OFFSET_MINUTES)).toBe('2026-10-01');
  });
});
