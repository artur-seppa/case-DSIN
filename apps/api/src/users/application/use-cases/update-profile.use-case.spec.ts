import { FakeClock } from '../../../testing/fakes.js';
import { makeUser } from '../../../testing/factories.js';
import { InMemoryUserRepository } from '../../../testing/in-memory-user.repository.js';
import { UserNotFoundException } from '../../domain/exceptions.js';
import { UpdateProfileUseCase } from './update-profile.use-case.js';

function setup() {
  const users = new InMemoryUserRepository();
  const clock = new FakeClock();
  const useCase = new UpdateProfileUseCase(users, clock);
  return { users, clock, useCase };
}

describe('UpdateProfileUseCase', () => {
  it('updates name and phone and refreshes updatedAt', async () => {
    const { users, clock, useCase } = setup();
    const user = makeUser({ name: 'Antigo', phone: null });
    await users.insert(user);

    const updated = await useCase.execute({
      userId: user.id,
      name: 'Novo Nome',
      phone: '(11) 98888-7777',
    });

    expect(updated.name).toBe('Novo Nome');
    expect(updated.phone).toBe('(11) 98888-7777');
    expect(updated.updatedAt).toEqual(clock.now());
    expect(users.items.get(user.id)?.name).toBe('Novo Nome');
  });

  it('keeps the fields that were not informed', async () => {
    const { users, useCase } = setup();
    const user = makeUser({ name: 'Maria', phone: '123' });
    await users.insert(user);

    const updated = await useCase.execute({
      userId: user.id,
      name: 'Maria S.',
    });

    expect(updated.name).toBe('Maria S.');
    expect(updated.phone).toBe('123');
  });

  it('clears the phone when null is informed', async () => {
    const { users, useCase } = setup();
    const user = makeUser({ phone: '123' });
    await users.insert(user);

    const updated = await useCase.execute({ userId: user.id, phone: null });

    expect(updated.phone).toBeNull();
  });

  it('never changes email, role or password hash', async () => {
    const { users, useCase } = setup();
    const user = makeUser();
    await users.insert(user);
    const before = {
      email: user.email,
      role: user.role,
      hash: user.passwordHash,
    };

    const updated = await useCase.execute({ userId: user.id, name: 'Outro' });

    expect({
      email: updated.email,
      role: updated.role,
      hash: updated.passwordHash,
    }).toEqual(before);
  });

  it('fails when the user does not exist', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId: 'missing', name: 'X' }),
    ).rejects.toBeInstanceOf(UserNotFoundException);
  });
});
