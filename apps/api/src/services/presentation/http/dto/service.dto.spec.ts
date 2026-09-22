import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateServiceDto } from './create-service.dto.js';
import { ListServicesQuery } from './list-services.query.js';
import { UpdateServiceDto } from './update-service.dto.js';

async function messages(type: new () => object, body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(type, body));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

const valid = { name: 'Corte feminino', durationMinutes: 60, priceCents: 8000 };

describe('UpdateServiceDto', () => {
  it.each(['name', 'durationMinutes', 'priceCents', 'active'])(
    'rejects null in %s instead of letting it reach the database',
    async (field) => {
      const result = await messages(UpdateServiceDto, { [field]: null });

      expect(result).not.toEqual([]);
    },
  );

  it('still accepts an empty body and omitted fields', async () => {
    await expect(messages(UpdateServiceDto, {})).resolves.toEqual([]);
    await expect(
      messages(UpdateServiceDto, { priceCents: 9000 }),
    ).resolves.toEqual([]);
  });
});

describe('CreateServiceDto', () => {
  it('trims the name before validating it', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...valid,
      name: '  Corte feminino ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBe('Corte feminino');
  });

  it('rejects a name that is too short once trimmed', async () => {
    await expect(
      messages(CreateServiceDto, { ...valid, name: ' A ' }),
    ).resolves.toEqual(['Nome deve ter no mínimo 2 caracteres']);
  });

  it('accepts a valid service', async () => {
    await expect(messages(CreateServiceDto, valid)).resolves.toEqual([]);
  });

  it('requires the duration to be a multiple of 15 minutes', async () => {
    await expect(
      messages(CreateServiceDto, { ...valid, durationMinutes: 50 }),
    ).resolves.toEqual(['Duração deve ser múltipla de 15 minutos']);
  });

  it('keeps the duration between 15 and 480 minutes', async () => {
    await expect(
      messages(CreateServiceDto, { ...valid, durationMinutes: 0 }),
    ).resolves.toContain('Duração deve ser no mínimo 15');
    await expect(
      messages(CreateServiceDto, { ...valid, durationMinutes: 495 }),
    ).resolves.toEqual(['Duração deve ser no máximo 480']);
  });

  it('rejects a negative or fractional price', async () => {
    await expect(
      messages(CreateServiceDto, { ...valid, priceCents: -1 }),
    ).resolves.toEqual(['Preço deve ser no mínimo 0']);
    await expect(
      messages(CreateServiceDto, { ...valid, priceCents: 10.5 }),
    ).resolves.toEqual(['Preço: valor inválido']);
  });

  it('rejects a name that is too short', async () => {
    await expect(
      messages(CreateServiceDto, { ...valid, name: 'A' }),
    ).resolves.toEqual(['Nome deve ter no mínimo 2 caracteres']);
  });
});

describe('UpdateServiceDto', () => {
  it('lets every field be omitted', async () => {
    await expect(messages(UpdateServiceDto, {})).resolves.toEqual([]);
  });

  it('accepts the active flag', async () => {
    await expect(
      messages(UpdateServiceDto, { active: false }),
    ).resolves.toEqual([]);
  });

  it('keeps the validation rules of the creation DTO', async () => {
    await expect(
      messages(UpdateServiceDto, { durationMinutes: 50 }),
    ).resolves.toEqual(['Duração deve ser múltipla de 15 minutos']);
  });

  it('rejects a non boolean active flag', async () => {
    await expect(
      messages(UpdateServiceDto, { active: 'yes' }),
    ).resolves.toEqual(['Ativo: valor inválido']);
  });
});

describe('ListServicesQuery', () => {
  it.each([
    ['true', true],
    ['false', false],
    [undefined, undefined],
  ])('reads includeInactive=%s as %s', async (raw, expected) => {
    const query = plainToInstance(
      ListServicesQuery,
      raw === undefined ? {} : { includeInactive: raw },
    );

    expect(await validate(query)).toHaveLength(0);
    expect(query.includeInactive).toBe(expected);
  });

  it('rejects any other value', async () => {
    await expect(
      messages(ListServicesQuery, { includeInactive: 'maybe' }),
    ).resolves.toEqual(['Incluir inativos: valor inválido']);
  });
});
