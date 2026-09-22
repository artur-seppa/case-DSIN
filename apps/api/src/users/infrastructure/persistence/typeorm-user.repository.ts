import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../../shared/database/unique-violation.js';
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
      .returning('*')
      .updateEntity(true)
      .execute();
    return affected ? entity : null;
  }
}
