import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenService } from '../../../application/ports/access-token.service.js';
import type { AuthenticatedRequest } from '../../../../shared/auth/authenticated-user.js';
import { Public, Roles } from '../../../../shared/auth/decorators.js';
import { Role } from '../../../../shared/auth/role.js';
import { ACCESS_COOKIE } from '../cookies.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { RolesGuard } from './roles.guard.js';

class SampleController {
  @Public()
  open() {}

  closed() {}

  @Roles([Role.ADMIN])
  adminOnly() {}

  @Roles([Role.CLIENT, Role.ADMIN])
  anyone() {}
}

function contextFor(
  handlerName: keyof SampleController,
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  const handler = Object.getOwnPropertyDescriptor(
    SampleController.prototype,
    handlerName,
  )?.value as () => void;

  return {
    getHandler: () => handler,
    getClass: () => SampleController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const reflector = new Reflector();

describe('AccessTokenGuard', () => {
  const accessTokens = {
    verify: vi
      .fn<AccessTokenService['verify']>()
      .mockImplementation((token) =>
        Promise.resolve(
          token === 'valid-admin-token'
            ? { id: 'USER1', role: Role.ADMIN }
            : null,
        ),
      ),
  };
  const guard = new AccessTokenGuard(
    reflector,
    accessTokens as unknown as AccessTokenService,
  );

  it('lets @Public() routes through without any token', async () => {
    const request = { cookies: {} };

    await expect(guard.canActivate(contextFor('open', request))).resolves.toBe(
      true,
    );
  });

  it('rejects a protected route when the access cookie is missing', async () => {
    await expect(
      guard.canActivate(contextFor('closed', { cookies: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid token', async () => {
    const request = { cookies: { [ACCESS_COOKIE]: 'garbage' } };

    await expect(
      guard.canActivate(contextFor('closed', request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid token and attaches the user to the request', async () => {
    const request: Partial<AuthenticatedRequest> = {
      cookies: { [ACCESS_COOKIE]: 'valid-admin-token' },
    };

    await expect(
      guard.canActivate(contextFor('closed', request)),
    ).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'USER1', role: Role.ADMIN });
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(reflector);

  it('allows any authenticated user when the route declares no roles', () => {
    const request = { user: { id: 'U', role: Role.CLIENT } };

    expect(guard.canActivate(contextFor('closed', request))).toBe(true);
  });

  it('allows a role that is listed', () => {
    const request = { user: { id: 'U', role: Role.CLIENT } };

    expect(guard.canActivate(contextFor('anyone', request))).toBe(true);
  });

  it('forbids a role that is not listed', () => {
    const request = { user: { id: 'U', role: Role.CLIENT } };

    expect(() => guard.canActivate(contextFor('adminOnly', request))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids a role-restricted route when there is no user', () => {
    expect(() => guard.canActivate(contextFor('adminOnly', {}))).toThrow(
      ForbiddenException,
    );
  });
});
