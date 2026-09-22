import { applyDecorators } from '@nestjs/common';
import { Matches, type ValidationOptions } from 'class-validator';

export const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export const IsUlid = (options?: ValidationOptions) =>
  applyDecorators(
    Matches(ULID_PATTERN, { message: 'Identificador inválido', ...options }),
  );
