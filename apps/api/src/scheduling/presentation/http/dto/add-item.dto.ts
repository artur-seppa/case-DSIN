import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { IsUlid } from '../../../../shared/validation/ulid.js';

export class AddItemDto {
  @ApiProperty({ example: '01M30K8EVJW30BGBPJX78A3GHM' })
  @IsUlid()
  serviceId: string;

  @ApiProperty({ example: '01M30K8EVJW30BGBPJX78A3GHM' })
  @IsUlid()
  professionalId: string;

  @ApiProperty({
    example: '2026-10-01T16:00:00Z',
    description: 'Início do item, na grade de 30 min',
  })
  @Type(() => Date)
  @IsDate(validationMessages.invalid('Início'))
  startsAt: Date;
}
