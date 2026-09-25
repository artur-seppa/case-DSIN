import { toApiError, networkFailureError, NETWORK_ERROR_MESSAGE } from '@/shared/api/errors';

describe('toApiError', () => {
  it('maps a business-exception body ({statusCode, code, message})', async () => {
    const response = new Response(
      JSON.stringify({ statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' }),
      { status: 401 },
    );

    const error = await toApiError(response);

    expect(error).toEqual({ status: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' });
  });

  it('maps a validation-error body ({statusCode, message: string[]}), no code', async () => {
    const response = new Response(
      JSON.stringify({ statusCode: 400, message: ['E-mail: valor inválido'], error: 'Bad Request' }),
      { status: 400 },
    );

    const error = await toApiError(response);

    expect(error).toEqual({ status: 400, code: null, message: 'E-mail: valor inválido' });
  });

  it('joins multiple validation messages', async () => {
    const response = new Response(
      JSON.stringify({ statusCode: 400, message: ['Campo A inválido', 'Campo B inválido'] }),
      { status: 400 },
    );

    const error = await toApiError(response);

    expect(error.message).toBe('Campo A inválido; Campo B inválido');
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    const response = new Response('not json', { status: 500 });

    const error = await toApiError(response);

    expect(error).toEqual({ status: 500, code: null, message: NETWORK_ERROR_MESSAGE });
  });
});

describe('networkFailureError', () => {
  it('returns a status-0 ApiError with the generic network message', () => {
    expect(networkFailureError()).toEqual({ status: 0, code: null, message: NETWORK_ERROR_MESSAGE });
  });
});
