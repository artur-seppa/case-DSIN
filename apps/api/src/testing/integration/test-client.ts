import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AccessTokenService } from '../../auth/application/ports/access-token.service.js';
import type { AuthenticatedUser } from '../../shared/auth/authenticated-user.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ACCESS_COOKIE = 'access_token';

export interface TestResponse<T = any> {
  status: number;
  body: T;
  cookies: Map<string, string>;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export class TestClient {
  private readonly cookies = new Map<string, string>();
  private csrfToken: string | undefined;

  constructor(private readonly app: NestFastifyApplication) {}

  get<T = any>(url: string): Promise<TestResponse<T>> {
    return this.request('GET', url);
  }

  post<T = any>(url: string, payload?: object): Promise<TestResponse<T>> {
    return this.request('POST', url, payload);
  }

  patch<T = any>(url: string, payload?: object): Promise<TestResponse<T>> {
    return this.request('PATCH', url, payload);
  }

  put<T = any>(url: string, payload?: object): Promise<TestResponse<T>> {
    return this.request('PUT', url, payload);
  }

  cookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  clearCookie(name: string): void {
    this.cookies.delete(name);
  }

  async loginAs(user: AuthenticatedUser): Promise<this> {
    const token = await this.app.get(AccessTokenService).sign(user);
    this.cookies.set(ACCESS_COOKIE, token);
    return this;
  }

  async login(email: string, password: string): Promise<TestResponse> {
    return this.post('/auth/login', { email, password });
  }

  async request<T = any>(
    method: HttpMethod,
    url: string,
    payload?: object,
  ): Promise<TestResponse<T>> {
    const headers: Record<string, string> = {};
    if (!SAFE_METHODS.has(method)) {
      headers['x-csrf-token'] = await this.ensureCsrfToken();
    }
    return this.send<T>(method, url, headers, payload);
  }

  async requestWithoutCsrf<T = any>(
    method: HttpMethod,
    url: string,
    payload?: object,
  ): Promise<TestResponse<T>> {
    return this.send<T>(method, url, {}, payload);
  }

  private async ensureCsrfToken(): Promise<string> {
    if (!this.csrfToken) {
      const response = await this.send<{ csrfToken: string }>(
        'GET',
        '/auth/csrf',
        {},
      );
      this.csrfToken = response.body.csrfToken;
    }
    return this.csrfToken;
  }

  private async send<T>(
    method: HttpMethod,
    url: string,
    headers: Record<string, string>,
    payload?: object,
  ): Promise<TestResponse<T>> {
    const response = await this.app.inject({
      method,
      url: `/api${url}`,
      headers: { ...headers, cookie: this.cookieHeader() },
      payload,
    });

    for (const cookie of response.cookies) {
      if (cookie.value === '' || cookie.maxAge === 0) {
        this.cookies.delete(cookie.name);
      } else {
        this.cookies.set(cookie.name, cookie.value);
      }
    }

    const text = response.body;
    return {
      status: response.statusCode,
      body: (text ? JSON.parse(text) : undefined) as T,
      cookies: new Map(this.cookies),
    };
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}
