import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQuery } from '../../../../shared/pagination/pagination.query.js';
import { BooleanQuery } from '../../../../shared/validation/boolean-query.js';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { IsUlid } from '../../../../shared/validation/ulid.js';

export class ListProfessionalsQuery extends PaginationQuery {
  @ApiPropertyOptional({
    example: '01M30K8EVJW30BGBPJX78A3GHM',
    description: 'Só os profissionais que executam este serviço',
  })
  @IsOptional()
  @IsUlid()
  serviceId?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Só tem efeito para administradores',
  })
  @IsOptional()
  @BooleanQuery()
  @IsBoolean(validationMessages.invalid('Incluir inativos'))
  includeInactive?: boolean;
}
