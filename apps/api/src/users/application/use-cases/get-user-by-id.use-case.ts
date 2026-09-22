import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '../../domain/user.entity.js';
import { UserRepository } from '../../domain/user.repository.js';

@Injectable()
export class GetUserByIdUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }
}
