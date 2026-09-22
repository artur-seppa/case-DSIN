import { Injectable } from '@nestjs/common';
import { Role } from '../../../shared/auth/role.js';
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
  constructor(private readonly users: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyInUseException();
    }

    const user = Object.assign(new User(), {
      name: input.name,
      email,
      phone: input.phone ?? null,
      role: input.role ?? Role.CLIENT,
    });

    await user.setPassword(input.password);
    await this.users.insert(user);
    return user;
  }
}
