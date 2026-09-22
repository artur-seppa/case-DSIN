import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { CreateProfessionalDto } from './create-professional.dto.js';

export class UpdateProfessionalDto extends PartialType(CreateProfessionalDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional({ example: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean(validationMessages.invalid('Ativo'))
  active?: boolean;
}
