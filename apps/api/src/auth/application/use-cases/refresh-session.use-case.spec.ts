import { buildAuthScenario } from '../../../testing/auth-scenario.js';
import { InvalidRefreshTokenException } from '../../domain/exceptions.js';

async function scenarioWithSession() {
  const scenario = buildAuthScenario();
  const session = await scenario.register.execute({
    name: 'Maria',
    email: 'maria@example.com',
    password: 'senha-segura-1',
  });
  return { ...scenario, session };
}

describe('RefreshSessionUseCase', () => {
  it('rotates the token: revokes the used one and issues a new one in the same family', async () => {
    const { refresh, refreshTokens, session } = await scenarioWithSession();

    const next = await refresh.execute(session.refreshToken);

    expect(next.refreshToken).toBe('raw-2');
    expect(next.accessToken).toContain('access:');
    const [first, second] = refreshTokens.byFamily(
      [...refreshTokens.items.values()][0]!.familyId,
    );
    expect(first?.revokedAt).not.toBeNull();
    expect(second?.revokedAt).toBeNull();
  });

  it('keeps the chain usable: the rotated token can be refreshed again', async () => {
    const { refresh, session } = await scenarioWithSession();

    const second = await refresh.execute(session.refreshToken);
    const third = await refresh.execute(second.refreshToken);

    expect(third.refreshToken).toBe('raw-3');
  });

  it('rejects a token that does not exist', async () => {
    const { refresh } = await scenarioWithSession();

    await expect(refresh.execute('never-issued')).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it('rejects an expired token', async () => {
    const { refresh, clock, session } = await scenarioWithSession();

    clock.advanceMinutes(7 * 24 * 60 + 1);

    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it('treats a reused token as theft: revokes the whole family, including the newest token', async () => {
    const { refresh, refreshTokens, session } = await scenarioWithSession();
    const familyId = [...refreshTokens.items.values()][0]!.familyId;
    const rotated = await refresh.execute(session.refreshToken);

    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );

    expect(refreshTokens.byFamily(familyId).every((t) => t.revokedAt)).toBe(
      true,
    );
    await expect(refresh.execute(rotated.refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it('does not touch the other sessions (families) of the same user', async () => {
    const { refresh, login, refreshTokens, session } =
      await scenarioWithSession();
    const otherDevice = await login.execute({
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });
    await refresh.execute(session.refreshToken);
    await refresh.execute(session.refreshToken).catch(() => undefined);

    const stillActive = [...refreshTokens.items.values()].find(
      (token) => token.tokenHash === `hash-of:${otherDevice.refreshToken}`,
    );
    expect(stillActive?.revokedAt).toBeNull();
    await expect(
      refresh.execute(otherDevice.refreshToken),
    ).resolves.toBeDefined();
  });

  it('only one of two simultaneous refreshes with the same token wins', async () => {
    const { refresh, session } = await scenarioWithSession();

    const results = await Promise.allSettled([
      refresh.execute(session.refreshToken),
      refresh.execute(session.refreshToken),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });
});
