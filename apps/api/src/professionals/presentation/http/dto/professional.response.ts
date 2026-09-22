import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Type } from 'class-transformer';
import { PageResponse } from '../../../../shared/pagination/page.response.js';
import type { ProfessionalDetail } from '../../../application/use-cases/get-professional.use-case.js';

export class ProfessionalResponse {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() active: boolean;
}

export class ProfessionalPageResponse extends PageResponse(
  ProfessionalResponse,
) {}

export class WorkingWindowResponse {
  @Expose()
  @ApiProperty({ example: 1, description: '1 = segunda ... 7 = domingo' })
  weekday: number;

  @Expose()
  @ApiProperty({ example: '09:00' })
  startTime: string;

  @Expose()
  @ApiProperty({ example: '18:00' })
  endTime: string;
}

export class ProfessionalDetailResponse extends ProfessionalResponse {
  @Expose()
  @ApiProperty({ type: [String] })
  serviceIds: string[];

  @Expose()
  @Type(() => WorkingWindowResponse)
  @ApiProperty({ type: [WorkingWindowResponse] })
  workingHours: WorkingWindowResponse[];

  static fromDetail(detail: ProfessionalDetail): ProfessionalDetailResponse {
    return plainToInstance(
      ProfessionalDetailResponse,
      {
        id: detail.professional.id,
        name: detail.professional.name,
        active: detail.professional.active,
        serviceIds: detail.serviceIds,
        workingHours: detail.workingHours.map((hours) => ({
          weekday: hours.weekday,
          startTime: hours.startTime.slice(0, 5),
          endTime: hours.endTime.slice(0, 5),
        })),
      },
      { excludeExtraneousValues: true },
    );
  }
}
