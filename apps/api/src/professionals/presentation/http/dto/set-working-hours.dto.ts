import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';
import { TIME_PATTERN } from '../../../domain/working-hours.policy.js';

const timeMessage = { message: 'Horário deve estar no formato HH:MM' };

export class WorkingWindowDto {
  @ApiProperty({ example: 1, description: '1 = segunda ... 7 = domingo' })
  @IsInt(validationMessages.invalid('Dia da semana'))
  @Min(1, validationMessages.min('Dia da semana'))
  @Max(7, validationMessages.max('Dia da semana'))
  weekday: number;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN, timeMessage)
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @Matches(TIME_PATTERN, timeMessage)
  endTime: string;
}

export class SetWorkingHoursDto {
  @ApiProperty({
    type: [WorkingWindowDto],
    description:
      'Substitui o expediente semanal. Várias faixas no mesmo dia permitem pausa (ex.: almoço). Lista vazia remove tudo',
  })
  @IsArray(validationMessages.invalid('Faixas de horário'))
  @ArrayMaxSize(70, { message: 'Informe no máximo 70 faixas de horário' })
  @ValidateNested({ each: true })
  @Type(() => WorkingWindowDto)
  windows: WorkingWindowDto[];
}
