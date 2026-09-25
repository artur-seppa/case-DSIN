export function shiftToSalonTime(isoInstant: string, utcOffsetMinutes: number): Date {
  const instant = new Date(isoInstant);
  return new Date(instant.getTime() + utcOffsetMinutes * 60_000);
}

export function formatSalonTime(isoInstant: string, utcOffsetMinutes: number): string {
  const shifted = shiftToSalonTime(isoInstant, utcOffsetMinutes);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(shifted);
}

export function formatSalonDate(isoInstant: string, utcOffsetMinutes: number): string {
  const shifted = shiftToSalonTime(isoInstant, utcOffsetMinutes);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(shifted);
}

export function formatSalonWeekday(isoInstant: string, utcOffsetMinutes: number): string {
  const shifted = shiftToSalonTime(isoInstant, utcOffsetMinutes);
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(shifted);
  return weekday.replace('.', '').toUpperCase();
}

export function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toSalonDateParam(isoInstant: string, utcOffsetMinutes: number): string {
  const shifted = shiftToSalonTime(isoInstant, utcOffsetMinutes);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
