import { assertAdminSession } from './admin';
import type { Session } from '@/features/auth/api/session';

const CLIENT_SESSION: Session = { id: 'u1', name: 'Ana', email: 'ana@x.com', phone: null, role: 'CLIENT' };
const ADMIN_SESSION: Session = { id: 'u2', name: 'Leila', email: 'leila@x.com', phone: null, role: 'ADMIN' };

describe('assertAdminSession', () => {
  it('throws a redirect for a CLIENT session', () => {
    expect(() => assertAdminSession(CLIENT_SESSION)).toThrow();
  });

  it('does not throw for an ADMIN session', () => {
    expect(() => assertAdminSession(ADMIN_SESSION)).not.toThrow();
  });
});
