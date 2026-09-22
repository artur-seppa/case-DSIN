import { Role } from '../../../shared/auth/role.js';
import { makeUser } from '../../../testing/factories/user.factory.js';
import { EmailAlreadyInUseException } from '../../domain/exceptions.js';
import { UserRepository } from '../../domain/user.repository.js';
import { CreateUserUseCase } from './create-user.use-case.js';

function setup() {
  const users = {
    findByEmail: vi.fn<UserRepository['findByEmail']>().mockResolvedValue(null),
    insert: vi.fn<UserRepository['insert']>().mockResolvedValue(undefined),
  };
  const useCase = new CreateUserUseCase(users as unknown as UserRepository);
  return { users, useCase };
}

describe('CreateUserUseCase', () => {
  it('creates a CLIENT by default and stores only the hash of the password', async () => {
    const { users, useCase } = setup();

    const user = await useCase.execute({
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'senha-segura-1',
    });

    expect(user.role).toBe(Role.CLIENT);
    expect(user.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(user.passwordHash).not.toBe('senha-segura-1');
    await expect(user.verifyPassword('senha-segura-1')).resolves.toBe(true);
    await expect(user.verifyPassword('outra-senha')).resolves.toBe(false);
    expect(user).not.toHaveProperty('password');
    expect(users.insert).toHaveBeenCalledExactlyOnceWith(user);
  });

  it('normalizes the email (trim + lowercase) and keeps the phone as given', async () => {
    const { users, useCase } = setup();

    const user = await useCase.execute({
      name: 'Maria',
      email: '  Maria@Example.COM ',
      phone: '+5511999990000',
      password: 'senha-segura-1',
    });

    expect(user.email).toBe('maria@example.com');
    expect(user.phone).toBe('+5511999990000');
    expect(users.findByEmail).toHaveBeenCalledWith('maria@example.com');
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

  it('rejects an email that is already in use without inserting', async () => {
    const { users, useCase } = setup();
    users.findByEmail.mockResolvedValue(makeUser());

    await expect(
      useCase.execute({
        name: 'Outra Maria',
        email: 'maria@example.com',
        password: 'outra-senha-1',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseException);
    expect(users.insert).not.toHaveBeenCalled();
  });

  it('lets the repository reject a duplicate that slipped past the pre-check (race)', async () => {
    const { users, useCase } = setup();
    users.insert.mockRejectedValue(new EmailAlreadyInUseException());

    await expect(
      useCase.execute({
        name: 'Maria',
        email: 'maria@example.com',
        password: 'senha-segura-1',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseException);
  });
});
