import { InvalidWorkingHoursException } from './exceptions.js';

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface WorkingWindow {
  weekday: number;
  startTime: string;
  endTime: string;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function assertValidWindow(window: WorkingWindow): void {
  if (
    !Number.isInteger(window.weekday) ||
    window.weekday < 1 ||
    window.weekday > 7
  ) {
    throw new InvalidWorkingHoursException(
      'Dia da semana deve estar entre 1 (segunda) e 7 (domingo)',
    );
  }
  if (
    !TIME_PATTERN.test(window.startTime) ||
    !TIME_PATTERN.test(window.endTime)
  ) {
    throw new InvalidWorkingHoursException(
      'Horário deve estar no formato HH:MM',
    );
  }
  if (toMinutes(window.startTime) >= toMinutes(window.endTime)) {
    throw new InvalidWorkingHoursException(
      'O horário de início deve ser anterior ao de término',
    );
  }
}

function assertNoOverlap(windows: WorkingWindow[]): void {
  const ordered = [...windows].sort(
    (a, b) =>
      a.weekday - b.weekday || toMinutes(a.startTime) - toMinutes(b.startTime),
  );

  for (let i = 1; i < ordered.length; i++) {
    const previous = ordered[i - 1] as WorkingWindow;
    const current = ordered[i] as WorkingWindow;
    const sameDay = previous.weekday === current.weekday;
    if (sameDay && toMinutes(current.startTime) < toMinutes(previous.endTime)) {
      throw new InvalidWorkingHoursException(
        'As faixas de horário de um mesmo dia não podem se sobrepor',
      );
    }
  }
}

export function assertValidWorkingWindows(windows: WorkingWindow[]): void {
  windows.forEach(assertValidWindow);
  assertNoOverlap(windows);
}

export function sortWorkingHours<
  T extends { weekday: number; startTime: string },
>(hours: T[]): T[] {
  return [...hours].sort(
    (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  );
}
