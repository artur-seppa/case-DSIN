import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { IsUlid } from '../../../../shared/validation/ulid.js';

export class RepositionItemDto {
  @ApiProperty({
    example: '2026-10-01T16:00:00Z',
    description: 'Novo início do item, na grade de 30 min',
  })
  @Type(() => Date)
  @IsDate(validationMessages.invalid('Início'))
  startsAt: Date;

  @ApiPropertyOptional({ example: '01M30K8EVJW30BGBPJX78A3GHM' })
  @IsOptional()
  @IsUlid()
  professionalId?: string;
}
