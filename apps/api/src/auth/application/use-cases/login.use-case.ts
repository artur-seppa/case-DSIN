import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../../shared/security/password-hasher.js';
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
    private readonly hasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(input: LoginInput): Promise<Session> {
    const user = await this.findUserByEmail.execute(input.email);

    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await this.hasher.verify(hash, input.password);

    if (!user || !passwordMatches) {
      throw new InvalidCredentialsException();
    }
    return this.sessionIssuer.issue(user);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('timing-equalizer');
    return this.dummyHash;
  }
}
