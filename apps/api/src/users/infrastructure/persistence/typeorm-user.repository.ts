import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../../shared/database/unique-violation.js';
import { Role } from '../../../shared/auth/role.js';
import { EmailAlreadyInUseException } from '../../domain/exceptions.js';
import { User } from '../../domain/user.entity.js';
import { UserRepository } from '../../domain/user.repository.js';

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
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
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

  async update(
    id: string,
    changes: Partial<Pick<User, 'name' | 'phone'>>,
  ): Promise<User | null> {
    const entity = Object.assign(new User(), { id });
    const { affected } = await this.repository
      .createQueryBuilder()
      .update()
      .set(changes)
      .whereEntity(entity)
      .returning(['id', 'name', 'email', 'phone', 'role', 'createdAt', 'updatedAt'])
      .updateEntity(true)
      .execute();
    return affected ? entity : null;
  }

  async searchClientIds(query: string): Promise<string[]> {
    const users = await this.repository
      .createQueryBuilder('user')
      .select('user.id')
      .where('user.role = :role', { role: Role.CLIENT })
      .andWhere('(user.name ILIKE :query OR user.email ILIKE :query)', {
        query: `%${escapeLikePattern(query)}%`,
      })
      .getMany();
    return users.map((user) => user.id);
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
