import { describe, expect, it } from 'vitest';
import { createAuthCookieOptions } from './auth-cookie';

describe('auth cookie options (план §4.4, ТЗ §4.3)', () => {
  it('always sets httpOnly, SameSite=Lax and path=/', () => {
    const options = createAuthCookieOptions({ rememberMe: false, isProduction: false });

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
  });

  it('sets Secure only in production', () => {
    expect(createAuthCookieOptions({ rememberMe: false, isProduction: true }).secure).toBe(true);
    expect(createAuthCookieOptions({ rememberMe: false, isProduction: false }).secure).toBe(false);
  });

  it('sets a 30-day maxAge only when remember-me is on', () => {
    const remembered = createAuthCookieOptions({ rememberMe: true, isProduction: false });
    const session = createAuthCookieOptions({ rememberMe: false, isProduction: false });

    expect(remembered.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    expect(session.maxAge).toBeUndefined();
  });
});
