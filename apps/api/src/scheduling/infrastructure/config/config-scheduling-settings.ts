import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../../shared/config/env.validation.js';
import { SchedulingSettings } from '../../application/ports/scheduling-settings.js';

@Injectable()
export class ConfigSchedulingSettings extends SchedulingSettings {
  readonly utcOffsetMinutes: number;
  readonly slotMinutes = 30;
  readonly minLeadMinutes = 120;
  readonly maxDaysAhead = 60;
  readonly changeWindowHours = 48;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super();
    this.utcOffsetMinutes = config.get('SALON_UTC_OFFSET_HOURS', { infer: true }) * 60;
  }
}
