import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsPhoneNumber } from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

const REGION = 'BR';

export function normalizePhone(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  const parsed = parsePhoneNumberFromString(trimmed, REGION);
  return parsed?.isValid() ? parsed.number : trimmed;
}

export const PhoneNumberBR = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => normalizePhone(value)),
    IsPhoneNumber(REGION, { message: 'Número de telefone inválido' }),
  );
