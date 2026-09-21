import { buildAuthScenario } from '../../../testing/auth-scenario.js';
import { InvalidCredentialsException } from '../../domain/exceptions.js';

async function scenarioWithUser() {
  const scenario = buildAuthScenario();
  await scenario.createUser.execute({
    name: 'Maria',
    email: 'maria@example.com',
    password: 'senha-segura-1',
  });
  return scenario;
}

describe('LoginUseCase', () => {
  it('opens a session for valid credentials', async () => {
    const { login } = await scenarioWithUser();

    const session = await login.execute({
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    expect(session.user.email).toBe('maria@example.com');
    expect(session.accessToken).toContain('access:');
    expect(session.refreshToken).toBe('raw-1');
  });

  it('matches the email ignoring case and surrounding spaces', async () => {
    const { login } = await scenarioWithUser();

    await expect(
      login.execute({
        email: '  MARIA@Example.com ',
        password: 'senha-segura-1',
      }),
    ).resolves.toBeDefined();
  });

  it('starts a new token family on every login', async () => {
    const { login, refreshTokens } = await scenarioWithUser();

    await login.execute({
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });
    await login.execute({
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    const families = new Set(
      [...refreshTokens.items.values()].map((token) => token.familyId),
    );
    expect(families.size).toBe(2);
  });

  it('rejects a wrong password without opening a session', async () => {
    const { login, refreshTokens } = await scenarioWithUser();

    await expect(
      login.execute({ email: 'maria@example.com', password: 'errada' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(refreshTokens.items.size).toBe(0);
  });

  it('answers an unknown email exactly like a wrong password (no user enumeration)', async () => {
    const { login } = await scenarioWithUser();

    const wrongPassword = await login
      .execute({ email: 'maria@example.com', password: 'errada' })
      .catch((error: InvalidCredentialsException) => error);
    const unknownEmail = await login
      .execute({ email: 'ninguem@example.com', password: 'qualquer' })
      .catch((error: InvalidCredentialsException) => error);

    expect(unknownEmail).toBeInstanceOf(InvalidCredentialsException);
    expect((unknownEmail as InvalidCredentialsException).getResponse()).toEqual(
      (wrongPassword as InvalidCredentialsException).getResponse(),
    );
  });
});
