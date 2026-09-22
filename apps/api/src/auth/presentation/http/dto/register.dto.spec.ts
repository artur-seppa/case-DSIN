import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto.js';

const base = {
  name: 'Maria Silva',
  email: 'maria@example.com',
  password: 'senha-segura-1',
};

async function messagesFor(body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(RegisterDto, body));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('RegisterDto', () => {
  it('trims the name before validating it', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...base,
      name: '  Maria Silva ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBe('Maria Silva');
  });

  it('accepts a valid body and stores the phone in the international format', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...base,
      phone: ' (11) 91234-5678 ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.phone).toBe('+5511912345678');
  });

  it('does not require a phone', async () => {
    await expect(messagesFor(base)).resolves.toEqual([]);
  });

  it('rejects an invalid phone in Portuguese', async () => {
    await expect(
      messagesFor({ ...base, phone: '(11) 81234-5678' }),
    ).resolves.toEqual(['Número de telefone inválido']);
  });

  it('reports every other field in Portuguese', async () => {
    await expect(messagesFor({ ...base, name: 'A' })).resolves.toEqual([
      'Nome deve ter no mínimo 2 caracteres',
    ]);
    await expect(
      messagesFor({ ...base, email: 'not-an-email' }),
    ).resolves.toEqual(['E-mail: valor inválido']);
    await expect(
      messagesFor({ ...base, password: '1234567' }),
    ).resolves.toEqual(['Senha deve ter no mínimo 8 caracteres']);
  });
});
