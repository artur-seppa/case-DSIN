import { makeUser } from '../../../testing/factories/user.factory.js';
import { CreateUserUseCase } from '../../../users/application/use-cases/create-user.use-case.js';
import { EmailAlreadyInUseException } from '../../../users/domain/exceptions.js';
import { RegisterUseCase } from './register.use-case.js';
import { SessionIssuer, type Session } from './session-issuer.js';

function setup() {
  const createUser = {
    execute: vi.fn<CreateUserUseCase['execute']>(),
  };
  const sessionIssuer = {
    issue: vi.fn<SessionIssuer['issue']>(),
  };
  const useCase = new RegisterUseCase(
    createUser as unknown as CreateUserUseCase,
    sessionIssuer as unknown as SessionIssuer,
  );
  return { createUser, sessionIssuer, useCase };
}

describe('RegisterUseCase', () => {
  it('creates the user and opens a session for it right away', async () => {
    const { createUser, sessionIssuer, useCase } = setup();
    const user = makeUser();
    const session = { user } as Session;
    createUser.execute.mockResolvedValue(user);
    sessionIssuer.issue.mockResolvedValue(session);
    const input = {
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    };

    const result = await useCase.execute(input);

    expect(result).toBe(session);
    expect(createUser.execute).toHaveBeenCalledWith(input);
    expect(sessionIssuer.issue).toHaveBeenCalledWith(user);
  });

  it('does not open a session when the e-mail is already in use', async () => {
    const { createUser, sessionIssuer, useCase } = setup();
    createUser.execute.mockRejectedValue(new EmailAlreadyInUseException());

    await expect(
      useCase.execute({
        name: 'Outra',
        email: 'maria@example.com',
        password: 'senha-segura-2',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseException);
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });
});
