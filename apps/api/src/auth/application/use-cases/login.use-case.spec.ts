import {
  DEFAULT_PASSWORD,
  makeUser,
} from '../../../testing/factories/user.factory.js';
import { FindUserByEmailUseCase } from '../../../users/application/use-cases/find-user-by-email.use-case.js';
import { InvalidCredentialsException } from '../../domain/exceptions.js';
import { LoginUseCase } from './login.use-case.js';
import { SessionIssuer, type Session } from './session-issuer.js';

function setup() {
  const user = makeUser();
  const findUserByEmail = {
    execute: vi.fn<FindUserByEmailUseCase['execute']>().mockResolvedValue(user),
  };
  const sessionIssuer = {
    issue: vi
      .fn<SessionIssuer['issue']>()
      .mockResolvedValue({ user } as Session),
  };
  const useCase = new LoginUseCase(
    findUserByEmail as unknown as FindUserByEmailUseCase,
    sessionIssuer as unknown as SessionIssuer,
  );
  return { findUserByEmail, sessionIssuer, user, useCase };
}

describe('LoginUseCase', () => {
  it('opens a session for valid credentials', async () => {
    const { sessionIssuer, user, useCase } = setup();

    const session = await useCase.execute({
      email: user.email,
      password: DEFAULT_PASSWORD,
    });

    expect(session.user).toBe(user);
    expect(sessionIssuer.issue).toHaveBeenCalledWith(user);
  });

  it('rejects a wrong password without opening a session', async () => {
    const { sessionIssuer, user, useCase } = setup();

    await expect(
      useCase.execute({ email: user.email, password: 'errada' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('answers an unknown email exactly like a wrong password (no user enumeration)', async () => {
    const { findUserByEmail, user, useCase } = setup();
    const wrongPassword = await useCase
      .execute({ email: user.email, password: 'errada' })
      .catch((error: InvalidCredentialsException) => error);
    findUserByEmail.execute.mockResolvedValue(null);

    const unknownEmail = await useCase
      .execute({ email: 'ninguem@example.com', password: 'qualquer' })
      .catch((error: InvalidCredentialsException) => error);

    expect(unknownEmail).toBeInstanceOf(InvalidCredentialsException);
    expect((unknownEmail as InvalidCredentialsException).getResponse()).toEqual(
      (wrongPassword as InvalidCredentialsException).getResponse(),
    );
  });
});
