import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../../shared/config/env.validation.js';
import { AuthSettings } from '../../application/ports/auth-settings.js';

@Injectable()
export class ConfigAuthSettings extends AuthSettings {
  readonly accessTokenTtlMinutes: number;
  readonly refreshTokenTtlDays: number;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super();
    this.accessTokenTtlMinutes = config.get('ACCESS_TOKEN_TTL_MINUTES', {
      infer: true,
    });
    this.refreshTokenTtlDays = config.get('REFRESH_TOKEN_TTL_DAYS', {
      infer: true,
    });
  }
}
