import { evaluateChain } from './availability-calculator.js';

const UTC_OFFSET_MINUTES = -180;
const PROF_A = 'PROF-A';
const THURSDAY = '2026-10-01';
const now = new Date('2026-09-01T12:00:00Z');

describe('evaluateChain', () => {
  it('resolves the placement of every item when the chain fits', () => {
    const result = evaluateChain(
      {
        date: THURSDAY,
        items: [{ professionalId: PROF_A, durationMinutes: 60 }],
        workingHours: [{ professionalId: PROF_A, weekday: 4, startTime: '09:00', endTime: '18:00' }],
        busyIntervals: [],
        now,
        utcOffsetMinutes: UTC_OFFSET_MINUTES,
      },
      12 * 60,
    );

    expect(result.issue).toBeNull();
    if (result.issue === null) {
      expect(result.placements).toEqual([
        {
          professionalId: PROF_A,
          startsAt: new Date('2026-10-01T15:00:00Z'),
          endsAt: new Date('2026-10-01T16:00:00Z'),
        },
      ]);
    }
  });

  it('reports OUTSIDE_WORKING_HOURS when the item does not fit any window', () => {
    const result = evaluateChain(
      {
        date: THURSDAY,
        items: [{ professionalId: PROF_A, durationMinutes: 60 }],
        workingHours: [{ professionalId: PROF_A, weekday: 4, startTime: '09:00', endTime: '10:00' }],
        busyIntervals: [],
        now,
        utcOffsetMinutes: UTC_OFFSET_MINUTES,
      },
      11 * 60,
    );

    expect(result.issue).toBe('OUTSIDE_WORKING_HOURS');
  });

  it('reports LEAD_TIME_TOO_SHORT when the order would start too soon', () => {
    const closeNow = new Date('2026-10-01T14:30:00Z');
    const result = evaluateChain(
      {
        date: THURSDAY,
        items: [{ professionalId: PROF_A, durationMinutes: 60 }],
        workingHours: [{ professionalId: PROF_A, weekday: 4, startTime: '09:00', endTime: '18:00' }],
        busyIntervals: [],
        now: closeNow,
        utcOffsetMinutes: UTC_OFFSET_MINUTES,
        minLeadMinutes: 120,
      },
      12 * 60,
    );

    expect(result.issue).toBe('LEAD_TIME_TOO_SHORT');
  });

  it('reports SLOT_TAKEN when the professional is already busy', () => {
    const result = evaluateChain(
      {
        date: THURSDAY,
        items: [{ professionalId: PROF_A, durationMinutes: 60 }],
        workingHours: [{ professionalId: PROF_A, weekday: 4, startTime: '09:00', endTime: '18:00' }],
        busyIntervals: [
          {
            professionalId: PROF_A,
            startsAt: new Date('2026-10-01T15:30:00Z'),
            endsAt: new Date('2026-10-01T16:00:00Z'),
          },
        ],
        now,
        utcOffsetMinutes: UTC_OFFSET_MINUTES,
      },
      12 * 60,
    );

    expect(result.issue).toBe('SLOT_TAKEN');
  });

  it('reports DATE_OUT_OF_RANGE for a date beyond the maximum days ahead', () => {
    const result = evaluateChain(
      {
        date: '2026-12-31',
        items: [{ professionalId: PROF_A, durationMinutes: 60 }],
        workingHours: [{ professionalId: PROF_A, weekday: 4, startTime: '00:00', endTime: '23:30' }],
        busyIntervals: [],
        now,
        utcOffsetMinutes: UTC_OFFSET_MINUTES,
        maxDaysAhead: 60,
      },
      9 * 60,
    );

    expect(result.issue).toBe('DATE_OUT_OF_RANGE');
  });
});
