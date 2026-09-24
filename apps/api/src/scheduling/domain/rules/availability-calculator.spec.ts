import {
  calculateAvailability,
  type BusyInterval,
  type WorkingWindow,
} from './availability-calculator.js';

const UTC_OFFSET_MINUTES = -180;
const PROF_A = 'PROF-A';
const PROF_B = 'PROF-B';

const THURSDAY = '2026-10-01';
const now = new Date('2026-09-01T12:00:00Z');

function windows(...ws: Partial<WorkingWindow>[]): WorkingWindow[] {
  return ws.map((w) => ({
    professionalId: PROF_A,
    weekday: 4,
    startTime: '09:00',
    endTime: '18:00',
    ...w,
  }));
}

function isoTimes(starts: Date[]): string[] {
  return starts.map((d) => d.toISOString());
}

describe('calculateAvailability', () => {
  it('offers every 30-minute slot that fits inside the working window', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 60 }],
      workingHours: windows({ startTime: '09:00', endTime: '10:00' }),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(isoTimes(starts)).toEqual(['2026-10-01T12:00:00.000Z']);
  });

  it('rejects a start that would make the item end after the window closes', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 90 }],
      workingHours: windows({ startTime: '09:00', endTime: '10:00' }),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(starts).toEqual([]);
  });

  it('accepts a slot that only touches the edges of the window', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 60 }],
      workingHours: windows({ startTime: '09:30', endTime: '10:30' }),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(isoTimes(starts)).toEqual(['2026-10-01T12:30:00.000Z']);
  });

  it('rejects a service that would cross a lunch gap between two windows', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 90 }],
      workingHours: windows(
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '13:00', endTime: '18:00' },
      ),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    // 11:00 -> would end at 12:30, crossing the gap; every other start
    // before 11:00 keeps the item entirely inside the morning window.
    expect(isoTimes(starts)).not.toContain('2026-10-01T14:00:00.000Z');
    expect(starts.length).toBeGreaterThan(0);
  });

  it('chains items back to back using each item duration, in order', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [
        { professionalId: PROF_A, durationMinutes: 60 },
        { professionalId: PROF_A, durationMinutes: 30 },
      ],
      workingHours: windows({ startTime: '09:00', endTime: '10:30' }),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(isoTimes(starts)).toEqual(['2026-10-01T12:00:00.000Z']);
  });

  it('lets chained items use different professionals, each checked against their own schedule', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [
        { professionalId: PROF_A, durationMinutes: 30 },
        { professionalId: PROF_B, durationMinutes: 30 },
      ],
      workingHours: [
        ...windows({ startTime: '09:00', endTime: '10:00' }),
        {
          professionalId: PROF_B,
          weekday: 4,
          startTime: '09:30',
          endTime: '10:00',
        },
      ],
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(isoTimes(starts)).toEqual(['2026-10-01T12:00:00.000Z']);
  });

  it('rejects a slot that collides with an existing busy interval of the same professional', () => {
    const busyIntervals: BusyInterval[] = [
      {
        professionalId: PROF_A,
        startsAt: new Date('2026-10-01T12:30:00Z'),
        endsAt: new Date('2026-10-01T13:00:00Z'),
      },
    ];
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 60 }],
      workingHours: windows({ startTime: '09:00', endTime: '11:00' }),
      busyIntervals,
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(isoTimes(starts)).not.toContain('2026-10-01T12:00:00.000Z');
    expect(isoTimes(starts)).not.toContain('2026-10-01T12:30:00.000Z');
    expect(isoTimes(starts)).toContain('2026-10-01T13:00:00.000Z');
  });

  it('a busy interval that only touches the candidate slot does not block it', () => {
    const busyIntervals: BusyInterval[] = [
      {
        professionalId: PROF_A,
        startsAt: new Date('2026-10-01T13:00:00Z'),
        endsAt: new Date('2026-10-01T14:00:00Z'),
      },
    ];
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 60 }],
      workingHours: windows({ startTime: '09:00', endTime: '11:00' }),
      busyIntervals,
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(isoTimes(starts)).toContain('2026-10-01T12:00:00.000Z');
  });

  it('ignores a busy interval that belongs to a different professional', () => {
    const busyIntervals: BusyInterval[] = [
      {
        professionalId: PROF_B,
        startsAt: new Date('2026-10-01T12:00:00Z'),
        endsAt: new Date('2026-10-01T13:00:00Z'),
      },
    ];
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 60 }],
      workingHours: windows({ startTime: '09:00', endTime: '10:00' }),
      busyIntervals,
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(isoTimes(starts)).toEqual(['2026-10-01T12:00:00.000Z']);
  });

  it('excludes starts earlier than now plus the minimum lead time', () => {
    const closeNow = new Date('2026-10-01T11:00:00Z');
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 30 }],
      workingHours: windows({ startTime: '09:00', endTime: '18:00' }),
      busyIntervals: [],
      now: closeNow,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
      minLeadMinutes: 120,
    });

    expect(isoTimes(starts)).not.toContain('2026-10-01T12:30:00.000Z');
    expect(isoTimes(starts)).toContain('2026-10-01T13:00:00.000Z');
  });

  it('includes a start exactly at the lead-time deadline', () => {
    const closeNow = new Date('2026-10-01T11:00:00Z');
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 30 }],
      workingHours: windows({ startTime: '09:00', endTime: '18:00' }),
      busyIntervals: [],
      now: closeNow,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
      minLeadMinutes: 120,
    });

    expect(isoTimes(starts)).toContain('2026-10-01T13:00:00.000Z');
  });

  it('offers nothing for a date beyond the maximum days ahead', () => {
    const starts = calculateAvailability({
      date: '2026-12-31',
      items: [{ professionalId: PROF_A, durationMinutes: 30 }],
      workingHours: [
        {
          professionalId: PROF_A,
          weekday: 4,
          startTime: '00:00',
          endTime: '23:30',
        },
      ],
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
      maxDaysAhead: 60,
    });

    expect(starts).toEqual([]);
  });

  it('still offers slots exactly at the maximum days ahead', () => {
    const today = new Date('2026-10-01T12:00:00Z');
    const sixtyDaysAhead = '2026-11-30';
    const starts = calculateAvailability({
      date: sixtyDaysAhead,
      items: [{ professionalId: PROF_A, durationMinutes: 30 }],
      workingHours: [
        {
          professionalId: PROF_A,
          weekday: 1,
          startTime: '09:00',
          endTime: '10:00',
        },
      ],
      busyIntervals: [],
      now: today,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
      maxDaysAhead: 60,
    });

    expect(starts.length).toBeGreaterThan(0);
  });

  it('offers nothing for a date in the past', () => {
    const starts = calculateAvailability({
      date: '2026-08-01',
      items: [{ professionalId: PROF_A, durationMinutes: 30 }],
      workingHours: [
        {
          professionalId: PROF_A,
          weekday: 6,
          startTime: '00:00',
          endTime: '23:30',
        },
      ],
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(starts).toEqual([]);
  });

  it('offers nothing when the professional has no working hours on that weekday', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 30 }],
      workingHours: windows({ weekday: 5 }),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(starts).toEqual([]);
  });

  it('resolves the correct local weekday for the given date', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 30 }],
      workingHours: windows({
        weekday: 4,
        startTime: '09:00',
        endTime: '09:30',
      }),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(starts.length).toBe(1);
  });

  it('returns nothing for an empty item list', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [],
      workingHours: windows(),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
    });

    expect(starts).toEqual([]);
  });

  it('only returns starts on the slot grid', () => {
    const starts = calculateAvailability({
      date: THURSDAY,
      items: [{ professionalId: PROF_A, durationMinutes: 30 }],
      workingHours: windows({ startTime: '09:00', endTime: '10:00' }),
      busyIntervals: [],
      now,
      utcOffsetMinutes: UTC_OFFSET_MINUTES,
      slotMinutes: 30,
    });

    for (const start of starts) {
      expect(start.getUTCMinutes() % 30).toBe(0);
    }
  });
});
