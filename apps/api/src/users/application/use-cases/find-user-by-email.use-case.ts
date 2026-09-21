import { Injectable } from '@nestjs/common';
import type { User } from '../../domain/user.entity.js';
import { UserRepository } from '../../domain/user.repository.js';

@Injectable()
export class FindUserByEmailUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(email: string): Promise<User | null> {
    return this.users.findByEmail(email.trim().toLowerCase());
  }
}
