import { Injectable } from '@nestjs/common';
import { CreateUserUseCase } from '../../../users/application/use-cases/create-user.use-case.js';
import { SessionIssuer, type Session } from './session-issuer.js';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(input: RegisterInput): Promise<Session> {
    const user = await this.createUser.execute(input);
    return this.sessionIssuer.issue(user);
  }
}
