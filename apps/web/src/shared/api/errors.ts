export interface ApiError {
  status: number;
  code: string | null;
  message: string;
}

export const NETWORK_ERROR_MESSAGE =
  'Não foi possível se conectar. Verifique sua internet e tente novamente';

interface BusinessErrorBody {
  statusCode: number;
  code: string;
  message: string;
}

interface ValidationErrorBody {
  statusCode: number;
  message: string[];
  error?: string;
}

function isBusinessErrorBody(body: unknown): body is BusinessErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof (body as { code: unknown }).code === 'string' &&
    'message' in body &&
    typeof (body as { message: unknown }).message === 'string'
  );
}

function isValidationErrorBody(body: unknown): body is ValidationErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    Array.isArray((body as { message: unknown }).message)
  );
}

export function errorFromBody(status: number, body: unknown): ApiError {
  if (isBusinessErrorBody(body)) {
    return { status, code: body.code, message: body.message };
  }
  if (isValidationErrorBody(body)) {
    return { status, code: null, message: body.message.join('; ') };
  }
  return { status, code: null, message: NETWORK_ERROR_MESSAGE };
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);

  return errorFromBody(response.status, body);
}

export function networkFailureError(): ApiError {
  return { status: 0, code: null, message: NETWORK_ERROR_MESSAGE };
}
