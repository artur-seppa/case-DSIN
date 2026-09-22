import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { FastifyReply } from 'fastify';

const CSRF_PLUGIN_MESSAGES = new Set([
  'Invalid csrf token',
  'Missing csrf secret',
]);

export function isCsrfError(exception: unknown): boolean {
  return (
    exception instanceof HttpException &&
    exception.getStatus() === HttpStatus.FORBIDDEN &&
    CSRF_PLUGIN_MESSAGES.has(exception.message)
  );
}

@Catch()
export class CsrfExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!isCsrfError(exception)) {
      super.catch(exception, host);
      return;
    }

    const reply = host.switchToHttp().getResponse<FastifyReply>();
    void reply.status(HttpStatus.FORBIDDEN).send({
      statusCode: HttpStatus.FORBIDDEN,
      code: 'CSRF_INVALID',
      message: 'Token CSRF ausente ou inválido',
    });
  }
}
