import {
  localDate,
  localDaysBetween,
  localTime,
  weekdayOfLocalDate,
  zonedPartsOf,
  zonedTimeToInstant,
} from '../../../shared/time/utc-offset.js';

export interface AvailabilityItem {
  professionalId: string;
  durationMinutes: number;
}

export interface WorkingWindow {
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface BusyInterval {
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilityRequest {
  date: string;
  items: AvailabilityItem[];
  workingHours: WorkingWindow[];
  busyIntervals: BusyInterval[];
  now: Date;
  utcOffsetMinutes: number;
  slotMinutes?: number;
  minLeadMinutes?: number;
  maxDaysAhead?: number;
}

export type ChainIssue =
  | 'DATE_OUT_OF_RANGE'
  | 'OUTSIDE_WORKING_HOURS'
  | 'LEAD_TIME_TOO_SHORT'
  | 'SLOT_TAKEN';

export interface ChainPlacement {
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
}

const DAY_MINUTES = 24 * 60;

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function fitsInAWorkingWindow(
  windows: WorkingWindow[],
  weekday: number,
  professionalId: string,
  startMinute: number,
  endMinute: number,
): boolean {
  return windows.some((window) => {
    if (window.professionalId !== professionalId || window.weekday !== weekday) {
      return false;
    }
    const { hour: startHour, minute: startMinuteOfWindow } = localTime(window.startTime);
    const { hour: endHour, minute: endMinuteOfWindow } = localTime(window.endTime);
    const windowStart = minutesOfDay(startHour, startMinuteOfWindow);
    const windowEnd = minutesOfDay(endHour, endMinuteOfWindow);
    return startMinute >= windowStart && endMinute <= windowEnd;
  });
}

function collidesWithBusyInterval(
  busyIntervals: BusyInterval[],
  professionalId: string,
  startsAt: Date,
  endsAt: Date,
): boolean {
  return busyIntervals.some(
    (busy) =>
      busy.professionalId === professionalId &&
      overlaps(startsAt.getTime(), endsAt.getTime(), busy.startsAt.getTime(), busy.endsAt.getTime()),
  );
}

function minutesToHourMinute(totalMinutes: number): { hour: number; minute: number } {
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
}

export function evaluateChain(
  request: AvailabilityRequest,
  startMinuteOfDay: number,
): { issue: ChainIssue } | { issue: null; placements: ChainPlacement[] } {
  const minLeadMinutes = request.minLeadMinutes ?? 120;
  const maxDaysAhead = request.maxDaysAhead ?? 60;

  const date = localDate(request.date);
  const today = zonedPartsOf(request.now, request.utcOffsetMinutes);
  const daysAhead = localDaysBetween(today, date);
  if (daysAhead < 0 || daysAhead > maxDaysAhead) {
    return { issue: 'DATE_OUT_OF_RANGE' };
  }

  const weekday = weekdayOfLocalDate(date);
  const leadDeadline = request.now.getTime() + minLeadMinutes * 60_000;
  const placements: ChainPlacement[] = [];
  let cursor = startMinuteOfDay;

  for (const [index, item] of request.items.entries()) {
    const itemStartMinute = cursor;
    const itemEndMinute = cursor + item.durationMinutes;

    if (
      itemEndMinute > DAY_MINUTES ||
      !fitsInAWorkingWindow(request.workingHours, weekday, item.professionalId, itemStartMinute, itemEndMinute)
    ) {
      return { issue: 'OUTSIDE_WORKING_HOURS' };
    }

    // Local minute-of-day -> UTC instant, to compare with stored busy intervals.
    const startsAt = zonedTimeToInstant(
      { ...date, ...minutesToHourMinute(itemStartMinute) },
      request.utcOffsetMinutes,
    );
    const endsAt = zonedTimeToInstant(
      { ...date, ...minutesToHourMinute(itemEndMinute) },
      request.utcOffsetMinutes,
    );

    if (index === 0 && startsAt.getTime() < leadDeadline) {
      return { issue: 'LEAD_TIME_TOO_SHORT' };
    }
    if (collidesWithBusyInterval(request.busyIntervals, item.professionalId, startsAt, endsAt)) {
      return { issue: 'SLOT_TAKEN' };
    }

    placements.push({ professionalId: item.professionalId, startsAt, endsAt });
    cursor = itemEndMinute;
  }

  return { issue: null, placements };
}

export function calculateAvailability(request: AvailabilityRequest): Date[] {
  if (request.items.length === 0) {
    return [];
  }
  const slotMinutes = request.slotMinutes ?? 30;
  const starts: Date[] = [];

  for (let candidateStartMinute = 0; candidateStartMinute < DAY_MINUTES; candidateStartMinute += slotMinutes) {
    const result = evaluateChain(request, candidateStartMinute);
    if (result.issue === null) {
      starts.push(result.placements[0]!.startsAt);
    }
  }

  return starts;
}
