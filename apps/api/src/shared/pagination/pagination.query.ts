import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { validationMessages } from '../validation/messages.js';
import type { PageRequest } from './page.js';

export class PaginationQuery implements PageRequest {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
    maximum: 100000,
    description: 'Página, começando em 1',
  })
  @Type(() => Number)
  @IsInt(validationMessages.invalid('Página'))
  @Min(1, validationMessages.min('Página'))
  @Max(100000, validationMessages.max('Página'))
  page: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Itens por página (máximo 100)',
  })
  @Type(() => Number)
  @IsInt(validationMessages.invalid('Itens por página'))
  @Min(1, validationMessages.min('Itens por página'))
  @Max(100, validationMessages.max('Itens por página'))
  limit: number = 20;
}
