import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { CsrfResponse } from '../../auth/presentation/http/dto/csrf.response.js';
import { makeUser } from '../../testing/factories.js';
import { UserResponse } from '../../users/presentation/http/dto/user.response.js';
import { createSerializerInterceptor } from './serializer.js';

async function serialize(value: unknown): Promise<unknown> {
  const interceptor = createSerializerInterceptor(new Reflector());
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
  const next: CallHandler = { handle: () => of(value) };

  return lastValueFrom(await interceptor.intercept(context, next));
}

describe('response serializer', () => {
  it('turns a domain entity returned by mistake into an empty object instead of leaking it', async () => {
    const user = makeUser({ passwordHash: 'segredo' });

    await expect(serialize(user)).resolves.toEqual({});
  });

  it('serializes only the exposed fields of a response class', async () => {
    const user = makeUser({ passwordHash: 'segredo' });

    const body = await serialize(UserResponse.from(user));

    expect(body).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    });
    expect(body).not.toHaveProperty('passwordHash');
  });

  it('serializes a response class made of a single field', async () => {
    const response = Object.assign(new CsrfResponse(), { csrfToken: 'abc' });

    await expect(serialize(response)).resolves.toEqual({ csrfToken: 'abc' });
  });

  it('lets empty responses through untouched', async () => {
    await expect(serialize(undefined)).resolves.toBeUndefined();
  });

  it('serializes each item of a list', async () => {
    const users = [makeUser(), makeUser()];

    const body = (await serialize(
      users.map((user) => UserResponse.from(user)),
    )) as Record<string, unknown>[];

    expect(body).toHaveLength(2);
    expect(body.every((item) => !('passwordHash' in item))).toBe(true);
  });
});
