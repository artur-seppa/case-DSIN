import { Expose } from 'class-transformer';

export class ConfigResponse {
  @Expose() utcOffsetMinutes: number;
  @Expose() slotMinutes: number;
  @Expose() minLeadHours: number;
  @Expose() maxDaysAhead: number;
  @Expose() changeWindowHours: number;
}
