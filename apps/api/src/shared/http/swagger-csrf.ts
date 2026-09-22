export async function attachCsrfToken(request: {
  method: string;
  headers: Record<string, string>;
}) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (
    safeMethods.includes(request.method.toUpperCase()) ||
    request.headers['x-csrf-token']
  ) {
    return request;
  }

  const response = await fetch('/api/auth/csrf', {
    credentials: 'same-origin',
  });
  const body = (await response.json()) as { csrfToken: string };
  request.headers['x-csrf-token'] = body.csrfToken;
  return request;
}
