import { Injectable } from '@nestjs/common';
import { SchedulingSettings } from '../ports/scheduling-settings.js';

export interface SchedulingConfig {
  utcOffsetMinutes: number;
  slotMinutes: number;
  minLeadHours: number;
  maxDaysAhead: number;
  changeWindowHours: number;
}

@Injectable()
export class GetConfigUseCase {
  constructor(private readonly settings: SchedulingSettings) {}

  execute(): SchedulingConfig {
    return {
      utcOffsetMinutes: this.settings.utcOffsetMinutes,
      slotMinutes: this.settings.slotMinutes,
      minLeadHours: this.settings.minLeadMinutes / 60,
      maxDaysAhead: this.settings.maxDaysAhead,
      changeWindowHours: this.settings.changeWindowHours,
    };
  }
}
