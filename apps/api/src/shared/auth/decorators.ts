import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './authenticated-user.js';
import type { Role } from './role.js';

export const Public = Reflector.createDecorator<void, boolean>({
  transform: () => true,
});

export const Roles = Reflector.createDecorator<Role[]>();

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without authentication');
    }
    return request.user;
  },
);
