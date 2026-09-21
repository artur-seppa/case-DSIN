import { makeUser } from '../../../testing/factories.js';
import { InMemoryUserRepository } from '../../../testing/in-memory-user.repository.js';
import { UserNotFoundException } from '../../domain/exceptions.js';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case.js';
import { GetUserByIdUseCase } from './get-user-by-id.use-case.js';

describe('GetUserByIdUseCase', () => {
  it('returns the user', async () => {
    const users = new InMemoryUserRepository();
    const user = makeUser();
    await users.insert(user);

    await expect(
      new GetUserByIdUseCase(users).execute(user.id),
    ).resolves.toMatchObject({ id: user.id });
  });

  it('fails when the user does not exist', async () => {
    const useCase = new GetUserByIdUseCase(new InMemoryUserRepository());

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });
});

describe('FindUserByEmailUseCase', () => {
  it('finds by email ignoring case and surrounding spaces', async () => {
    const users = new InMemoryUserRepository();
    await users.insert(makeUser({ email: 'maria@example.com' }));

    await expect(
      new FindUserByEmailUseCase(users).execute('  MARIA@example.com '),
    ).resolves.toMatchObject({ email: 'maria@example.com' });
  });

  it('returns null when there is no such user', async () => {
    const useCase = new FindUserByEmailUseCase(new InMemoryUserRepository());

    await expect(useCase.execute('ninguem@example.com')).resolves.toBeNull();
  });
});
