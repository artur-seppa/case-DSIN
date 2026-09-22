import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { CreateServiceDto } from './create-service.dto.js';

export class UpdateServiceDto extends PartialType(CreateServiceDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional({ example: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean(validationMessages.invalid('Ativo'))
  active?: boolean;
}
