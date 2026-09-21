import { LoginUseCase } from '../auth/application/use-cases/login.use-case.js';
import { LogoutUseCase } from '../auth/application/use-cases/logout.use-case.js';
import { RefreshSessionUseCase } from '../auth/application/use-cases/refresh-session.use-case.js';
import { RegisterUseCase } from '../auth/application/use-cases/register.use-case.js';
import { SessionIssuer } from '../auth/application/use-cases/session-issuer.js';
import { CreateUserUseCase } from '../users/application/use-cases/create-user.use-case.js';
import { FindUserByEmailUseCase } from '../users/application/use-cases/find-user-by-email.use-case.js';
import { GetUserByIdUseCase } from '../users/application/use-cases/get-user-by-id.use-case.js';
import {
  FakeAccessTokenService,
  FakeRefreshTokenCodec,
  InMemoryRefreshTokenRepository,
  testAuthSettings,
} from './auth-fakes.js';
import {
  FakeClock,
  FakePasswordHasher,
  SequentialIdGenerator,
} from './fakes.js';
import { InMemoryUserRepository } from './in-memory-user.repository.js';

export function buildAuthScenario() {
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const clock = new FakeClock();
  const ids = new SequentialIdGenerator();
  const hasher = new FakePasswordHasher();
  const codec = new FakeRefreshTokenCodec();

  const createUser = new CreateUserUseCase(users, hasher, ids, clock);
  const sessionIssuer = new SessionIssuer(
    new FakeAccessTokenService(),
    codec,
    refreshTokens,
    ids,
    clock,
    testAuthSettings,
  );

  return {
    users,
    refreshTokens,
    clock,
    createUser,
    register: new RegisterUseCase(createUser, sessionIssuer),
    login: new LoginUseCase(
      new FindUserByEmailUseCase(users),
      hasher,
      sessionIssuer,
    ),
    refresh: new RefreshSessionUseCase(
      refreshTokens,
      codec,
      new GetUserByIdUseCase(users),
      sessionIssuer,
      clock,
    ),
    logout: new LogoutUseCase(refreshTokens, codec, clock),
  };
}
