import { Injectable } from '@nestjs/common';
import { Role } from '../../../shared/auth/role.js';
import { IdGenerator } from '../../../shared/id/id-generator.js';
import { PasswordHasher } from '../../../shared/security/password-hasher.js';
import { Clock } from '../../../shared/time/clock.js';
import { EmailAlreadyInUseException } from '../../domain/exceptions.js';
import { User } from '../../domain/user.entity.js';
import { UserRepository } from '../../domain/user.repository.js';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  role?: Role;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyInUseException();
    }

    const now = this.clock.now();
    const user = Object.assign(new User(), {
      id: this.ids.generate(),
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      passwordHash: await this.hasher.hash(input.password),
      role: input.role ?? Role.CLIENT,
      createdAt: now,
      updatedAt: now,
    });

    await this.users.insert(user);
    return user;
  }
}
