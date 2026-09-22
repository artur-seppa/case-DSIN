import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProfessionalDto } from './create-professional.dto.js';
import { ListProfessionalsQuery } from './list-professionals.query.js';
import { SetServicesDto } from './set-services.dto.js';
import { SetWorkingHoursDto } from './set-working-hours.dto.js';
import { UpdateProfessionalDto } from './update-professional.dto.js';

async function messages(type: new () => object, body: Record<string, unknown>) {
  const walk = (errors: Awaited<ReturnType<typeof validate>>): string[] =>
    errors.flatMap((error) => [
      ...Object.values(error.constraints ?? {}),
      ...walk(error.children ?? []),
    ]);
  return walk(await validate(plainToInstance(type, body)));
}

const ulid = '01M30K8EVJW30BGBPJX78A3GHM';

describe('UpdateProfessionalDto null handling', () => {
  it.each(['name', 'active'])(
    'rejects null in %s instead of letting it reach the database',
    async (field) => {
      const result = await messages(UpdateProfessionalDto, { [field]: null });

      expect(result).not.toEqual([]);
    },
  );

  it('still accepts an empty body', async () => {
    await expect(messages(UpdateProfessionalDto, {})).resolves.toEqual([]);
  });
});

describe('CreateProfessionalDto', () => {
  it('trims the name before validating it', async () => {
    const dto = plainToInstance(CreateProfessionalDto, {
      name: '  Ana Souza ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBe('Ana Souza');
  });

  it('accepts a name and rejects a short one', async () => {
    await expect(
      messages(CreateProfessionalDto, { name: 'Ana Souza' }),
    ).resolves.toEqual([]);
    await expect(
      messages(CreateProfessionalDto, { name: 'A' }),
    ).resolves.toEqual(['Nome deve ter no mínimo 2 caracteres']);
  });
});

describe('UpdateProfessionalDto', () => {
  it('lets every field be omitted and validates the active flag', async () => {
    await expect(messages(UpdateProfessionalDto, {})).resolves.toEqual([]);
    await expect(
      messages(UpdateProfessionalDto, { active: 'no' }),
    ).resolves.toEqual(['Ativo: valor inválido']);
  });
});

describe('ListProfessionalsQuery', () => {
  it('accepts an optional service id and the inactive flag', async () => {
    await expect(messages(ListProfessionalsQuery, {})).resolves.toEqual([]);
    await expect(
      messages(ListProfessionalsQuery, {
        serviceId: ulid,
        includeInactive: 'true',
      }),
    ).resolves.toEqual([]);
  });

  it('rejects a malformed service id', async () => {
    await expect(
      messages(ListProfessionalsQuery, { serviceId: 'abc' }),
    ).resolves.toEqual(['Identificador inválido']);
  });
});

describe('SetServicesDto', () => {
  it('accepts a list of ids, including an empty one', async () => {
    await expect(
      messages(SetServicesDto, { serviceIds: [ulid] }),
    ).resolves.toEqual([]);
    await expect(messages(SetServicesDto, { serviceIds: [] })).resolves.toEqual(
      [],
    );
  });

  it('rejects a missing list, malformed ids and duplicates', async () => {
    await expect(messages(SetServicesDto, {})).resolves.not.toEqual([]);
    await expect(
      messages(SetServicesDto, { serviceIds: ['abc'] }),
    ).resolves.toEqual(['Identificador inválido']);
    await expect(
      messages(SetServicesDto, { serviceIds: [ulid, ulid] }),
    ).resolves.toEqual(['Serviços: não repita o mesmo item']);
  });
});

describe('SetWorkingHoursDto', () => {
  const window = { weekday: 1, startTime: '09:00', endTime: '18:00' };

  it('accepts a schedule and an empty one', async () => {
    await expect(
      messages(SetWorkingHoursDto, { windows: [window] }),
    ).resolves.toEqual([]);
    await expect(
      messages(SetWorkingHoursDto, { windows: [] }),
    ).resolves.toEqual([]);
  });

  it('validates every window with readable messages', async () => {
    await expect(
      messages(SetWorkingHoursDto, { windows: [{ ...window, weekday: 8 }] }),
    ).resolves.toEqual(['Dia da semana deve ser no máximo 7']);
    await expect(
      messages(SetWorkingHoursDto, {
        windows: [{ ...window, startTime: '9:00' }],
      }),
    ).resolves.toEqual(['Horário deve estar no formato HH:MM']);
  });

  it('rejects a window with an unknown property', async () => {
    await expect(
      messages(SetWorkingHoursDto, { windows: 'x' }),
    ).resolves.not.toEqual([]);
  });
});
