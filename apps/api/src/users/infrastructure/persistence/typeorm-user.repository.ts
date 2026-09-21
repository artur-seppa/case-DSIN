import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { EmailAlreadyInUseException } from '../../domain/exceptions.js';
import { User } from '../../domain/user.entity.js';
import { UserRepository } from '../../domain/user.repository.js';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class TypeOrmUserRepository extends UserRepository {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {
    super();
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email });
  }

  async insert(user: User): Promise<void> {
    try {
      await this.repository.insert(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyInUseException();
      }
      throw error;
    }
  }

  async update(user: User): Promise<void> {
    await this.repository.update(
      { id: user.id },
      { name: user.name, phone: user.phone, updatedAt: user.updatedAt },
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code ===
      UNIQUE_VIOLATION
  );
}
