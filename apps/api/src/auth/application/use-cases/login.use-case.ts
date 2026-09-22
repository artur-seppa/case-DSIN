import { Injectable } from '@nestjs/common';
import {
  hashPassword,
  verifyPassword,
} from '../../../shared/security/password.js';
import { FindUserByEmailUseCase } from '../../../users/application/use-cases/find-user-by-email.use-case.js';
import { InvalidCredentialsException } from '../../domain/exceptions.js';
import { SessionIssuer, type Session } from './session-issuer.js';

export interface LoginInput {
  email: string;
  password: string;
}

@Injectable()
export class LoginUseCase {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly findUserByEmail: FindUserByEmailUseCase,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(input: LoginInput): Promise<Session> {
    const user = await this.findUserByEmail.execute(input.email);

    const passwordMatches = user
      ? await user.verifyPassword(input.password)
      : await verifyPassword(await this.getDummyHash(), input.password);

    if (!user || !passwordMatches) {
      throw new InvalidCredentialsException();
    }
    return this.sessionIssuer.issue(user);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hashPassword('timing-equalizer');
    return this.dummyHash;
  }
}
