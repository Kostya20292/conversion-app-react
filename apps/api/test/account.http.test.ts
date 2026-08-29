import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource, IsNull } from 'typeorm';
import { ApiKey } from '@/api-keys/api-key.entity';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { StoredFile } from '@/files/stored-file.entity';
import { ShareLink } from '@/shares/share-link.entity';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';
const NEXT_PASSWORD = 'Newpass99';

type ApiErrorBody = { error: { code: string; message: string } };

const uniqueEmail = (label: string): string => `${label}.${crypto.randomUUID()}@example.com`;

const findAuthSetCookie = (response: Response): string | undefined =>
  response.headers.getSetCookie().find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`));

const authCookieHeader = (setCookie: string): string => setCookie.split(';', 1)[0] ?? '';

describe('users and API keys HTTP (план §4.7 / §5, ТЗ §4.5 / §6.2 / §8)', () => {
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

  const login = async (body: { email: string; password: string }): Promise<Response> =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const me = async (cookie: string): Promise<Response> =>
    fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });

  const patchMe = async (cookie: string, body: Record<string, unknown>): Promise<Response> =>
    fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });

  const listApiKeys = async (cookie: string): Promise<Response> =>
    fetch(`${baseUrl}/api/api-keys`, { headers: { Cookie: cookie } });

  const reissueApiKey = async (cookie: string): Promise<Response> =>
    fetch(`${baseUrl}/api/api-keys/reissue`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });

  const v1Me = async (apiKey: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/me`, { headers: { 'X-API-Key': apiKey } });

  const registerSession = async (
    label: string,
    password = VALID_PASSWORD,
  ): Promise<{ cookie: string; email: string; id: string; apiKey: string }> => {
    const email = uniqueEmail(label);
    const response = await register({ email, password });
    const body = (await response.json()) as { id: string; api_key: string };
    const setCookie = findAuthSetCookie(response);

    return {
      cookie: authCookieHeader(setCookie ?? ''),
      email,
      id: body.id,
      apiKey: body.api_key,
    };
  };

  describe('PATCH /api/users/me', () => {
    it('rejects a missing session as unauthorized', async () => {
      const response = await fetch(`${baseUrl}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'Пётр' }),
      });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('updates display name without a password when email is unchanged', async () => {
      const session = await registerSession('name');
      const response = await patchMe(session.cookie, {
        display_name: 'Пётр',
        email: session.email,
      });
      const body = (await response.json()) as { display_name: string };
      const current = await me(session.cookie);
      const currentBody = (await current.json()) as { display_name: string };

      expect(response.status).toBe(200);
      expect(body.display_name).toBe('Пётр');
      expect(current.status).toBe(200);
      expect(currentBody.display_name).toBe('Пётр');
    });

    it('rejects an empty display name', async () => {
      const session = await registerSession('empty-name');
      const response = await patchMe(session.cookie, { display_name: '' });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
    });

    it('requires the current password to change email', async () => {
      const session = await registerSession('email-nopw');
      const response = await patchMe(session.cookie, { email: uniqueEmail('next') });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
    });

    it('rejects a taken email with a dedicated message', async () => {
      const taken = await registerSession('taken-email');
      const session = await registerSession('changer');
      const response = await patchMe(session.cookie, {
        email: taken.email.toUpperCase(),
        current_password: VALID_PASSWORD,
      });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(400);
      expect(body.error).toEqual({
        code: 'invalid_request',
        message: 'This email is already taken',
      });
    });

    it('changes email when the current password is correct', async () => {
      const session = await registerSession('email-ok');
      const nextEmail = uniqueEmail('renamed');
      const response = await patchMe(session.cookie, {
        email: nextEmail,
        current_password: VALID_PASSWORD,
      });
      const body = (await response.json()) as { email: string };
      const oldLogin = await login({ email: session.email, password: VALID_PASSWORD });
      const newLogin = await login({ email: nextEmail, password: VALID_PASSWORD });

      expect(response.status).toBe(200);
      expect(body.email).toBe(nextEmail.toLowerCase());
      expect(oldLogin.status).toBe(401);
      expect(newLogin.status).toBe(200);
    });

    it('invalidates the previous cookie after an email change', async () => {
      const session = await registerSession('email-tv');
      await patchMe(session.cookie, {
        email: uniqueEmail('tv-mail'),
        current_password: VALID_PASSWORD,
      });
      const current = await me(session.cookie);
      const body = (await current.json()) as ApiErrorBody;

      expect(current.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('requires the current password to set a new password', async () => {
      const session = await registerSession('pw-nopw');
      const response = await patchMe(session.cookie, { new_password: NEXT_PASSWORD });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
    });

    it('rejects a weak new password without changing credentials', async () => {
      const session = await registerSession('pw-weak');
      const response = await patchMe(session.cookie, {
        current_password: VALID_PASSWORD,
        new_password: 'short1',
      });
      const body = (await response.json()) as ApiErrorBody;
      const oldLogin = await login({ email: session.email, password: VALID_PASSWORD });

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
      expect(oldLogin.status).toBe(200);
    });

    it('rejects a wrong current password without invalidating the session', async () => {
      const session = await registerSession('pw-wrong');
      const response = await patchMe(session.cookie, {
        current_password: 'Wrongpass1',
        new_password: NEXT_PASSWORD,
      });
      const body = (await response.json()) as ApiErrorBody;
      const current = await me(session.cookie);

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
      expect(current.status).toBe(200);
    });

    it('changes the password so the old password can no longer log in', async () => {
      const session = await registerSession('pw-ok');
      const response = await patchMe(session.cookie, {
        current_password: VALID_PASSWORD,
        new_password: NEXT_PASSWORD,
      });
      const oldLogin = await login({ email: session.email, password: VALID_PASSWORD });
      const newLogin = await login({ email: session.email, password: NEXT_PASSWORD });

      expect(response.status).toBe(200);
      expect(oldLogin.status).toBe(401);
      expect(newLogin.status).toBe(200);
    });

    it('invalidates the previous cookie after a password change', async () => {
      const session = await registerSession('pw-tv');
      await patchMe(session.cookie, {
        current_password: VALID_PASSWORD,
        new_password: NEXT_PASSWORD,
      });
      const current = await me(session.cookie);
      const body = (await current.json()) as ApiErrorBody;

      expect(current.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('toggles save_conversions without deleting StoredFile or revoking shares', async () => {
      const session = await registerSession('save');
      const file = await dataSource.getRepository(StoredFile).save({
        userId: session.id,
        jobId: null,
        name: 'result.png',
        storageKey: `profile/${session.id}/${crypto.randomUUID()}`,
        size: 128,
        source: 'ui',
      });
      const share = await dataSource.getRepository(ShareLink).save({
        token: crypto.randomUUID().replaceAll('-', ''),
        ownerUserId: session.id,
        jobId: null,
        fileId: file.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      });

      const enabled = await patchMe(session.cookie, { save_conversions: true });
      const disabled = await patchMe(session.cookie, { save_conversions: false });
      const enabledBody = (await enabled.json()) as { save_conversions: boolean };
      const disabledBody = (await disabled.json()) as { save_conversions: boolean };
      const storedFile = await dataSource.getRepository(StoredFile).findOneBy({ id: file.id });
      const shareLink = await dataSource.getRepository(ShareLink).findOneBy({ id: share.id });

      expect(enabled.status).toBe(200);
      expect(enabledBody.save_conversions).toBe(true);
      expect(disabled.status).toBe(200);
      expect(disabledBody.save_conversions).toBe(false);
      expect(storedFile).not.toBeNull();
      expect(shareLink?.revokedAt).toBeNull();
    });
  });

  describe('API keys', () => {
    it('returns the plaintext API key once on register and stores only hash plus prefix', async () => {
      const email = uniqueEmail('key-reg');
      const response = await register({ email, password: VALID_PASSWORD });
      const body = (await response.json()) as { id: string; api_key: string };
      const stored = await dataSource
        .getRepository(ApiKey)
        .createQueryBuilder('key')
        .addSelect('key.keyHash')
        .where('key.userId = :userId', { userId: body.id })
        .andWhere('key.revokedAt IS NULL')
        .getMany();

      expect(response.status).toBe(201);
      expect(body.api_key.startsWith('cv_live_')).toBe(true);
      expect(stored).toHaveLength(1);
      expect(stored[0]?.keyHash).not.toBe(body.api_key);
      expect(stored[0]?.keyHash.includes(body.api_key)).toBe(false);
      expect(body.api_key.startsWith(stored[0]?.prefix ?? '')).toBe(true);
      expect(stored[0]?.prefix).not.toBe(body.api_key);
    });

    it('does not return the plaintext key from login, GET /me, or GET /api/api-keys', async () => {
      const session = await registerSession('key-once');
      const loggedIn = await login({ email: session.email, password: VALID_PASSWORD });
      const current = await me(session.cookie);
      const listed = await listApiKeys(session.cookie);
      const loginBody = (await loggedIn.json()) as Record<string, unknown>;
      const meBody = (await current.json()) as Record<string, unknown>;
      const listBody = (await listed.json()) as {
        keys: Array<{ prefix: string; masked_key: string }>;
      };

      expect(loggedIn.status).toBe(200);
      expect(current.status).toBe(200);
      expect(listed.status).toBe(200);
      expect(loginBody).not.toHaveProperty('api_key');
      expect(meBody).not.toHaveProperty('api_key');
      expect(listBody.keys).toHaveLength(1);
      expect(listBody.keys[0]?.prefix.startsWith('cv_live_')).toBe(true);
      expect(listBody.keys[0]?.masked_key).not.toBe(session.apiKey);
      expect(JSON.stringify(listBody)).not.toContain(session.apiKey);
    });

    it('rejects API key routes without a session as unauthorized', async () => {
      const listed = await fetch(`${baseUrl}/api/api-keys`);
      const reissued = await fetch(`${baseUrl}/api/api-keys/reissue`, { method: 'POST' });
      const listedBody = (await listed.json()) as ApiErrorBody;
      const reissuedBody = (await reissued.json()) as ApiErrorBody;

      expect(listed.status).toBe(401);
      expect(reissued.status).toBe(401);
      expect(listedBody.error.code).toBe('unauthorized');
      expect(reissuedBody.error.code).toBe('unauthorized');
    });

    it('reissues a new plaintext key once and revokes the previous one', async () => {
      const session = await registerSession('reissue');
      const response = await reissueApiKey(session.cookie);
      const body = (await response.json()) as { api_key: string };
      const listed = await listApiKeys(session.cookie);
      const listBody = (await listed.json()) as { keys: Array<{ masked_key: string }> };
      const active = await dataSource.getRepository(ApiKey).count({
        where: { userId: session.id, revokedAt: IsNull() },
      });

      expect(response.status).toBe(201);
      expect(body.api_key.startsWith('cv_live_')).toBe(true);
      expect(body.api_key).not.toBe(session.apiKey);
      expect(listed.status).toBe(200);
      expect(JSON.stringify(listBody)).not.toContain(body.api_key);
      expect(JSON.stringify(listBody)).not.toContain(session.apiKey);
      expect(active).toBe(1);
    });

    it('accepts GET /api/v1/me with the current key and rejects a revoked key', async () => {
      const session = await registerSession('v1-me');
      const before = await v1Me(session.apiKey);
      const beforeBody = (await before.json()) as { email: string };
      const reissued = await reissueApiKey(session.cookie);
      const reissuedBody = (await reissued.json()) as { api_key: string };
      const oldKey = await v1Me(session.apiKey);
      const oldBody = (await oldKey.json()) as ApiErrorBody;
      const newKey = await v1Me(reissuedBody.api_key);
      const missing = await fetch(`${baseUrl}/api/v1/me`);
      const missingBody = (await missing.json()) as ApiErrorBody;

      expect(before.status).toBe(200);
      expect(beforeBody.email).toBe(session.email.toLowerCase());
      expect(oldKey.status).toBe(401);
      expect(oldBody.error.code).toBe('unauthorized');
      expect(newKey.status).toBe(200);
      expect(missing.status).toBe(401);
      expect(missingBody.error.code).toBe('unauthorized');
    });
  });
});
