import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { PhoneNumberBR } from '../../../../shared/validation/phone-number.js';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString(validationMessages.invalid('Nome'))
  @MinLength(2, validationMessages.minLength('Nome'))
  @MaxLength(120, validationMessages.maxLength('Nome'))
  name: string;

  @IsEmail({}, validationMessages.invalid('E-mail'))
  @MaxLength(254, validationMessages.maxLength('E-mail'))
  email: string;

  @ApiPropertyOptional({
    example: '(11) 91234-5678',
    description: 'Guardado no formato internacional (+5511912345678)',
  })
  @IsOptional()
  @PhoneNumberBR()
  phone?: string;

  @IsString(validationMessages.invalid('Senha'))
  @MinLength(8, validationMessages.minLength('Senha'))
  @MaxLength(128, validationMessages.maxLength('Senha'))
  password: string;
}
