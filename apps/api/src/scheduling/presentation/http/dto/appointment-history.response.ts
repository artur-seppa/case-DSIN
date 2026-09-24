import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AppointmentHistoryAction } from '../../../domain/entities/appointment-history-action.js';

class HistoryActorResponse {
  @Expose() id: string;
  @Expose() name: string;
}

export class AppointmentHistoryEntryResponse {
  @Expose() id: string;
  @Expose() itemId: string;

  @Expose()
  @Type(() => HistoryActorResponse)
  actor: HistoryActorResponse;

  @Expose()
  @ApiProperty({ enum: AppointmentHistoryAction })
  action: AppointmentHistoryAction;

  @Expose() changes: Record<string, unknown>;
  @Expose() occurredAt: Date;
}
