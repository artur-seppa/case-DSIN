import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/time/clock.js';
import { UserNotFoundException } from '../../domain/exceptions.js';
import type { User } from '../../domain/user.entity.js';
import { UserRepository } from '../../domain/user.repository.js';

export interface UpdateProfileInput {
  userId: string;
  name?: string;
  phone?: string | null;
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateProfileInput): Promise<User> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    user.updateProfile(
      { name: input.name?.trim(), phone: input.phone },
      this.clock.now(),
    );
    await this.users.update(user);
    return user;
  }
}
