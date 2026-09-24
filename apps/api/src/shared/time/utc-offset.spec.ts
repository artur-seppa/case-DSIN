import {
  localDate,
  localDateKey,
  localDaysBetween,
  localTime,
  zonedPartsOf,
  zonedTimeToInstant,
} from './utc-offset.js';

const GMT_MINUS_3 = -3 * 60;

describe('zonedPartsOf', () => {
  it('converts a UTC instant to local wall-clock parts for a negative offset', () => {
    const parts = zonedPartsOf(new Date('2026-10-01T15:30:00Z'), GMT_MINUS_3);

    expect(parts).toEqual({ year: 2026, month: 10, day: 1, hour: 12, minute: 30, weekday: 4 });
  });

  it('rolls the calendar day back when the local time crosses midnight', () => {
    const parts = zonedPartsOf(new Date('2026-10-01T02:00:00Z'), GMT_MINUS_3);

    expect(parts).toEqual({ year: 2026, month: 9, day: 30, hour: 23, minute: 0, weekday: 3 });
  });

  it('reports Sunday as weekday 7, not 0', () => {
    const parts = zonedPartsOf(new Date('2026-10-04T15:00:00Z'), GMT_MINUS_3);

    expect(parts.weekday).toBe(7);
  });

  it('works for a positive offset too', () => {
    const parts = zonedPartsOf(new Date('2026-10-01T22:00:00Z'), 60);

    expect(parts).toEqual({ year: 2026, month: 10, day: 1, hour: 23, minute: 0, weekday: 4 });
  });
});

describe('zonedTimeToInstant', () => {
  it('converts local wall-clock parts back to the UTC instant', () => {
    const instant = zonedTimeToInstant(
      { year: 2026, month: 10, day: 1, hour: 12, minute: 30 },
      GMT_MINUS_3,
    );

    expect(instant).toEqual(new Date('2026-10-01T15:30:00Z'));
  });

  it('round-trips through zonedPartsOf for an arbitrary instant', () => {
    const original = new Date('2026-07-15T14:37:00Z');

    const roundTripped = zonedTimeToInstant(zonedPartsOf(original, GMT_MINUS_3), GMT_MINUS_3);

    expect(roundTripped).toEqual(original);
  });
});

describe('localDate / localTime / localDateKey', () => {
  it('parses an ISO date into year/month/day', () => {
    expect(localDate('2026-10-01')).toEqual({ year: 2026, month: 10, day: 1 });
  });

  it('parses an HH:MM string into hour/minute', () => {
    expect(localTime('09:30')).toEqual({ hour: 9, minute: 30 });
  });

  it('formats year/month/day back into an ISO date, zero-padded', () => {
    expect(localDateKey({ year: 2026, month: 1, day: 5 })).toBe('2026-01-05');
  });
});

describe('localDaysBetween', () => {
  it('counts whole calendar days between two local dates', () => {
    expect(
      localDaysBetween({ year: 2026, month: 9, day: 30 }, { year: 2026, month: 10, day: 3 }),
    ).toBe(3);
  });

  it('returns 0 for the same date', () => {
    expect(
      localDaysBetween({ year: 2026, month: 10, day: 1 }, { year: 2026, month: 10, day: 1 }),
    ).toBe(0);
  });

  it('returns a negative number when "to" is before "from"', () => {
    expect(
      localDaysBetween({ year: 2026, month: 10, day: 3 }, { year: 2026, month: 9, day: 30 }),
    ).toBe(-3);
  });
});
