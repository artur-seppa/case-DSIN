export abstract class SchedulingSettings {
  abstract readonly utcOffsetMinutes: number;
  abstract readonly slotMinutes: number;
  abstract readonly minLeadMinutes: number;
  abstract readonly maxDaysAhead: number;
  abstract readonly changeWindowHours: number;
}
