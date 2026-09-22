import { faker } from '@faker-js/faker';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../../../testing/factories/user.factory.js';
import {
  createTestApp,
  type TestApp,
} from '../../../testing/integration/test-app.js';

describe('Auth flow', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(() => testApp.reset());

  afterAll(() => testApp.close());

  it('registers a client, opens the session and never exposes the password hash', async () => {
    const client = testApp.client();
    const email = faker.internet.email().toLowerCase();

    const registered = await client.post('/auth/register', {
      name: 'Maria Silva',
      email,
      password: DEFAULT_PASSWORD,
    });

    expect(registered.status).toBe(201);
    expect(registered.body).toMatchObject({ email, role: 'CLIENT' });
    expect(registered.body).not.toHaveProperty('passwordHash');
    expect(client.cookie('access_token')).toBeDefined();
    expect(client.cookie('refresh_token')).toBeDefined();

    const me = await client.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });

  it('rejects a second registration with the same e-mail', async () => {
    const existing = await createUser(testApp.dataSource.manager);

    const response = await testApp.client().post('/auth/register', {
      name: 'Outra Pessoa',
      email: existing.email.toUpperCase(),
      password: DEFAULT_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('EMAIL_ALREADY_IN_USE');
  });

  it('answers validation errors in Portuguese', async () => {
    const response = await testApp.client().post('/auth/register', {
      name: 'A',
      email: 'not-an-email',
      password: '123',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringMatching(/Nome|E-mail|Senha/)]),
    );
  });

  it('logs in with the right password and refuses the wrong one', async () => {
    const user = await createUser(testApp.dataSource.manager);

    const wrong = await testApp.client().login(user.email, 'wrong-password');
    const right = await testApp.client().login(user.email, DEFAULT_PASSWORD);

    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
    expect(right.status).toBe(200);
    expect(right.body.id).toBe(user.id);
  });

  it('rotates the refresh token on each use', async () => {
    const user = await createUser(testApp.dataSource.manager);
    const client = testApp.client();
    await client.login(user.email, DEFAULT_PASSWORD);
    const firstRefresh = client.cookie('refresh_token');

    const renewed = await client.post('/auth/refresh');

    expect(renewed.status).toBe(200);
    expect(client.cookie('refresh_token')).toBeDefined();
    expect(client.cookie('refresh_token')).not.toBe(firstRefresh);
  });

  it('revokes the whole family when a rotated token is presented again', async () => {
    const user = await createUser(testApp.dataSource.manager);
    const client = testApp.client();
    await client.login(user.email, DEFAULT_PASSWORD);
    const stolen = client.cookie('refresh_token')!;
    await client.post('/auth/refresh');
    const legitimate = client.cookie('refresh_token')!;

    const attacker = testApp.client();
    attacker.setCookie('refresh_token', stolen);
    const replay = await attacker.post('/auth/refresh');

    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe('INVALID_REFRESH_TOKEN');

    const victim = testApp.client();
    victim.setCookie('refresh_token', legitimate);
    const afterReuse = await victim.post('/auth/refresh');
    expect(afterReuse.status).toBe(401);
  });

  it('ends the session on logout', async () => {
    const user = await createUser(testApp.dataSource.manager);
    const client = testApp.client();
    await client.login(user.email, DEFAULT_PASSWORD);
    const refreshToken = client.cookie('refresh_token')!;

    const loggedOut = await client.post('/auth/logout');

    expect(loggedOut.status).toBe(204);
    expect((await client.get('/auth/me')).status).toBe(401);

    const reuse = testApp.client();
    reuse.setCookie('refresh_token', refreshToken);
    expect((await reuse.post('/auth/refresh')).status).toBe(401);
  });

  it('refuses an unsafe request without the CSRF token', async () => {
    const response = await testApp
      .client()
      .requestWithoutCsrf('POST', '/auth/login', {
        email: 'a@b.com',
        password: DEFAULT_PASSWORD,
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CSRF_INVALID');
  });

  it('lets the user update their own profile, trimming the name and clearing the phone with null', async () => {
    const user = await createUser(testApp.dataSource.manager, {
      phone: '+5511900000000',
    });
    const client = await testApp.client().loginAs(user);

    const renamed = await client.patch('/users/me', { name: '  Nome Novo  ' });
    const cleared = await client.patch('/users/me', { phone: null });

    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({
      name: 'Nome Novo',
      phone: '+5511900000000',
    });
    expect(cleared.body).toMatchObject({ name: 'Nome Novo', phone: null });
    expect(cleared.body).not.toHaveProperty('passwordHash');
  });

  it('answers 400, not 500, when the name is set to null', async () => {
    const user = await createUser(testApp.dataSource.manager);
    const client = await testApp.client().loginAs(user);

    const response = await client.patch('/users/me', { name: null });

    expect(response.status).toBe(400);
  });

  it('does not let the profile update change the role or e-mail', async () => {
    const user = await createUser(testApp.dataSource.manager);
    const client = await testApp.client().loginAs(user);

    const response = await client.patch('/users/me', {
      role: 'ADMIN',
      email: 'novo@example.com',
    });

    expect(response.status).toBe(400);
  });

  it('requires authentication for /auth/me', async () => {
    expect((await testApp.client().get('/auth/me')).status).toBe(401);
  });
});
