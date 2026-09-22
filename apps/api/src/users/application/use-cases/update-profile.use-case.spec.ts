import { makeUser } from '../../../testing/factories/user.factory.js';
import { UserRepository } from '../../domain/user.repository.js';
import { UpdateProfileUseCase } from './update-profile.use-case.js';

function setup() {
  const users = { update: vi.fn<UserRepository['update']>() };
  const useCase = new UpdateProfileUseCase(users as unknown as UserRepository);
  return { users, useCase };
}

describe('UpdateProfileUseCase', () => {
  it('hands the changes to the repository and returns the updated user', async () => {
    const { users, useCase } = setup();
    const user = makeUser({ name: 'Novo Nome', phone: '+5511988887777' });
    users.update.mockResolvedValue(user);
    const changes = { name: 'Novo Nome', phone: '+5511988887777' };

    const updated = await useCase.execute(user.id, changes);

    expect(updated).toBe(user);
    expect(users.update).toHaveBeenCalledExactlyOnceWith(user.id, changes);
  });

  it('fails when the user does not exist', async () => {
    const { users, useCase } = setup();
    users.update.mockResolvedValue(null);

    await expect(useCase.execute('missing', { name: 'X' })).rejects.toThrow(
      'Usuário não encontrado',
    );
  });
});
