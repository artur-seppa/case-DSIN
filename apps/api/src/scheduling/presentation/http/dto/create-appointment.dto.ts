import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { AppointmentItemInputDto } from './appointment-item-input.dto.js';

export class CreateAppointmentDto {
  @ApiProperty({
    example: '2026-10-01T15:00:00Z',
    description: 'Início do primeiro item, na grade de 30 min',
  })
  @Type(() => Date)
  @IsDate(validationMessages.invalid('Início'))
  startsAt: Date;

  @ApiPropertyOptional({ example: 'Alergia a produtos com amônia' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString(validationMessages.invalid('Observações'))
  @MaxLength(500, validationMessages.maxLength('Observações'))
  notes?: string;

  @ApiProperty({ type: [AppointmentItemInputDto] })
  @IsArray(validationMessages.invalid('Itens'))
  @ArrayMinSize(1, { message: 'Informe ao menos um item' })
  @ArrayMaxSize(20, { message: 'Informe no máximo 20 itens' })
  @ValidateNested({ each: true })
  @Type(() => AppointmentItemInputDto)
  items: AppointmentItemInputDto[];
}
