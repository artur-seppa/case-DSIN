import {
  type ArgumentsHost,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { CsrfExceptionFilter, isCsrfError } from './csrf-exception.filter.js';

describe('isCsrfError', () => {
  it.each(['Invalid csrf token', 'Missing csrf secret'])(
    'recognizes the plugin failure %j (Nest hands it over as a 403 HttpException)',
    (message) => {
      expect(isCsrfError(new HttpException(message, 403))).toBe(true);
    },
  );

  it.each([
    new ForbiddenException('Você não tem permissão para esta ação'),
    new HttpException('Invalid csrf token', 401),
    new Error('Invalid csrf token'),
    null,
    undefined,
    'Invalid csrf token',
  ])('ignores %j', (value) => {
    expect(isCsrfError(value)).toBe(false);
  });
});

describe('CsrfExceptionFilter', () => {
  it('answers 403 with a stable code and a Portuguese message', () => {
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
    const host = {
      switchToHttp: () => ({ getResponse: () => reply }),
    } as unknown as ArgumentsHost;
    new CsrfExceptionFilter().catch(
      new HttpException('Invalid csrf token', 403),
      host,
    );

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      statusCode: 403,
      code: 'CSRF_INVALID',
      message: 'Token CSRF ausente ou inválido',
    });
  });
});
