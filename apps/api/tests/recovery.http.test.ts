import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { PasswordReset } from '@/auth/password-reset.entity';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';
const NEXT_PASSWORD = 'Newpass99';
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const NEUTRAL_FORGOT_BODY = {
  message: 'If an account exists and Telegram is linked, a reset code has been sent',
} as const;

type ApiErrorBody = { error: { code: string; message: string } };

const uniqueEmail = (label: string): string => `${label}.${crypto.randomUUID()}@example.com`;

const findAuthSetCookie = (response: Response): string | undefined =>
  response.headers.getSetCookie().find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`));

const authCookieHeader = (setCookie: string): string => setCookie.split(';', 1)[0] ?? '';

describe('recovery HTTP (план §11, ТЗ §4.4 / §6.2–§6.3 / UC-04)', () => {
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

  const register = async (body: { email: string; password: string }): Promise<Response> =>
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

  const bindTelegram = async (cookie: string): Promise<Response> =>
    fetch(`${baseUrl}/api/users/me/telegram/bind`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });

  const confirmTelegram = async (bindToken: string, telegramId: string): Promise<Response> =>
    fetch(`${baseUrl}/api/telegram/mock/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bind_token: bindToken, telegram_id: telegramId }),
    });

  const unbindTelegram = async (cookie: string): Promise<Response> =>
    fetch(`${baseUrl}/api/users/me/telegram/unbind`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });

  const forgotPassword = async (email: string): Promise<Response> =>
    fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

  const mockInbox = async (telegramId: string): Promise<Response> =>
    fetch(`${baseUrl}/api/telegram/mock/inbox/${telegramId}`);

  const resetPassword = async (body: { code: string; new_password: string }): Promise<Response> =>
    fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const registerSession = async (
    label: string,
  ): Promise<{ cookie: string; email: string; id: string }> => {
    const email = uniqueEmail(label);
    const response = await register({ email, password: VALID_PASSWORD });
    const body = (await response.json()) as { id: string };
    const setCookie = findAuthSetCookie(response);

    return { cookie: authCookieHeader(setCookie ?? ''), email, id: body.id };
  };

  const linkTelegram = async (
    cookie: string,
    telegramId: string,
  ): Promise<{ bindToken: string }> => {
    const bind = await bindTelegram(cookie);
    const bindBody = (await bind.json()) as { bind_token: string };
    await confirmTelegram(bindBody.bind_token, telegramId);

    return { bindToken: bindBody.bind_token };
  };

  describe('Telegram bind (ТЗ §6.3, план §11.1–§11.2)', () => {
    it('rejects bind without a session as unauthorized', async () => {
      const response = await fetch(`${baseUrl}/api/users/me/telegram/bind`, { method: 'POST' });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns a bind token whose start_param is bind_<token>', async () => {
      const session = await registerSession('bind-token');
      const response = await bindTelegram(session.cookie);
      const body = (await response.json()) as { bind_token: string; start_param: string };

      expect(response.status).toBe(201);
      expect(body.start_param).toBe(`bind_${body.bind_token}`);
    });

    it('sets telegram_id on the profile after mock confirm', async () => {
      const session = await registerSession('bind-ok');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      const current = await me(session.cookie);
      const body = (await current.json()) as { telegram_id: string | null };

      expect(current.status).toBe(200);
      expect(body.telegram_id).toBe(telegramId);
    });

    it('rejects unbind without a session as unauthorized', async () => {
      const response = await fetch(`${baseUrl}/api/users/me/telegram/unbind`, { method: 'POST' });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('clears telegram_id after unbind', async () => {
      const session = await registerSession('unbind');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);

      const response = await unbindTelegram(session.cookie);
      const current = await me(session.cookie);
      const body = (await current.json()) as { telegram_id: string | null };

      expect(response.status).toBe(204);
      expect(current.status).toBe(200);
      expect(body.telegram_id).toBeNull();
    });

    it('rejects confirming the same telegram_id for a second user', async () => {
      const first = await registerSession('tg-first');
      const second = await registerSession('tg-second');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(first.cookie, telegramId);

      const bind = await bindTelegram(second.cookie);
      const bindBody = (await bind.json()) as { bind_token: string };
      const confirm = await confirmTelegram(bindBody.bind_token, telegramId);
      const body = (await confirm.json()) as ApiErrorBody;

      expect(confirm.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
    });
  });

  describe('forgot-password (ТЗ §4.4 / §6.2, план §11.3–§11.5)', () => {
    it('returns the same body for unknown email, unbound account, and bound account', async () => {
      const unbound = await registerSession('forgot-unbound');
      const bound = await registerSession('forgot-bound');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(bound.cookie, telegramId);

      const unknown = await forgotPassword(uniqueEmail('missing'));
      const unboundForgot = await forgotPassword(unbound.email);
      const boundForgot = await forgotPassword(bound.email);
      const unknownBody = (await unknown.json()) as unknown;
      const unboundBody = (await unboundForgot.json()) as unknown;
      const boundBody = (await boundForgot.json()) as unknown;

      expect(unknown.status).toBe(200);
      expect(unboundForgot.status).toBe(200);
      expect(boundForgot.status).toBe(200);
      expect(unknownBody).toEqual(NEUTRAL_FORGOT_BODY);
      expect(unboundBody).toEqual(unknownBody);
      expect(boundBody).toEqual(unknownBody);
    });

    it('does not put the reset code in the forgot HTTP response', async () => {
      const session = await registerSession('forgot-no-leak');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);

      const response = await forgotPassword(session.email);
      const body = (await response.json()) as Record<string, unknown>;
      const inbox = await mockInbox(telegramId);
      const inboxBody = (await inbox.json()) as { code: string };

      expect(response.status).toBe(200);
      expect(body).toEqual(NEUTRAL_FORGOT_BODY);
      expect(JSON.stringify(body)).not.toContain(inboxBody.code);
    });

    it('stores a hashed reset code with a 15-minute TTL when Telegram is linked', async () => {
      const session = await registerSession('forgot-hash');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      await forgotPassword(session.email);

      const inbox = await mockInbox(telegramId);
      const inboxBody = (await inbox.json()) as { code: string };
      const stored = await dataSource
        .getRepository(PasswordReset)
        .createQueryBuilder('reset')
        .addSelect('reset.codeHash')
        .where('reset.userId = :userId', { userId: session.id })
        .andWhere('reset.consumedAt IS NULL')
        .getOne();
      const ttlMs = (stored?.expiresAt.getTime() ?? 0) - Date.now();

      expect(inbox.status).toBe(200);
      expect(inboxBody.code.length).toBeGreaterThan(0);
      expect(stored?.codeHash.startsWith('$argon2')).toBe(true);
      expect(stored?.codeHash.includes(inboxBody.code)).toBe(false);
      expect(ttlMs).toBeGreaterThan(14 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(FIFTEEN_MINUTES_MS);
    });

    it('does not store a reset code when Telegram is not linked', async () => {
      const session = await registerSession('forgot-nolink');
      await forgotPassword(session.email);

      const count = await dataSource.getRepository(PasswordReset).count({
        where: { userId: session.id },
      });

      expect(count).toBe(0);
    });

    it('rejects a second forgot within 60 seconds as rate_limited', async () => {
      const session = await registerSession('forgot-cd');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);

      const first = await forgotPassword(session.email);
      const second = await forgotPassword(session.email);
      const body = (await second.json()) as ApiErrorBody;
      const retryAfter = Number(second.headers.get('Retry-After'));

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
      expect(body.error.code).toBe('rate_limited');
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe('reset-password (ТЗ §6.2, план §11.6, UC-04)', () => {
    it('accepts a valid code and new password so the user can log in', async () => {
      const session = await registerSession('reset-ok');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      await forgotPassword(session.email);
      const inbox = await mockInbox(telegramId);
      const { code } = (await inbox.json()) as { code: string };

      const response = await resetPassword({ code, new_password: NEXT_PASSWORD });
      const nextLogin = await login({ email: session.email, password: NEXT_PASSWORD });

      expect(response.status).toBe(204);
      expect(nextLogin.status).toBe(200);
    });

    it('rejects the previous password after a successful reset', async () => {
      const session = await registerSession('reset-old');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      await forgotPassword(session.email);
      const inbox = await mockInbox(telegramId);
      const { code } = (await inbox.json()) as { code: string };

      await resetPassword({ code, new_password: NEXT_PASSWORD });
      const oldLogin = await login({ email: session.email, password: VALID_PASSWORD });

      expect(oldLogin.status).toBe(401);
    });

    it('rejects a weak new password without changing credentials', async () => {
      const session = await registerSession('reset-weak');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      await forgotPassword(session.email);
      const inbox = await mockInbox(telegramId);
      const { code } = (await inbox.json()) as { code: string };

      const response = await resetPassword({ code, new_password: 'short1' });
      const body = (await response.json()) as ApiErrorBody;
      const oldLogin = await login({ email: session.email, password: VALID_PASSWORD });

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
      expect(oldLogin.status).toBe(200);
    });

    it('rejects an invalid code as invalid_request', async () => {
      const response = await resetPassword({
        code: 'not-a-real-code',
        new_password: NEXT_PASSWORD,
      });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(400);
      expect(body.error).toEqual({
        code: 'invalid_request',
        message: 'Invalid reset code',
      });
    });

    it('rejects an expired code as gone', async () => {
      const session = await registerSession('reset-exp');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      await forgotPassword(session.email);
      const inbox = await mockInbox(telegramId);
      const { code } = (await inbox.json()) as { code: string };

      await dataSource
        .getRepository(PasswordReset)
        .createQueryBuilder()
        .update()
        .set({ expiresAt: new Date(0) })
        .where('user_id = :userId', { userId: session.id })
        .execute();

      const response = await resetPassword({ code, new_password: NEXT_PASSWORD });
      const body = (await response.json()) as ApiErrorBody;

      expect(response.status).toBe(410);
      expect(body.error).toEqual({
        code: 'gone',
        message: 'Reset code has expired',
      });
    });

    it('rejects a consumed code after a successful reset', async () => {
      const session = await registerSession('reset-once');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      await forgotPassword(session.email);
      const inbox = await mockInbox(telegramId);
      const { code } = (await inbox.json()) as { code: string };

      await resetPassword({ code, new_password: NEXT_PASSWORD });
      const reuse = await resetPassword({ code, new_password: 'Another1' });
      const body = (await reuse.json()) as ApiErrorBody;

      expect(reuse.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
    });

    it('does not accept a reset code after Telegram is unbound', async () => {
      const session = await registerSession('reset-unbind');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      await forgotPassword(session.email);
      const inbox = await mockInbox(telegramId);
      const { code } = (await inbox.json()) as { code: string };

      await unbindTelegram(session.cookie);
      const response = await resetPassword({ code, new_password: NEXT_PASSWORD });
      const body = (await response.json()) as ApiErrorBody;
      const oldLogin = await login({ email: session.email, password: VALID_PASSWORD });

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_request');
      expect(oldLogin.status).toBe(200);
    });

    it('invalidates the previous session cookie after a successful reset', async () => {
      const session = await registerSession('reset-tv');
      const telegramId = `tg_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
      await linkTelegram(session.cookie, telegramId);
      await forgotPassword(session.email);
      const inbox = await mockInbox(telegramId);
      const { code } = (await inbox.json()) as { code: string };

      await resetPassword({ code, new_password: NEXT_PASSWORD });
      const current = await me(session.cookie);
      const body = (await current.json()) as ApiErrorBody;

      expect(current.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });
  });
});
