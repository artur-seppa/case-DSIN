import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';

export class CreateProfessionalDto {
  @ApiProperty({ example: 'Ana Souza' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString(validationMessages.invalid('Nome'))
  @MinLength(2, validationMessages.minLength('Nome'))
  @MaxLength(120, validationMessages.maxLength('Nome'))
  name: string;
}
