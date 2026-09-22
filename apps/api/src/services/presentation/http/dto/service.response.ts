import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PageResponse } from '../../../../shared/pagination/page.response.js';

export class ServiceResponse {
  @Expose() id: string;
  @Expose() name: string;

  @Expose()
  @ApiProperty({ example: 60, description: 'Minutos' })
  durationMinutes: number;

  @Expose()
  @ApiProperty({ example: 8000, description: 'Centavos' })
  priceCents: number;

  @Expose() active: boolean;
}

export class ServicePageResponse extends PageResponse(ServiceResponse) {}
