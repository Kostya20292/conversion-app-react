import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { User } from '@/users/user.entity';
import { createHttpApp } from './create-http-app';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
const VALID_PASSWORD = 'Abcdefg1';

const uniqueEmail = (label: string): string => `${label}.${crypto.randomUUID()}@example.com`;

const findAuthSetCookie = (response: Response): string | undefined =>
  response.headers.getSetCookie().find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`));

const authCookieHeader = (setCookie: string): string => setCookie.split(';', 1)[0] ?? '';

const cookieAttribute = (setCookie: string, name: string): string | undefined => {
  const prefix = `${name}=`;
  for (const part of setCookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      return trimmed.slice(prefix.length);
    }
  }

  return undefined;
};

const hasCookieFlag = (setCookie: string, flag: string): boolean =>
  setCookie.split(';').some((part) => part.trim().toLowerCase() === flag.toLowerCase());

describe('auth HTTP (план §4, ТЗ §6)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createHttpApp();
    baseUrl = await app.getUrl();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (body: {
    display_name?: string;
    email: string;
    password: string;
  }): Promise<Response> =>
    fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: 'Иван', ...body }),
    });

  const login = async (body: {
    email: string;
    password: string;
    remember_me?: boolean;
  }): Promise<Response> =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('registers a user with save_conversions=false and sets an httpOnly session cookie', async () => {
    const email = uniqueEmail('register');
    const response = await register({ email, password: VALID_PASSWORD });
    const body = (await response.json()) as Record<string, unknown>;
    const setCookie = findAuthSetCookie(response);

    expect(response.status).toBe(201);
    expect(body.email).toBe(email.toLowerCase());
    expect(body.display_name).toBe('Иван');
    expect(body.save_conversions).toBe(false);
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('password_hash');
    expect(setCookie).toBeDefined();
    expect(hasCookieFlag(setCookie ?? '', 'HttpOnly')).toBe(true);
    expect(cookieAttribute(setCookie ?? '', 'SameSite')?.toLowerCase()).toBe('lax');
    expect(cookieAttribute(setCookie ?? '', 'Max-Age')).toBeUndefined();
  });

  it('returns the current user on GET /me when the session cookie is present', async () => {
    const email = uniqueEmail('me');
    const registered = await register({ email, password: VALID_PASSWORD });
    const setCookie = findAuthSetCookie(registered);
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: authCookieHeader(setCookie ?? '') },
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.email).toBe(email.toLowerCase());
    expect(body.display_name).toBe('Иван');
    expect(body.save_conversions).toBe(false);
  });

  it('rejects GET /me without a session as unauthorized', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('unauthorized');
  });

  it('rejects a duplicate email as invalid_request without creating a second user', async () => {
    const email = uniqueEmail('taken');
    await register({ email, password: VALID_PASSWORD });
    const response = await register({
      display_name: 'Пётр',
      email: email.toUpperCase(),
      password: VALID_PASSWORD,
    });
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error).toEqual({
      code: 'invalid_request',
      message: 'This email is already registered',
    });
  });

  it('rejects a weak password without persisting a user', async () => {
    const email = uniqueEmail('weak');
    const weak = await register({ email, password: 'short1' });
    const strong = await register({ email, password: VALID_PASSWORD });

    expect(weak.status).toBe(400);
    expect(((await weak.json()) as { error: { code: string } }).error.code).toBe('invalid_request');
    expect(strong.status).toBe(201);
  });

  it('stores a password as an argon2 hash, never plaintext', async () => {
    const email = uniqueEmail('hash');
    await register({ email, password: VALID_PASSWORD });

    const user = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();

    expect(user?.passwordHash.startsWith('$argon2')).toBe(true);
    expect(user?.passwordHash.includes(VALID_PASSWORD)).toBe(false);
  });

  it('logs in with email and password and sets a session cookie', async () => {
    const email = uniqueEmail('login');
    await register({ email, password: VALID_PASSWORD });
    const response = await login({ email, password: VALID_PASSWORD, remember_me: false });
    const setCookie = findAuthSetCookie(response);

    expect(response.status).toBe(200);
    expect(setCookie).toBeDefined();
    expect(hasCookieFlag(setCookie ?? '', 'HttpOnly')).toBe(true);
    expect(cookieAttribute(setCookie ?? '', 'Max-Age')).toBeUndefined();
  });

  it('returns the same unauthorized message for unknown email and wrong password', async () => {
    const email = uniqueEmail('enum');
    await register({ email, password: VALID_PASSWORD });

    const unknownEmail = await login({
      email: uniqueEmail('missing'),
      password: VALID_PASSWORD,
    });
    const wrongPassword = await login({ email, password: 'Wrongpass1' });
    const unknownBody = (await unknownEmail.json()) as { error: unknown };
    const wrongBody = (await wrongPassword.json()) as { error: unknown };

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownBody).toEqual(wrongBody);
    expect(unknownBody.error).toEqual({
      code: 'unauthorized',
      message: 'Invalid email or password',
    });
  });

  it('sets Max-Age to 30 days when remember-me is on', async () => {
    const email = uniqueEmail('remember');
    await register({ email, password: VALID_PASSWORD });
    const response = await login({ email, password: VALID_PASSWORD, remember_me: true });
    const setCookie = findAuthSetCookie(response);

    expect(response.status).toBe(200);
    expect(cookieAttribute(setCookie ?? '', 'Max-Age')).toBe(String(THIRTY_DAYS_SECONDS));
  });

  it('clears the cookie and rejects the previous token after logout', async () => {
    const email = uniqueEmail('logout');
    const registered = await register({ email, password: VALID_PASSWORD });
    const sessionCookie = authCookieHeader(findAuthSetCookie(registered) ?? '');

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });
    const logoutSetCookie = findAuthSetCookie(logout);
    const me = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });

    expect(logout.status).toBe(204);
    expect(cookieAttribute(logoutSetCookie ?? '', 'Max-Age')).toBe('0');
    expect(me.status).toBe(401);
    expect(((await me.json()) as { error: { code: string } }).error.code).toBe('unauthorized');
  });
});
