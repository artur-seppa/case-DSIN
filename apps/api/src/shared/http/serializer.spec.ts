import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { CsrfResponse } from '../../auth/presentation/http/dto/csrf.response.js';
import { makeUser } from '../../testing/factories/user.factory.js';
import { UserResponse } from '../../users/presentation/http/dto/user.response.js';
import { Serialize } from './serialize.js';
import { createSerializerInterceptor } from './serializer.js';

class SampleController {
  @Serialize(UserResponse)
  one() {
    return undefined;
  }

  @Serialize(UserResponse, { isArray: true })
  many() {
    return undefined;
  }

  undeclared() {
    return undefined;
  }
}

type Handler = 'one' | 'many' | 'undeclared';

async function serialize(handler: Handler, value: unknown): Promise<unknown> {
  const interceptor = createSerializerInterceptor(new Reflector());
  const context = {
    getHandler: () => SampleController.prototype[handler],
    getClass: () => SampleController,
  } as unknown as ExecutionContext;
  const next: CallHandler = { handle: () => of(value) };

  return lastValueFrom(await interceptor.intercept(context, next));
}

describe('response serializer', () => {
  it('turns a domain entity returned by a handler without a declared type into an empty object instead of leaking it', async () => {
    const user = makeUser({ passwordHash: 'segredo' });

    await expect(serialize('undeclared', user)).resolves.toEqual({});
  });

  it('does not leak a plain object returned by a handler without a declared type', async () => {
    await expect(
      serialize('undeclared', { passwordHash: 'segredo' }),
    ).resolves.toEqual({});
  });

  it('maps an entity to the declared response class, exposing only its fields', async () => {
    const user = makeUser({ passwordHash: 'segredo' });

    const body = await serialize('one', user);

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

  it('maps each item of a list to the declared response class', async () => {
    const users = [makeUser(), makeUser()];

    const body = (await serialize('many', users)) as Record<string, unknown>[];

    expect(body).toHaveLength(2);
    expect(body.map((item) => item.id)).toEqual(users.map((user) => user.id));
    expect(body.every((item) => !('passwordHash' in item))).toBe(true);
  });

  it('serializes a response class instance made of a single field', async () => {
    const response = Object.assign(new CsrfResponse(), { csrfToken: 'abc' });

    await expect(serialize('undeclared', response)).resolves.toEqual({
      csrfToken: 'abc',
    });
  });

  it('lets empty responses through untouched', async () => {
    await expect(serialize('one', undefined)).resolves.toBeUndefined();
  });
});
