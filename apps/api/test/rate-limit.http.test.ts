import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';
const LOGIN_WINDOW_SECONDS = 15 * 60;
const CONVERT_WINDOW_SECONDS = 60 * 60;
const GUEST_CONVERT_LIMIT = 10;
const USER_CONVERT_LIMIT = 60;
const API_CONVERT_LIMIT = 30;
const LOGIN_LIMIT = 10;

const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=',
  'base64',
);

type ApiErrorBody = { error: { code: string; message: string } };
type JobCreatedBody = { id: string; status: string };

const uniqueEmail = (label: string): string => `${label}.${crypto.randomUUID()}@example.com`;

const findAuthSetCookie = (response: Response): string | undefined =>
  response.headers.getSetCookie().find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`));

const authCookieHeader = (setCookie: string): string => setCookie.split(';', 1)[0] ?? '';

const jpegFile = (): File =>
  new File([new Uint8Array(JPEG_BYTES)], 'photo.jpg', { type: 'image/jpeg' });

const jobForm = (): FormData => {
  const form = new FormData();
  form.append('file', jpegFile());
  form.append('target_format', 'png');
  return form;
};

const retryAfterSeconds = (response: Response): number =>
  Number(response.headers.get('Retry-After'));

describe('rate limit HTTP (план §13, ТЗ §7.6)', () => {
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

  const register = async (
    label: string,
  ): Promise<{ cookie: string; id: string; apiKey: string; email: string }> => {
    const email = uniqueEmail(label);
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: 'Иван',
        email,
        password: VALID_PASSWORD,
      }),
    });
    const body = (await response.json()) as { id: string; api_key: string };
    const setCookie = findAuthSetCookie(response);

    return {
      cookie: authCookieHeader(setCookie ?? ''),
      id: body.id,
      apiKey: body.api_key,
      email,
    };
  };

  const login = async (body: { email: string; password: string }): Promise<Response> =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const postUiJob = async (cookie?: string): Promise<Response> => {
    const headers = new Headers();
    if (cookie) {
      headers.set('Cookie', cookie);
    }

    return fetch(`${baseUrl}/api/jobs`, { method: 'POST', headers, body: jobForm() });
  };

  const getUiJob = async (id: string): Promise<Response> => fetch(`${baseUrl}/api/jobs/${id}`);

  const postV1Job = async (apiKey: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: jobForm(),
    });

  const postTimes = async (
    count: number,
    request: () => Promise<Response>,
  ): Promise<readonly Response[]> => {
    const responses: Response[] = [];
    for (let i = 0; i < count; i += 1) {
      responses.push(await request());
    }

    return responses;
  };

  it('rejects the 11th login from the same IP within 15 minutes as rate_limited even with valid credentials', async () => {
    const account = await register('login-limit');

    const failed = await postTimes(LOGIN_LIMIT, () =>
      login({ email: account.email, password: 'Wrongpass1' }),
    );
    const blocked = await login({ email: account.email, password: VALID_PASSWORD });
    const blockedBody = (await blocked.json()) as ApiErrorBody;
    const retryAfter = retryAfterSeconds(blocked);

    expect(failed.every((response) => response.status === 401)).toBe(true);
    expect(blocked.status).toBe(429);
    expect(blockedBody.error.code).toBe('rate_limited');
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(LOGIN_WINDOW_SECONDS);
  });

  it('allows 10 guest UI converts per hour per IP and does not count them against a signed-in user', async () => {
    const jobs = dataSource.getRepository(ConversionJob);
    const before = await jobs.count();
    const accepted = await postTimes(GUEST_CONVERT_LIMIT, () => postUiJob());
    const acceptedBodies = await Promise.all(
      accepted.map(async (response) => (await response.json()) as JobCreatedBody),
    );
    const blocked = await postUiJob();
    const blockedBody = (await blocked.json()) as ApiErrorBody;
    const afterBlocked = await jobs.count();
    const polled = await getUiJob(acceptedBodies[0]?.id ?? '');
    const owner = await register('guest-quota-user');
    const userCreated = await postUiJob(owner.cookie);
    const retryAfter = retryAfterSeconds(blocked);

    expect(accepted.every((response) => response.status === 202)).toBe(true);
    expect(blocked.status).toBe(429);
    expect(blockedBody.error.code).toBe('rate_limited');
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(CONVERT_WINDOW_SECONDS);
    expect(afterBlocked - before).toBe(GUEST_CONVERT_LIMIT);
    expect(polled.status).toBe(200);
    expect(userCreated.status).toBe(202);
  });

  it('allows 60 UI converts per hour per user and does not share the quota with another user', async () => {
    const owner = await register('user-quota');
    const other = await register('user-quota-other');
    const jobs = dataSource.getRepository(ConversionJob);
    const before = await jobs.count();
    const accepted = await postTimes(USER_CONVERT_LIMIT, () => postUiJob(owner.cookie));
    const blocked = await postUiJob(owner.cookie);
    const blockedBody = (await blocked.json()) as ApiErrorBody;
    const afterBlocked = await jobs.count();
    const otherCreated = await postUiJob(other.cookie);
    const retryAfter = retryAfterSeconds(blocked);

    expect(accepted.every((response) => response.status === 202)).toBe(true);
    expect(blocked.status).toBe(429);
    expect(blockedBody.error.code).toBe('rate_limited');
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(CONVERT_WINDOW_SECONDS);
    expect(afterBlocked - before).toBe(USER_CONVERT_LIMIT);
    expect(otherCreated.status).toBe(202);
  });

  it('allows 30 API converts per hour per key and does not share the quota with another key', async () => {
    const owner = await register('api-quota');
    const other = await register('api-quota-other');
    const jobs = dataSource.getRepository(ConversionJob);
    const before = await jobs.count();
    const accepted = await postTimes(API_CONVERT_LIMIT, () => postV1Job(owner.apiKey));
    const blocked = await postV1Job(owner.apiKey);
    const blockedBody = (await blocked.json()) as ApiErrorBody;
    const afterBlocked = await jobs.count();
    const otherCreated = await postV1Job(other.apiKey);
    const retryAfter = retryAfterSeconds(blocked);

    expect(accepted.every((response) => response.status === 202)).toBe(true);
    expect(blocked.status).toBe(429);
    expect(blockedBody.error.code).toBe('rate_limited');
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(CONVERT_WINDOW_SECONDS);
    expect(afterBlocked - before).toBe(API_CONVERT_LIMIT);
    expect(otherCreated.status).toBe(202);
  });
});
