import { shouldHardReloadOnSessionExpiry } from '@/shared/api/client';

describe('shouldHardReloadOnSessionExpiry', () => {
  it('does not reload when already on the login page (breaks the anonymous-visitor reload loop)', () => {
    expect(shouldHardReloadOnSessionExpiry('/login')).toBe(false);
  });

  it('does not reload when already on the register page', () => {
    expect(shouldHardReloadOnSessionExpiry('/register')).toBe(false);
  });

  it('reloads from any other page, where the user actually needs to be sent to /login', () => {
    expect(shouldHardReloadOnSessionExpiry('/book')).toBe(true);
    expect(shouldHardReloadOnSessionExpiry('/')).toBe(true);
  });
});
