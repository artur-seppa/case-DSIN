import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class WeeklyReportQuery {
  @ApiProperty({ example: '2026-09-28', description: 'Qualquer data dentro da semana desejada' })
  @Matches(DATE_PATTERN, { message: 'weekStart deve estar no formato AAAA-MM-DD' })
  weekStart: string;
}
