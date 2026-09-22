import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { PhoneNumberBR } from '../../../../shared/validation/phone-number.js';

export class UpdateProfileDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString(validationMessages.invalid('Nome'))
  @MinLength(2, validationMessages.minLength('Nome'))
  @MaxLength(120, validationMessages.maxLength('Nome'))
  name?: string;

  @ApiPropertyOptional({
    example: '(11) 91234-5678',
    nullable: true,
    description:
      'Guardado no formato internacional (+5511912345678). Envie null para remover',
  })
  @IsOptional()
  @PhoneNumberBR()
  phone?: string | null;
}
