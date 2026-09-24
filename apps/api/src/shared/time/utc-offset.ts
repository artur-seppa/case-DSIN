export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

export interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

// ISO weekday (Monday=1..Sunday=7) of a local calendar date.
export function weekdayOfLocalDate(
  date: Pick<LocalDateTime, 'year' | 'month' | 'day'>,
): number {
  const jsWeekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return jsWeekday === 0 ? 7 : jsWeekday;
}

// UTC instant -> local wall-clock parts (e.g. "15:00Z" at GMT-3 -> 12:00 local).
export function zonedPartsOf(instant: Date, utcOffsetMinutes: number): ZonedParts {
  const shifted = new Date(instant.getTime() + utcOffsetMinutes * 60_000);
  const date = {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };

  return {
    ...date,
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: weekdayOfLocalDate(date),
  };
}

// Local wall-clock parts -> UTC instant (the reverse of zonedPartsOf).
export function zonedTimeToInstant(local: LocalDateTime, utcOffsetMinutes: number): Date {
  const utcMs =
    Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) -
    utcOffsetMinutes * 60_000;
  return new Date(utcMs);
}

// [start, end) of a local calendar day, as UTC instants.
export function localDayBounds(
  date: Pick<LocalDateTime, 'year' | 'month' | 'day'>,
  utcOffsetMinutes: number,
): { start: Date; end: Date } {
  const start = zonedTimeToInstant({ ...date, hour: 0, minute: 0 }, utcOffsetMinutes);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60_000) };
}

export function localDate(
  isoDate: string,
): Pick<LocalDateTime, 'year' | 'month' | 'day'> {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
}

export function localTime(
  hhmm: string,
): Pick<LocalDateTime, 'hour' | 'minute'> {
  const [hour, minute] = hhmm.split(':').map(Number);
  return { hour: hour!, minute: minute! };
}

export function localDaysBetween(
  from: Pick<LocalDateTime, 'year' | 'month' | 'day'>,
  to: Pick<LocalDateTime, 'year' | 'month' | 'day'>,
): number {
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function localDateKey(
  parts: Pick<LocalDateTime, 'year' | 'month' | 'day'>,
): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}
