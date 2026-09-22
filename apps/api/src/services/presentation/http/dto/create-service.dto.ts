import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDivisibleBy,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { validationMessages } from '../../../../shared/validation/messages.js';

export class CreateServiceDto {
  @ApiProperty({ example: 'Corte feminino' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString(validationMessages.invalid('Nome'))
  @MinLength(2, validationMessages.minLength('Nome'))
  @MaxLength(120, validationMessages.maxLength('Nome'))
  name: string;

  @ApiProperty({
    example: 60,
    description: 'Duração em minutos (múltiplo de 15, de 15 a 480)',
  })
  @IsInt(validationMessages.invalid('Duração'))
  @Min(15, validationMessages.min('Duração'))
  @Max(480, validationMessages.max('Duração'))
  @IsDivisibleBy(15, { message: 'Duração deve ser múltipla de 15 minutos' })
  durationMinutes: number;

  @ApiProperty({
    example: 8000,
    description: 'Preço em centavos (8000 = R$ 80,00)',
  })
  @IsInt(validationMessages.invalid('Preço'))
  @Min(0, validationMessages.min('Preço'))
  @Max(1_000_000, validationMessages.max('Preço'))
  priceCents: number;
}
