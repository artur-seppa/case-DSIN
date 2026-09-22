import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function toMessages(error: ValidationError, parent = ''): string[] {
  const field = parent ? `${parent}.${error.property}` : error.property;
  const own = Object.entries(error.constraints ?? {}).map(([type, text]) =>
    type === 'whitelistValidation'
      ? `O campo "${field}" não é permitido`
      : text,
  );
  const nested = (error.children ?? []).flatMap((child) =>
    toMessages(child, field),
  );
  return [...own, ...nested];
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException(errors.flatMap((error) => toMessages(error))),
  });
}
