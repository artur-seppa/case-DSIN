import { weekdayOfLocalDate } from '../../../shared/time/utc-offset.js';

function toDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!) / 86_400_000;
}

function weekdayOf(dayNumber: number): number {
  const shifted = new Date(dayNumber * 86_400_000);
  return weekdayOfLocalDate({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

function mondayOf(dayNumber: number): number {
  return dayNumber - (weekdayOf(dayNumber) - 1);
}

export function findSameWeekDate(
  date: string,
  otherDates: string[],
): string | null {
  const day = toDayNumber(date);
  const monday = mondayOf(day);

  const sameWeek = otherDates
    .filter((other) => other !== date)
    .map(toDayNumber)
    .filter((otherDay) => mondayOf(otherDay) === monday);

  if (sameWeek.length === 0) {
    return null;
  }

  const closest = sameWeek.reduce((best, current) =>
    Math.abs(current - day) < Math.abs(best - day) ? current : best,
  );

  return new Date(closest * 86_400_000).toISOString().slice(0, 10);
}
