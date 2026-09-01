import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { StoredFile } from '@/files/stored-file.entity';
import { uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
};

const uniqueEmail = (label: string): string => `${label}.${crypto.randomUUID()}@example.com`;

const findAuthSetCookie = (response: Response): string | undefined =>
  response.headers.getSetCookie().find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`));

const authCookieHeader = (setCookie: string): string => setCookie.split(';', 1)[0] ?? '';

const jpegFile = (): File =>
  new File([new Uint8Array(JPEG_BYTES)], 'photo.jpg', { type: 'image/jpeg' });

const jobForm = (file?: File, targetFormat = 'png'): FormData => {
  const form = new FormData();
  if (file) {
    form.append('file', file);
  }
  form.append('target_format', targetFormat);
  return form;
};

const expectQueuedWithoutDownload = (body: JobStatusBody, id: string): void => {
  expect(body.id).toBe(id);
  expect(body.status).toBe('queued');
  expect(body).not.toHaveProperty('download_url');
  expect(body).not.toHaveProperty('expires_at');
  expect(body).not.toHaveProperty('saved_to_profile');
};

describe('jobs HTTP (план §7, ТЗ §7.1–7.5 / §7.2 polling)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let storage: StorageService;

  beforeAll(async () => {
    app = await createHttpApp();
    baseUrl = await app.getUrl();
    dataSource = app.get(DataSource);
    storage = app.get(StorageService);
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

  const postUiJob = async (init?: {
    cookie?: string;
    apiKey?: string;
    form?: FormData;
  }): Promise<Response> => {
    const headers = new Headers();
    if (init?.cookie) {
      headers.set('Cookie', init.cookie);
    }
    if (init?.apiKey) {
      headers.set('X-API-Key', init.apiKey);
    }

    return fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers,
      body: init?.form ?? jobForm(jpegFile()),
    });
  };

  const getUiJob = async (id: string, cookie?: string): Promise<Response> => {
    const headers = new Headers();
    if (cookie) {
      headers.set('Cookie', cookie);
    }

    return fetch(`${baseUrl}/api/jobs/${id}`, { headers });
  };

  const postV1Job = async (init?: { apiKey?: string; form?: FormData }): Promise<Response> => {
    const headers = new Headers();
    if (init?.apiKey) {
      headers.set('X-API-Key', init.apiKey);
    }

    return fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers,
      body: init?.form ?? jobForm(jpegFile()),
    });
  };

  const getV1Job = async (id: string, apiKey?: string): Promise<Response> => {
    const headers = new Headers();
    if (apiKey) {
      headers.set('X-API-Key', apiKey);
    }

    return fetch(`${baseUrl}/api/v1/jobs/${id}`, { headers });
  };

  const loadJob = async (id: string): Promise<ConversionJob | null> =>
    dataSource.getRepository(ConversionJob).findOneBy({ id });

  it('creates a queued UI job for a guest, stores the upload under the job id, and returns it by id without a session', async () => {
    const created = await postUiJob();
    const createdBody = (await created.json()) as JobCreatedBody;
    const job = await loadJob(createdBody.id);
    const storedCount = await dataSource
      .getRepository(StoredFile)
      .countBy({ jobId: createdBody.id });
    const polled = await getUiJob(createdBody.id);
    const polledBody = (await polled.json()) as JobStatusBody;
    const storedBytes = job ? await storage.read(job.sourceStorageKey) : Buffer.alloc(0);

    expect(created.status).toBe(202);
    expect(createdBody.status).toBe('queued');
    expect(createdBody.id).toMatch(UUID_PATTERN);
    expect(Object.keys(createdBody).sort()).toEqual(['id', 'status']);
    expect(job?.userId).toBeNull();
    expect(job?.sourceOfRequest).toBe('ui');
    expect(job?.sourceFormat).toBe('jpg');
    expect(job?.targetFormat).toBe('png');
    expect(job?.status).toBe('queued');
    expect(job?.sourceStorageKey).toBe(uploadStorageKey(createdBody.id));
    expect(job?.sourceStorageKey.includes('photo.jpg')).toBe(false);
    expect(storedBytes.equals(JPEG_BYTES)).toBe(true);
    expect(storedCount).toBe(0);
    expect(polled.status).toBe(200);
    expectQueuedWithoutDownload(polledBody, createdBody.id);
  });

  it('rejects a UI job without a file as invalid_request and does not persist a job', async () => {
    const before = await dataSource.getRepository(ConversionJob).count();
    const response = await postUiJob({ form: jobForm() });
    const body = (await response.json()) as ApiErrorBody;
    const after = await dataSource.getRepository(ConversionJob).count();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('invalid_request');
    expect(after).toBe(before);
  });

  it('attaches a cookie session user to a UI job and does not treat X-API-Key as UI identity', async () => {
    const owner = await register('ui-owner');
    const stranger = await register('ui-key-stranger');
    const withCookie = await postUiJob({ cookie: owner.cookie });
    const withKeyOnly = await postUiJob({ apiKey: stranger.apiKey });
    const cookieBody = (await withCookie.json()) as JobCreatedBody;
    const keyBody = (await withKeyOnly.json()) as JobCreatedBody;
    const cookieJob = await loadJob(cookieBody.id);
    const keyJob = await loadJob(keyBody.id);

    expect(withCookie.status).toBe(202);
    expect(withKeyOnly.status).toBe(202);
    expect(cookieJob?.userId).toBe(owner.id);
    expect(cookieJob?.sourceOfRequest).toBe('ui');
    expect(keyJob?.userId).toBeNull();
    expect(keyJob?.sourceOfRequest).toBe('ui');
  });

  it('hides a user-owned UI job from guests and other users as not_found, same as a missing id', async () => {
    const owner = await register('ui-hide-owner');
    const stranger = await register('ui-hide-stranger');
    const created = await postUiJob({ cookie: owner.cookie });
    const createdBody = (await created.json()) as JobCreatedBody;
    const missingId = crypto.randomUUID();

    const ownerGet = await getUiJob(createdBody.id, owner.cookie);
    const guestGet = await getUiJob(createdBody.id);
    const strangerGet = await getUiJob(createdBody.id, stranger.cookie);
    const missingGet = await getUiJob(missingId);
    const ownerBody = (await ownerGet.json()) as JobStatusBody;
    const guestBody = (await guestGet.json()) as ApiErrorBody;
    const strangerBody = (await strangerGet.json()) as ApiErrorBody;
    const missingBody = (await missingGet.json()) as ApiErrorBody;

    expect(ownerGet.status).toBe(200);
    expectQueuedWithoutDownload(ownerBody, createdBody.id);
    expect(guestGet.status).toBe(404);
    expect(strangerGet.status).toBe(404);
    expect(missingGet.status).toBe(404);
    expect(guestBody.error.code).toBe('not_found');
    expect(guestBody).toEqual(strangerBody);
    expect(guestBody).toEqual(missingBody);
  });

  it('still returns a guest UI job by id when the caller has a session cookie', async () => {
    const created = await postUiJob();
    const createdBody = (await created.json()) as JobCreatedBody;
    const stranger = await register('ui-guest-id');
    const response = await getUiJob(createdBody.id, stranger.cookie);
    const body = (await response.json()) as JobStatusBody;

    expect(response.status).toBe(200);
    expectQueuedWithoutDownload(body, createdBody.id);
  });

  it('rejects public API jobs without an API key as unauthorized', async () => {
    const created = await postV1Job();
    const missingGet = await getV1Job(crypto.randomUUID());
    const createdBody = (await created.json()) as ApiErrorBody;
    const getBody = (await missingGet.json()) as ApiErrorBody;

    expect(created.status).toBe(401);
    expect(missingGet.status).toBe(401);
    expect(createdBody.error.code).toBe('unauthorized');
    expect(getBody.error.code).toBe('unauthorized');
  });

  it('creates a queued API job for the key owner and hides it from other keys as not_found', async () => {
    const owner = await register('v1-owner');
    const stranger = await register('v1-stranger');
    const created = await postV1Job({ apiKey: owner.apiKey });
    const createdBody = (await created.json()) as JobCreatedBody;
    const job = await loadJob(createdBody.id);
    const storedCount = await dataSource
      .getRepository(StoredFile)
      .countBy({ jobId: createdBody.id });
    const ownerGet = await getV1Job(createdBody.id, owner.apiKey);
    const strangerGet = await getV1Job(createdBody.id, stranger.apiKey);
    const guestUiGet = await getUiJob(createdBody.id);
    const ownerBody = (await ownerGet.json()) as JobStatusBody;
    const strangerBody = (await strangerGet.json()) as ApiErrorBody;
    const guestBody = (await guestUiGet.json()) as ApiErrorBody;

    expect(created.status).toBe(202);
    expect(createdBody.status).toBe('queued');
    expect(createdBody.id).toMatch(UUID_PATTERN);
    expect(Object.keys(createdBody).sort()).toEqual(['id', 'status']);
    expect(job?.userId).toBe(owner.id);
    expect(job?.sourceOfRequest).toBe('api');
    expect(storedCount).toBe(0);
    expect(ownerGet.status).toBe(200);
    expectQueuedWithoutDownload(ownerBody, createdBody.id);
    expect(strangerGet.status).toBe(404);
    expect(strangerBody.error.code).toBe('not_found');
    expect(guestUiGet.status).toBe(404);
    expect(guestBody.error.code).toBe('not_found');
  });

  it('lets the same owner read a UI job with the API key and an API job with the session cookie', async () => {
    const owner = await register('cross-channel');
    const uiCreated = await postUiJob({ cookie: owner.cookie });
    const apiCreated = await postV1Job({ apiKey: owner.apiKey });
    const uiBody = (await uiCreated.json()) as JobCreatedBody;
    const apiBody = (await apiCreated.json()) as JobCreatedBody;
    const uiViaKey = await getV1Job(uiBody.id, owner.apiKey);
    const apiViaCookie = await getUiJob(apiBody.id, owner.cookie);
    const uiViaKeyBody = (await uiViaKey.json()) as JobStatusBody;
    const apiViaCookieBody = (await apiViaCookie.json()) as JobStatusBody;

    expect(uiCreated.status).toBe(202);
    expect(apiCreated.status).toBe(202);
    expect(uiViaKey.status).toBe(200);
    expect(apiViaCookie.status).toBe(200);
    expectQueuedWithoutDownload(uiViaKeyBody, uiBody.id);
    expectQueuedWithoutDownload(apiViaCookieBody, apiBody.id);
  });
});
