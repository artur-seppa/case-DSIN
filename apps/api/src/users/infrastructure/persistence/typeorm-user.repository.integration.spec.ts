import {
  createUser,
  makeUser,
} from '../../../testing/factories/user.factory.js';
import { useTestDatabase } from '../../../testing/integration/database.js';
import { EmailAlreadyInUseException } from '../../domain/exceptions.js';
import { User } from '../../domain/user.entity.js';
import { TypeOrmUserRepository } from './typeorm-user.repository.js';

describe('TypeOrmUserRepository', () => {
  const db = useTestDatabase();
  let repository: TypeOrmUserRepository;

  beforeEach(() => {
    repository = new TypeOrmUserRepository(db.dataSource.getRepository(User));
  });

  it('persists a user and finds it by id', async () => {
    const user = makeUser();

    await repository.insert(user);

    const found = await repository.findById(user.id);
    expect(found).toMatchObject({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    expect(found?.createdAt.getTime()).toBe(user.createdAt.getTime());
  });

  it('returns null for an unknown id', async () => {
    expect(await repository.findById(makeUser().id)).toBeNull();
  });

  it('finds by e-mail ignoring case', async () => {
    const user = await createUser(db.dataSource.manager, {
      email: 'Maria.Silva@Example.com',
    });

    const found = await repository.findByEmail('maria.silva@example.com');

    expect(found?.id).toBe(user.id);
  });

  it('rejects a duplicated e-mail, even with different casing', async () => {
    await createUser(db.dataSource.manager, { email: 'ana@example.com' });

    await expect(
      repository.insert(makeUser({ email: 'ANA@example.com' })),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseException);
  });

  it('updates the given fields and returns the updated user', async () => {
    const user = await createUser(db.dataSource.manager, { phone: null });

    const updated = await repository.update(user.id, {
      name: 'Novo Nome',
      phone: '+5511912345678',
    });

    expect(updated).toMatchObject({
      id: user.id,
      name: 'Novo Nome',
      phone: '+5511912345678',
      email: user.email,
    });
  });

  it('leaves untouched the fields that were not informed and clears with null', async () => {
    const user = await createUser(db.dataSource.manager, {
      name: 'Maria',
      phone: '+5511900000000',
    });

    const renamed = await repository.update(user.id, {
      name: 'Maria S.',
      phone: undefined,
    });
    const cleared = await repository.update(user.id, { phone: null });

    expect(renamed).toMatchObject({
      name: 'Maria S.',
      phone: '+5511900000000',
    });
    expect(cleared).toMatchObject({ name: 'Maria S.', phone: null });
  });

  it('accepts an empty set of changes', async () => {
    const user = await createUser(db.dataSource.manager);

    await expect(repository.update(user.id, {})).resolves.toMatchObject({
      id: user.id,
      name: user.name,
    });
  });

  it('returns null when the user does not exist', async () => {
    await expect(
      repository.update(makeUser().id, { name: 'X' }),
    ).resolves.toBeNull();
  });

  it('fills createdAt and updatedAt on insert without the application setting them', async () => {
    const user = makeUser({ createdAt: undefined, updatedAt: undefined });

    await repository.insert(user);

    const found = await repository.findById(user.id);
    const oneMinuteAgo = Date.now() - 60_000;
    expect(found?.createdAt.getTime()).toBeGreaterThan(oneMinuteAgo);
    expect(found?.updatedAt.getTime()).toBeGreaterThan(oneMinuteAgo);
  });

  it('refreshes updatedAt on update and leaves createdAt alone', async () => {
    const user = await createUser(db.dataSource.manager, {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const updated = await repository.update(user.id, { name: 'Novo Nome' });

    expect(updated?.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('searches clients by a name/e-mail substring', async () => {
    const match = await createUser(db.dataSource.manager, { name: 'Maria Silva' });
    await createUser(db.dataSource.manager, { name: 'João Souza' });

    const ids = await repository.searchClientIds('maria');

    expect(ids).toEqual([match.id]);
  });

  it('treats an underscore in the search term as a literal character, not a LIKE wildcard', async () => {
    // Unescaped, "a_a" would match "ana" (any single char between the a's).
    const other = await createUser(db.dataSource.manager, { name: 'Ana Beatriz' });

    const ids = await repository.searchClientIds('a_a');

    expect(ids).toEqual([]);
    expect(ids).not.toContain(other.id);
  });
});
