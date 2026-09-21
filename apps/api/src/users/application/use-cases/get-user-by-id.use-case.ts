import { Injectable } from '@nestjs/common';
import { UserNotFoundException } from '../../domain/exceptions.js';
import type { User } from '../../domain/user.entity.js';
import { UserRepository } from '../../domain/user.repository.js';

@Injectable()
export class GetUserByIdUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    return user;
  }
}
