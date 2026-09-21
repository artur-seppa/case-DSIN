import { buildAuthScenario } from '../../../testing/auth-scenario.js';
import { Role } from '../../../shared/auth/role.js';
import { EmailAlreadyInUseException } from '../../../users/domain/exceptions.js';

describe('RegisterUseCase', () => {
  it('creates a CLIENT and opens a session right away', async () => {
    const { register, users } = buildAuthScenario();

    const session = await register.execute({
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    expect(session.user.role).toBe(Role.CLIENT);
    expect(session.accessToken).toBe(`access:${session.user.id}:CLIENT`);
    expect(session.refreshToken).toBe('raw-1');
    expect(users.items.size).toBe(1);
  });

  it('stores only the hash of the refresh token and gives it a 7 day expiry', async () => {
    const { register, refreshTokens, clock } = buildAuthScenario();

    const session = await register.execute({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    const stored = [...refreshTokens.items.values()];
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).toBe('hash-of:raw-1');
    expect(stored[0]?.tokenHash).not.toBe(session.refreshToken);
    expect(stored[0]?.expiresAt).toEqual(
      new Date(clock.now().getTime() + 7 * 24 * 60 * 60_000),
    );
    expect(session.refreshTokenExpiresAt).toEqual(stored[0]?.expiresAt);
  });

  it('fails with EMAIL_ALREADY_IN_USE and does not open a session', async () => {
    const { register, refreshTokens } = buildAuthScenario();
    await register.execute({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    await expect(
      register.execute({
        name: 'Outra',
        email: 'maria@example.com',
        password: 'senha-segura-2',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseException);
    expect(refreshTokens.items.size).toBe(1);
  });
});
