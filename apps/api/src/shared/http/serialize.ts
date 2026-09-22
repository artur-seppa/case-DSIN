import { applyDecorators, HttpStatus, SerializeOptions } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function Serialize(
  type: Type<unknown>,
  { isArray = false, status = HttpStatus.OK } = {},
): MethodDecorator {
  return applyDecorators(
    SerializeOptions({ type }),
    ApiResponse({ status, type, isArray }),
  );
}
