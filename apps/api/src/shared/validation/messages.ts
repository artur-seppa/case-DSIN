import type { ValidationArguments, ValidationOptions } from 'class-validator';

export const validationMessages = {
  invalid: (label: string): ValidationOptions => ({
    message: `${label}: valor inválido`,
  }),
  required: (label: string): ValidationOptions => ({
    message: `${label}: campo obrigatório`,
  }),
  min: (label: string): ValidationOptions => ({
    message: ({ constraints }: ValidationArguments) =>
      `${label} deve ser no mínimo ${constraints[0]}`,
  }),
  max: (label: string): ValidationOptions => ({
    message: ({ constraints }: ValidationArguments) =>
      `${label} deve ser no máximo ${constraints[0]}`,
  }),
  minLength: (label: string): ValidationOptions => ({
    message: ({ constraints }: ValidationArguments) =>
      `${label} deve ter no mínimo ${constraints[0]} caracteres`,
  }),
  maxLength: (label: string): ValidationOptions => ({
    message: ({ constraints }: ValidationArguments) =>
      `${label} deve ter no máximo ${constraints[0]} caracteres`,
  }),
};
