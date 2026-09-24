import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsOptional, Matches } from 'class-validator';
import { PaginationQuery } from '../../../../shared/pagination/pagination.query.js';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { IsUlid } from '../../../../shared/validation/ulid.js';
import { ItemStatus } from '../../../domain/rules/item-status.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ListAppointmentsQuery extends PaginationQuery {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'Data inicial deve estar no formato AAAA-MM-DD' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'Data final deve estar no formato AAAA-MM-DD' })
  to?: string;

  @ApiPropertyOptional({
    enum: ItemStatus,
    isArray: true,
    description: 'Repetível: ?itemStatus=PENDING&itemStatus=CONFIRMED',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value : [value]))
  @IsArray(validationMessages.invalid('Status do item'))
  @IsEnum(ItemStatus, { each: true, ...validationMessages.invalid('Status do item') })
  itemStatus?: ItemStatus[];

  @ApiPropertyOptional({ example: '01M30K8EVJW30BGBPJX78A3GHM' })
  @IsOptional()
  @IsUlid()
  professionalId?: string;

  @ApiPropertyOptional({ example: '01M30K8EVJW30BGBPJX78A3GHM' })
  @IsOptional()
  @IsUlid()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Só administrador' })
  @IsOptional()
  @IsUlid()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Busca por nome/e-mail do cliente. Só administrador' })
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ enum: ['startsAt', 'createdAt'], example: 'startsAt' })
  @IsOptional()
  @IsIn(['startsAt', 'createdAt'], validationMessages.invalid('Ordenação'))
  sort?: 'startsAt' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'], validationMessages.invalid('Direção da ordenação'))
  order?: 'asc' | 'desc';
}
