import { BadRequestException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { validationMessages } from '../validation/messages.js';
import { createValidationPipe } from './validation-pipe.js';

class Body {
  @IsString(validationMessages.invalid('Nome'))
  name: string;
}

async function responseOf(value: unknown) {
  const pipe = createValidationPipe();
  try {
    await pipe.transform(value, { type: 'body', metatype: Body });
  } catch (error) {
    return (error as BadRequestException).getResponse() as {
      message: string[];
      statusCode: number;
    };
  }
  throw new Error('expected the pipe to reject');
}

describe('createValidationPipe', () => {
  it('accepts a valid body', async () => {
    const pipe = createValidationPipe();

    await expect(
      pipe.transform({ name: 'Ana' }, { type: 'body', metatype: Body }),
    ).resolves.toEqual({ name: 'Ana' });
  });

  it('reports field errors with the Portuguese messages of the decorators', async () => {
    const response = await responseOf({ name: 42 });

    expect(response.statusCode).toBe(400);
    expect(response.message).toEqual(['Nome: valor inválido']);
  });

  it('rejects unknown properties in Portuguese instead of the library default', async () => {
    const response = await responseOf({ name: 'Ana', admin: true });

    expect(response.message).toEqual(['O campo "admin" não é permitido']);
  });
});
