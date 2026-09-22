import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto.js';

async function messagesFor(body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(UpdateProfileDto, body));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('UpdateProfileDto', () => {
  it('trims the name before validating it', async () => {
    const dto = plainToInstance(UpdateProfileDto, { name: '  Novo Nome ' });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBe('Novo Nome');
  });

  it('rejects a null name (only the phone can be cleared with null)', async () => {
    await expect(messagesFor({ name: null })).resolves.not.toEqual([]);
    await expect(messagesFor({ phone: null })).resolves.toEqual([]);
  });

  it('rejects a name that is too short once trimmed', async () => {
    await expect(messagesFor({ name: ' A ' })).resolves.toEqual([
      'Nome deve ter no mínimo 2 caracteres',
    ]);
  });

  it('stores the phone in the international format', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      phone: '  (11) 91234-5678  ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.phone).toBe('+5511912345678');
  });

  it('lets every field be omitted and the phone be cleared with null', async () => {
    await expect(messagesFor({})).resolves.toEqual([]);
    await expect(messagesFor({ phone: null })).resolves.toEqual([]);
  });

  it('rejects an invalid phone in Portuguese', async () => {
    await expect(messagesFor({ phone: '123' })).resolves.toEqual([
      'Número de telefone inválido',
    ]);
  });

  it('reports an invalid name in Portuguese', async () => {
    await expect(messagesFor({ name: 'A' })).resolves.toEqual([
      'Nome deve ter no mínimo 2 caracteres',
    ]);
  });
});
