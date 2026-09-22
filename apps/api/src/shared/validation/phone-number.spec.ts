import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { normalizePhone, PhoneNumberBR } from './phone-number.js';

class Sample {
  @PhoneNumberBR()
  phone: string;
}

async function run(phone: unknown) {
  const dto = plainToInstance(Sample, { phone });
  return { dto, errors: await validate(dto) };
}

describe('normalizePhone', () => {
  it.each([
    ['(11) 91234-5678', '+5511912345678'],
    ['11 91234-5678', '+5511912345678'],
    ['11912345678', '+5511912345678'],
    ['+55 11 91234-5678', '+5511912345678'],
    ['+5511912345678', '+5511912345678'],
    ['(11) 3123-4567', '+551131234567'],
    ['  (11) 91234-5678  ', '+5511912345678'],
  ])('turns %j into the international format %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('keeps an invalid number as typed (trimmed) so validation can reject it', () => {
    expect(normalizePhone('  123  ')).toBe('123');
    expect(normalizePhone('(11) 81234-5678')).toBe('(11) 81234-5678');
  });

  it('leaves null, undefined and non strings untouched', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeUndefined();
    expect(normalizePhone(11912345678)).toBe(11912345678);
  });
});

describe('PhoneNumberBR', () => {
  it('validates and stores the number in the international format', async () => {
    const { dto, errors } = await run('(11) 91234-5678');

    expect(errors).toHaveLength(0);
    expect(dto.phone).toBe('+5511912345678');
  });

  it.each([
    '123',
    'abc',
    '(11) 1234-567',
    '(11) 81234-5678',
    '+1 415 555 2671',
    '',
  ])('rejects %j in Portuguese', async (phone) => {
    const { errors } = await run(phone);

    expect(errors).toHaveLength(1);
    expect(Object.values(errors[0]?.constraints ?? {})).toEqual([
      'Número de telefone inválido',
    ]);
  });
});
