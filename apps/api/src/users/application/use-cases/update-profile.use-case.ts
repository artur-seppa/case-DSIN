import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '../../domain/user.entity.js';
import { UserRepository } from '../../domain/user.repository.js';

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<User> {
    const user = await this.users.update(userId, input);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }
}
