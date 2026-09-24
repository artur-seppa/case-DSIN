import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';

export class CancelDto {
  @ApiPropertyOptional({ example: 'Imprevisto de última hora' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString(validationMessages.invalid('Motivo'))
  @MaxLength(255, validationMessages.maxLength('Motivo'))
  reason?: string;
}
