import {
  addDaysToLocalDate,
  localDate,
  localDateKey,
  localDayBounds,
  weekdayOfLocalDate,
} from '../../shared/time/utc-offset.js';

export interface WeekBounds {
  weekStartKey: string;
  weekEndKey: string;
  currentWeekStartUtc: Date;
  currentWeekEndUtc: Date;
  previousWeekStartUtc: Date;
}

export function weekBoundsContaining(weekStartParam: string, utcOffsetMinutes: number): WeekBounds {
  const given = localDate(weekStartParam);
  const weekday = weekdayOfLocalDate(given);
  const monday = addDaysToLocalDate(given, -(weekday - 1));
  const sunday = addDaysToLocalDate(monday, 6);
  const previousMonday = addDaysToLocalDate(monday, -7);

  const currentBounds = localDayBounds(monday, utcOffsetMinutes);
  const nextMondayBounds = localDayBounds(addDaysToLocalDate(monday, 7), utcOffsetMinutes);
  const previousBounds = localDayBounds(previousMonday, utcOffsetMinutes);

  return {
    weekStartKey: localDateKey(monday),
    weekEndKey: localDateKey(sunday),
    currentWeekStartUtc: currentBounds.start,
    currentWeekEndUtc: nextMondayBounds.start,
    previousWeekStartUtc: previousBounds.start,
  };
}
