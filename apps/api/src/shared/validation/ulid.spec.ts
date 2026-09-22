import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ULID_PATTERN, IsUlid } from './ulid.js';

class Sample {
  @IsUlid()
  id: string;

  @IsUlid({ each: true })
  ids: string[];
}

describe('ULID_PATTERN', () => {
  it.each(['01M30K8EVJW30BGBPJX78A3GHM', '00000000000000000000000001'])(
    'accepts %s',
    (value) => {
      expect(ULID_PATTERN.test(value)).toBe(true);
    },
  );

  it.each([
    '',
    '01m30k8evjw30bgbpjx78a3ghm',
    '01M30K8EVJW30BGBPJX78A3GH',
    '01M30K8EVJW30BGBPJX78A3GHMM',
    '01M30K8EVJW30BGBPJX78A3GHI',
    '01M30K8EVJW30BGBPJX78A3GHU',
    'not-a-ulid',
  ])('rejects %j', (value) => {
    expect(ULID_PATTERN.test(value)).toBe(false);
  });
});

describe('IsUlid', () => {
  const valid = '01M30K8EVJW30BGBPJX78A3GHM';

  it('accepts a ulid, alone or in a list', async () => {
    const dto = plainToInstance(Sample, { id: valid, ids: [valid] });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an invalid id with a Portuguese message', async () => {
    const errors = await validate(
      plainToInstance(Sample, { id: 'abc', ids: [valid, 'xyz'] }),
    );

    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    expect(messages).toEqual([
      'Identificador inválido',
      'Identificador inválido',
    ]);
  });
});
