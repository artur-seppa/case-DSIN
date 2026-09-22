import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQuery } from '../../../../shared/pagination/pagination.query.js';
import { BooleanQuery } from '../../../../shared/validation/boolean-query.js';
import { validationMessages } from '../../../../shared/validation/messages.js';

export class ListServicesQuery extends PaginationQuery {
  @ApiPropertyOptional({
    example: false,
    description: 'Só tem efeito para administradores',
  })
  @IsOptional()
  @BooleanQuery()
  @IsBoolean(validationMessages.invalid('Incluir inativos'))
  includeInactive?: boolean;
}
