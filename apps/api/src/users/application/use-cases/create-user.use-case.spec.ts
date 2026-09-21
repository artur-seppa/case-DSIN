import { Role } from '../../../shared/auth/role.js';
import {
  FakeClock,
  FakePasswordHasher,
  SequentialIdGenerator,
} from '../../../testing/fakes.js';
import { InMemoryUserRepository } from '../../../testing/in-memory-user.repository.js';
import { EmailAlreadyInUseException } from '../../domain/exceptions.js';
import { CreateUserUseCase } from './create-user.use-case.js';

function setup(users = new InMemoryUserRepository()) {
  const clock = new FakeClock();
  const useCase = new CreateUserUseCase(
    users,
    new FakePasswordHasher(),
    new SequentialIdGenerator(),
    clock,
  );
  return { users, clock, useCase };
}

describe('CreateUserUseCase', () => {
  it('creates a CLIENT by default and never stores the plain password', async () => {
    const { users, useCase } = setup();

    const user = await useCase.execute({
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    expect(user.role).toBe(Role.CLIENT);
    expect(user.passwordHash).toBe('hashed:senha-segura-1');
    expect(user.passwordHash).not.toBe('senha-segura-1');
    expect(user).not.toHaveProperty('password');
    expect(users.items.get(user.id)).toEqual(user);
  });

  it('takes the id from the generator and the timestamps from the clock', async () => {
    const { clock, useCase } = setup();

    const user = await useCase.execute({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    expect(user.id).toBe('00000000000000000000000001');
    expect(user.createdAt).toEqual(clock.now());
    expect(user.updatedAt).toEqual(clock.now());
  });

  it('normalizes the email (trim + lowercase) and the optional phone', async () => {
    const { useCase } = setup();

    const user = await useCase.execute({
      name: 'Maria',
      email: '  Maria@Example.COM ',
      phone: '(11) 99999-0000',
      password: 'senha-segura-1',
    });

    expect(user.email).toBe('maria@example.com');
    expect(user.phone).toBe('(11) 99999-0000');
  });

  it('can create an ADMIN when the caller asks for it (seed only)', async () => {
    const { useCase } = setup();

    const user = await useCase.execute({
      name: 'Leila',
      email: 'leila@salao.com',
      password: 'senha-segura-1',
      role: Role.ADMIN,
    });

    expect(user.role).toBe(Role.ADMIN);
  });

  it('rejects an email that is already in use, ignoring case', async () => {
    const { useCase } = setup();
    await useCase.execute({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    await expect(
      useCase.execute({
        name: 'Outra Maria',
        email: 'MARIA@example.com',
        password: 'outra-senha-1',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseException);
  });

  it('lets the repository reject a duplicate that slipped past the pre-check (race)', async () => {
    class BlindRepository extends InMemoryUserRepository {
      override findByEmail() {
        return Promise.resolve(null);
      }
    }
    const { useCase } = setup(new BlindRepository());
    await useCase.execute({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    await expect(
      useCase.execute({
        name: 'Maria de novo',
        email: 'maria@example.com',
        password: 'senha-segura-1',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseException);
  });
});
