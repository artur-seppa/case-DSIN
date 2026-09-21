import { ClassSerializerInterceptor } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

export function createSerializerInterceptor(
  reflector: Reflector,
): ClassSerializerInterceptor {
  return new ClassSerializerInterceptor(reflector, { strategy: 'excludeAll' });
}
