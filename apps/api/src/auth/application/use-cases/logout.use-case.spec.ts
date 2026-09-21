import { buildAuthScenario } from '../../../testing/auth-scenario.js';
import { InvalidRefreshTokenException } from '../../domain/exceptions.js';

describe('LogoutUseCase', () => {
  it('revokes the refresh token so it can no longer open sessions', async () => {
    const { register, logout, refresh } = buildAuthScenario();
    const session = await register.execute({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    await logout.execute(session.refreshToken);

    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it('is idempotent and silent for an unknown or missing token', async () => {
    const { logout } = buildAuthScenario();

    await expect(logout.execute('never-issued')).resolves.toBeUndefined();
    await expect(logout.execute(undefined)).resolves.toBeUndefined();
  });
});
