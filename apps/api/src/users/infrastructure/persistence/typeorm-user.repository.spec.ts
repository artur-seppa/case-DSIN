import { QueryFailedError, type Repository } from 'typeorm';
import { makeUser } from '../../../testing/factories.js';
import { EmailAlreadyInUseException } from '../../domain/exceptions.js';
import type { User } from '../../domain/user.entity.js';
import { TypeOrmUserRepository } from './typeorm-user.repository.js';

function repositoryFailingWith(error: Error) {
  const orm = { insert: () => Promise.reject(error) };
  return new TypeOrmUserRepository(orm as unknown as Repository<User>);
}

function driverError(code: string) {
  return new QueryFailedError(
    'INSERT INTO users',
    [],
    Object.assign(new Error('driver failure'), { code }),
  );
}

describe('TypeOrmUserRepository.insert', () => {
  it('maps a unique index violation (23505) to EMAIL_ALREADY_IN_USE', async () => {
    const repository = repositoryFailingWith(driverError('23505'));

    await expect(repository.insert(makeUser())).rejects.toBeInstanceOf(
      EmailAlreadyInUseException,
    );
  });

  it('does not disguise other database errors', async () => {
    const failure = driverError('57P01');
    const repository = repositoryFailingWith(failure);

    await expect(repository.insert(makeUser())).rejects.toBe(failure);
  });
});
