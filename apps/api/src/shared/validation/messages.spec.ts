import { plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  validate,
} from 'class-validator';
import { validationMessages } from './messages.js';

class Sample {
  @IsString(validationMessages.invalid('Nome'))
  @MinLength(3, validationMessages.minLength('Nome'))
  @MaxLength(5, validationMessages.maxLength('Nome'))
  name: string;

  @IsEmail({}, validationMessages.invalid('E-mail'))
  email: string;

  @IsNotEmpty(validationMessages.required('Senha'))
  password: string;

  @Min(10, validationMessages.min('Duração'))
  @Max(20, validationMessages.max('Duração'))
  minutes: number = 15;
}

async function messagesFor(body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(Sample, body));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

const valid = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'x',
  minutes: 15,
};

describe('validationMessages', () => {
  it('builds a readable minimum length message from the decorator argument', async () => {
    await expect(messagesFor({ ...valid, name: 'Al' })).resolves.toEqual([
      'Nome deve ter no mínimo 3 caracteres',
    ]);
  });

  it('builds a readable maximum length message from the decorator argument', async () => {
    await expect(messagesFor({ ...valid, name: 'Alexandre' })).resolves.toEqual(
      ['Nome deve ter no máximo 5 caracteres'],
    );
  });

  it('reports an invalid type without gender agreement problems', async () => {
    await expect(messagesFor({ ...valid, name: 42 })).resolves.toContain(
      'Nome: valor inválido',
    );
    await expect(
      messagesFor({ ...valid, email: 'not-an-email' }),
    ).resolves.toEqual(['E-mail: valor inválido']);
  });

  it('reports a missing required value', async () => {
    await expect(messagesFor({ ...valid, password: '' })).resolves.toEqual([
      'Senha: campo obrigatório',
    ]);
  });

  it('reports numeric bounds using the decorator argument', async () => {
    await expect(messagesFor({ ...valid, minutes: 5 })).resolves.toEqual([
      'Duração deve ser no mínimo 10',
    ]);
    await expect(messagesFor({ ...valid, minutes: 25 })).resolves.toEqual([
      'Duração deve ser no máximo 20',
    ]);
  });
});
