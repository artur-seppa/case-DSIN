import { NodeEnv, validateEnv } from './env.validation.js';

const validEnv = {
  DATABASE_URL: 'postgresql://DSIN:DSIN@localhost:5432/DSIN',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  COOKIE_SECRET: 'b'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a minimal environment and applies the defaults', () => {
    const env = validateEnv(validEnv);

    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.ACCESS_TOKEN_TTL_MINUTES).toBe(15);
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(7);
  });

  it('coerces PORT from string to number', () => {
    const env = validateEnv({ ...validEnv, PORT: '4000' });

    expect(env.PORT).toBe(4000);
  });

  it('parses COOKIE_SECURE as a real boolean (the string "false" is false)', () => {
    expect(
      validateEnv({ ...validEnv, COOKIE_SECURE: 'true' }).COOKIE_SECURE,
    ).toBe(true);
    expect(
      validateEnv({ ...validEnv, COOKIE_SECURE: 'false' }).COOKIE_SECURE,
    ).toBe(false);
  });

  it('fails at boot when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _omitted, ...rest } = validEnv;

    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('rejects a DATABASE_URL that is not a postgres url', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        DATABASE_URL: 'mysql://localhost:3306/DSIN',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects a PORT outside the valid range', () => {
    expect(() => validateEnv({ ...validEnv, PORT: '70000' })).toThrow(/PORT/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it.each(['JWT_ACCESS_SECRET', 'COOKIE_SECRET'])(
    'requires %s to have at least 32 characters',
    (name) => {
      expect(() => validateEnv({ ...validEnv, [name]: 'curto' })).toThrow(
        new RegExp(name),
      );
    },
  );
});
