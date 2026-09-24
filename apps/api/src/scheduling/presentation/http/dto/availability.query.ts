import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, Matches, ValidateNested } from 'class-validator';
import { IsUlid } from '../../../../shared/validation/ulid.js';
import { AppointmentItemInputDto } from './appointment-item-input.dto.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseItems(value: unknown): AppointmentItemInputDto[] {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }
  return value.split(',').map((pair) => {
    const [serviceId, professionalId] = pair.split(':');
    return plainToInstance(AppointmentItemInputDto, {
      serviceId: serviceId ?? '',
      professionalId: professionalId ?? '',
    });
  });
}

export class AvailabilityQuery {
  @ApiProperty({ example: '2026-10-01', description: 'Data, no fuso do salão' })
  @Matches(DATE_PATTERN, { message: 'Data deve estar no formato AAAA-MM-DD' })
  date: string;

  @ApiProperty({
    example: '01M30K8EVJW30BGBPJX78A3GHM:01M30K8EVJW30BGBPJX78A3GHN',
    description: 'Itens desejados, serviceId:professionalId separados por vírgula',
  })
  @Transform(({ value }: { value: unknown }) => parseItems(value))
  @IsArray({ message: 'Itens: valor inválido' })
  @ArrayMinSize(1, { message: 'Informe ao menos um item' })
  @ArrayMaxSize(20, { message: 'Informe no máximo 20 itens' })
  @ValidateNested({ each: true })
  items: AppointmentItemInputDto[];

  @ApiPropertyOptional({ description: 'Ordem sendo alterada (adicionar/reposicionar item)' })
  @IsOptional()
  @IsUlid()
  appointmentId?: string;

  @ApiPropertyOptional({ description: 'Item a ignorar ao reposicionar' })
  @IsOptional()
  @IsUlid()
  excludeItemId?: string;
}
