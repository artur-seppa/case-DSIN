import { Role } from '../../../shared/auth/role.js';
import { Clock } from '../../../shared/time/clock.js';
import { makeUser } from '../../../testing/factories/user.factory.js';
import { RefreshTokenRepository } from '../../domain/refresh-token.repository.js';
import { AccessTokenService } from '../ports/access-token.service.js';
import { RefreshTokenCodec } from '../ports/refresh-token.codec.js';
import { SessionIssuer } from './session-issuer.js';

const now = new Date('2026-09-21T12:00:00.000Z');

function setup() {
  const accessTokens = {
    sign: vi
      .fn<AccessTokenService['sign']>()
      .mockResolvedValue('signed-access-token'),
  };
  const codec = {
    generate: vi
      .fn<RefreshTokenCodec['generate']>()
      .mockReturnValue({ token: 'raw-token', hash: 'hash-of-raw' }),
  };
  const refreshTokens = {
    insert: vi
      .fn<RefreshTokenRepository['insert']>()
      .mockResolvedValue(undefined),
  };
  const clock = { now: vi.fn<Clock['now']>().mockReturnValue(now) };
  const issuer = new SessionIssuer(
    accessTokens as unknown as AccessTokenService,
    codec as unknown as RefreshTokenCodec,
    refreshTokens as unknown as RefreshTokenRepository,
    clock as unknown as Clock,
    { accessTokenTtlMinutes: 15, refreshTokenTtlDays: 7 },
  );
  return { accessTokens, refreshTokens, issuer };
}

describe('SessionIssuer', () => {
  it('signs an access token for the user and returns the raw refresh token', async () => {
    const { accessTokens, issuer } = setup();
    const user = makeUser({ role: Role.ADMIN });

    const session = await issuer.issue(user);

    expect(session).toMatchObject({
      user,
      accessToken: 'signed-access-token',
      refreshToken: 'raw-token',
    });
    expect(accessTokens.sign).toHaveBeenCalledWith({
      id: user.id,
      role: Role.ADMIN,
    });
  });

  it('stores only the hash of the refresh token and gives it the configured expiry', async () => {
    const { refreshTokens, issuer } = setup();
    const user = makeUser();

    const session = await issuer.issue(user);

    const [stored] = refreshTokens.insert.mock.calls[0]!;
    expect(stored).toMatchObject({
      userId: user.id,
      tokenHash: 'hash-of-raw',
      revokedAt: null,
    });
    expect(stored.tokenHash).not.toBe(session.refreshToken);
    expect(stored.expiresAt).toEqual(
      new Date(now.getTime() + 7 * 24 * 60 * 60_000),
    );
    expect(session.refreshTokenExpiresAt).toEqual(stored.expiresAt);
  });

  it('starts a new family unless one is given', async () => {
    const { refreshTokens, issuer } = setup();
    const user = makeUser();

    await issuer.issue(user);
    await issuer.issue(user);
    await issuer.issue(user, 'EXISTING-FAMILY');

    const families = refreshTokens.insert.mock.calls.map(([t]) => t.familyId);
    expect(new Set(families.slice(0, 2)).size).toBe(2);
    expect(families[2]).toBe('EXISTING-FAMILY');
  });
});
