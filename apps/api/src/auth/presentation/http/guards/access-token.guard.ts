import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../../../shared/auth/authenticated-user.js';
import { Public } from '../../../../shared/auth/decorators.js';
import { AccessTokenService } from '../../../application/ports/access-token.service.js';
import { ACCESS_COOKIE } from '../cookies.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride(Public, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[ACCESS_COOKIE];
    const user = token ? await this.accessTokens.verify(token) : null;
    if (!user) {
      throw new UnauthorizedException('Não autenticado');
    }

    request.user = user;
    return true;
  }
}
