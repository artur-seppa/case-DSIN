import { makeUser } from '../../../testing/factories/user.factory.js';
import { UserRepository } from '../../domain/user.repository.js';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case.js';
import { GetUserByIdUseCase } from './get-user-by-id.use-case.js';

describe('GetUserByIdUseCase', () => {
  const users = { findById: vi.fn<UserRepository['findById']>() };
  const useCase = new GetUserByIdUseCase(users as unknown as UserRepository);

  it('returns the user', async () => {
    const user = makeUser();
    users.findById.mockResolvedValue(user);

    await expect(useCase.execute(user.id)).resolves.toBe(user);
    expect(users.findById).toHaveBeenCalledWith(user.id);
  });

  it('fails when the user does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(
      'Usuário não encontrado',
    );
  });
});

describe('FindUserByEmailUseCase', () => {
  const users = { findByEmail: vi.fn<UserRepository['findByEmail']>() };
  const useCase = new FindUserByEmailUseCase(
    users as unknown as UserRepository,
  );

  it('looks up the email trimmed and lowercased', async () => {
    const user = makeUser({ email: 'maria@example.com' });
    users.findByEmail.mockResolvedValue(user);

    const found = await useCase.execute('  MARIA@example.com ');

    expect(found).toBe(user);
    expect(users.findByEmail).toHaveBeenCalledWith('maria@example.com');
  });

  it('returns null when there is no such user', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute('ninguem@example.com')).resolves.toBeNull();
  });
});
