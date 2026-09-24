import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Type } from 'class-transformer';
import { PageResponse } from '../../../../shared/pagination/page.response.js';
import type { AppointmentDetail } from '../../../application/appointment-detail.assembler.js';
import { AppointmentStatus } from '../../../domain/appointment-status.js';
import { ItemStatus } from '../../../domain/rules/item-status.js';

class ClientResponse {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() phone: string | null;
}

class ServiceRefResponse {
  @Expose() id: string;
  @Expose() name: string;
}

class ProfessionalRefResponse {
  @Expose() id: string;
  @Expose() name: string;
}

class AppointmentItemResponse {
  @Expose() id: string;

  @Expose()
  @Type(() => ServiceRefResponse)
  service: ServiceRefResponse;

  @Expose()
  @Type(() => ProfessionalRefResponse)
  professional: ProfessionalRefResponse;

  @Expose() startsAt: Date;
  @Expose() endsAt: Date;
  @Expose() priceCents: number;

  @Expose()
  @ApiProperty({ enum: ItemStatus })
  status: ItemStatus;
}

export class AppointmentResponse {
  @Expose() id: string;

  @Expose()
  @Type(() => ClientResponse)
  client: ClientResponse;

  @Expose()
  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @Expose() notes: string | null;
  @Expose() createdAt: Date;
  @Expose() startsAt: Date;
  @Expose() endsAt: Date;
  @Expose() totalCents: number;
  @Expose() changeDeadline: Date | null;
  @Expose() canClientChange: boolean;

  @Expose()
  @Type(() => AppointmentItemResponse)
  @ApiProperty({ type: [AppointmentItemResponse] })
  items: AppointmentItemResponse[];

  static fromDetail(detail: AppointmentDetail): AppointmentResponse {
    return plainToInstance(AppointmentResponse, detail, {
      excludeExtraneousValues: true,
    });
  }
}

export class AppointmentPageResponse extends PageResponse(AppointmentResponse) {}
