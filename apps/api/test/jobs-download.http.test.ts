import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { DOWNLOAD_TOKEN_PURPOSE } from '@/common/signed-download-token';
import { resultStorageKey, uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { JobWorkerService } from '@/worker/job-worker.service';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';

const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=',
  'base64',
);

type ApiErrorBody = { error: { code: string; message: string } };
type JobCreatedBody = { id: string; status: string };
type JobStatusBody = {
  id: string;
  status: string;
  download_url?: string;
  expires_at?: string;
  saved_to_profile?: boolean;
  error?: { code: string };
};

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

const absoluteUrl = (baseUrl: string, maybeRelative: string): string => {
  if (maybeRelative.startsWith('http://') || maybeRelative.startsWith('https://')) {
    return maybeRelative;
  }

  return `${baseUrl}${maybeRelative}`;
};

describe('jobs worker and download HTTP (план §8, ТЗ §7.2 / §7.7)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let storage: StorageService;
  let worker: JobWorkerService;
  let jwt: JwtService;

  beforeAll(async () => {
    app = await createHttpApp();
    baseUrl = await app.getUrl();
    dataSource = app.get(DataSource);
    storage = app.get(StorageService);
    worker = app.get(JobWorkerService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (
    label: string,
  ): Promise<{ cookie: string; id: string; apiKey: string }> => {
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
    };
  };

  const postUiJob = async (cookie?: string): Promise<Response> => {
    const headers = new Headers();
    if (cookie) {
      headers.set('Cookie', cookie);
    }

    return fetch(`${baseUrl}/api/jobs`, { method: 'POST', headers, body: jobForm() });
  };

  const getUiJob = async (id: string, cookie?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/jobs/${id}`, {
      headers: cookie ? { Cookie: cookie } : undefined,
    });

  const postV1Job = async (apiKey: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: jobForm(),
    });

  const detectExt = async (bytes: Uint8Array): Promise<string | undefined> => {
    const { fileTypeFromBuffer } = await import('file-type');
    return (await fileTypeFromBuffer(bytes))?.ext;
  };

  it('lets a guest convert JPG to PNG, poll completed fields, and download via the signed URL', async () => {
    const created = await postUiJob();
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    const polled = await getUiJob(createdBody.id);
    const polledBody = (await polled.json()) as JobStatusBody;
    const download = await fetch(absoluteUrl(baseUrl, polledBody.download_url ?? ''));
    const downloaded = Buffer.from(await download.arrayBuffer());
    const job = await dataSource.getRepository(ConversionJob).findOneBy({ id: createdBody.id });

    expect(polled.status).toBe(200);
    expect(polledBody.status).toBe('completed');
    expect(polledBody.saved_to_profile).toBe(false);
    expect(polledBody.download_url).toMatch(
      new RegExp(`^/api/jobs/${createdBody.id}/download\\?token=`),
    );
    expect(Date.parse(polledBody.expires_at ?? '') - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    expect(Date.parse(polledBody.expires_at ?? '') - Date.now()).toBeLessThanOrEqual(
      15 * 60 * 1000,
    );
    expect(download.status).toBe(200);
    expect(download.headers.get('content-type')).toMatch(/image\/png/);
    expect(await detectExt(downloaded)).toBe('png');
    expect(job?.resultStorageKey).toBe(resultStorageKey(createdBody.id));
    await expect(storage.read(uploadStorageKey(createdBody.id))).rejects.toThrow();
    expect(await storage.read(resultStorageKey(createdBody.id))).toEqual(downloaded);
  });

  it('lets two worker ticks claim the same queued job only once', async () => {
    const created = await postUiJob();
    const createdBody = (await created.json()) as JobCreatedBody;

    await Promise.all([
      worker.processJobById(createdBody.id),
      worker.processJobById(createdBody.id),
    ]);

    const job = await dataSource.getRepository(ConversionJob).findOneBy({ id: createdBody.id });
    const polled = await getUiJob(createdBody.id);
    const polledBody = (await polled.json()) as JobStatusBody;

    expect(job?.status).toBe('completed');
    expect(polledBody.status).toBe('completed');
  });

  it('rejects an expired signed download token as gone', async () => {
    const created = await postUiJob();
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    const expired = jwt.sign({
      purpose: DOWNLOAD_TOKEN_PURPOSE,
      jobId: createdBody.id,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const download = await fetch(
      `${baseUrl}/api/jobs/${createdBody.id}/download?token=${encodeURIComponent(expired)}`,
    );
    const body = (await download.json()) as ApiErrorBody;

    expect(download.status).toBe(410);
    expect(body.error.code).toBe('gone');
  });

  it('does not let a guest download without the signed token', async () => {
    const created = await postUiJob();
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    const download = await fetch(`${baseUrl}/api/jobs/${createdBody.id}/download`);
    const body = (await download.json()) as ApiErrorBody;

    expect(download.status).toBe(404);
    expect(body.error.code).toBe('not_found');
  });

  it('lets the owner download with the session cookie without a signed token', async () => {
    const owner = await register('download-owner');
    const created = await postUiJob(owner.cookie);
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    const download = await fetch(`${baseUrl}/api/jobs/${createdBody.id}/download`, {
      headers: { Cookie: owner.cookie },
    });

    expect(download.status).toBe(200);
    expect(await detectExt(Buffer.from(await download.arrayBuffer()))).toBe('png');
  });

  it('hides another user job download as not_found', async () => {
    const owner = await register('download-hide-owner');
    const stranger = await register('download-hide-stranger');
    const created = await postUiJob(owner.cookie);
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    const download = await fetch(`${baseUrl}/api/jobs/${createdBody.id}/download`, {
      headers: { Cookie: stranger.cookie },
    });
    const body = (await download.json()) as ApiErrorBody;

    expect(download.status).toBe(404);
    expect(body.error.code).toBe('not_found');
  });

  it('lets the API key owner download and hides the file from another key as not_found', async () => {
    const owner = await register('v1-download-owner');
    const stranger = await register('v1-download-stranger');
    const created = await postV1Job(owner.apiKey);
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    const ownerGet = await fetch(`${baseUrl}/api/v1/jobs/${createdBody.id}`, {
      headers: { 'X-API-Key': owner.apiKey },
    });
    const ownerBody = (await ownerGet.json()) as JobStatusBody;
    const ownerDownload = await fetch(`${baseUrl}/api/v1/jobs/${createdBody.id}/download`, {
      headers: { 'X-API-Key': owner.apiKey },
    });
    const strangerDownload = await fetch(`${baseUrl}/api/v1/jobs/${createdBody.id}/download`, {
      headers: { 'X-API-Key': stranger.apiKey },
    });
    const unauthDownload = await fetch(`${baseUrl}/api/v1/jobs/${createdBody.id}/download`);
    const strangerBody = (await strangerDownload.json()) as ApiErrorBody;
    const unauthBody = (await unauthDownload.json()) as ApiErrorBody;

    expect(ownerGet.status).toBe(200);
    expect(ownerBody.status).toBe('completed');
    expect(ownerBody.download_url).toBe(`/api/v1/jobs/${createdBody.id}/download`);
    expect(ownerDownload.status).toBe(200);
    expect(await detectExt(Buffer.from(await ownerDownload.arrayBuffer()))).toBe('png');
    expect(strangerDownload.status).toBe(404);
    expect(strangerBody.error.code).toBe('not_found');
    expect(unauthDownload.status).toBe(401);
    expect(unauthBody.error.code).toBe('unauthorized');
  });

  it('marks an engine failure as failed with conversion_failed and does not serve a result file', async () => {
    const id = crypto.randomUUID();
    const sourceStorageKey = uploadStorageKey(id);
    await storage.write(sourceStorageKey, Buffer.from('this-is-not-a-valid-jpeg'));
    await dataSource.getRepository(ConversionJob).save({
      id,
      userId: null,
      sourceFormat: 'jpg',
      targetFormat: 'png',
      status: 'queued',
      sourceOfRequest: 'ui',
      errorCode: null,
      sourceSize: 24,
      resultSize: null,
      sourceStorageKey,
      resultStorageKey: null,
      finishedAt: null,
    });
    await worker.processJobById(id);
    const polled = await getUiJob(id);
    const polledBody = (await polled.json()) as JobStatusBody;
    const download = await fetch(`${baseUrl}/api/jobs/${id}/download`);
    const downloadBody = (await download.json()) as ApiErrorBody;

    expect(polled.status).toBe(200);
    expect(polledBody.status).toBe('failed');
    expect(polledBody.error?.code).toBe('conversion_failed');
    expect(polledBody).not.toHaveProperty('download_url');
    expect(download.status).toBe(422);
    expect(downloadBody.error.code).toBe('conversion_failed');
    await expect(storage.read(resultStorageKey(id))).rejects.toThrow();
  });

  it('does not serve storage files as static assets', async () => {
    const created = await postUiJob();
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    const direct = await fetch(`${baseUrl}/storage/${resultStorageKey(createdBody.id)}`);
    const apiPrefixed = await fetch(`${baseUrl}/api/storage/${resultStorageKey(createdBody.id)}`);

    expect(direct.status).toBe(404);
    expect(apiPrefixed.status).toBe(404);
  });
});
