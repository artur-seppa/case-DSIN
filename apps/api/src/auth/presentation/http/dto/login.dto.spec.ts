import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto.js';

async function messagesFor(body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(LoginDto, body));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('LoginDto', () => {
  it('accepts a valid body', async () => {
    await expect(
      messagesFor({ email: 'maria@example.com', password: 'x' }),
    ).resolves.toEqual([]);
  });

  it('reports an invalid email in Portuguese', async () => {
    await expect(
      messagesFor({ email: 'nope', password: 'x' }),
    ).resolves.toEqual(['E-mail: valor inválido']);
  });

  it('reports an empty password in Portuguese', async () => {
    await expect(
      messagesFor({ email: 'maria@example.com', password: '' }),
    ).resolves.toEqual(['Senha: campo obrigatório']);
  });
});
