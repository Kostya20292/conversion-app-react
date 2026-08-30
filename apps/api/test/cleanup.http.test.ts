import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { CleanupService } from '@/cleanup/cleanup.service';
import { profileStorageKey, resultStorageKey, uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { JobWorkerService } from '@/worker/job-worker.service';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';
const HOUR_MS = 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * HOUR_MS;
const TWENTY_THREE_HOURS_MS = 23 * HOUR_MS;
const TWENTY_FIVE_HOURS_MS = 25 * HOUR_MS;

const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=',
  'base64',
);

type ApiErrorBody = { error: { code: string; message: string } };
type JobCreatedBody = { id: string; status: string };
type JobStatusBody = { id: string; status: string; download_url?: string };
type FileListBody = { files: { id: string; download_url: string }[] };

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

const hoursAgo = (ms: number): Date => new Date(Date.now() - ms);

describe('TTL cleanup (план §13, ТЗ §2.2)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let storage: StorageService;
  let worker: JobWorkerService;
  let cleanup: CleanupService;

  beforeAll(async () => {
    app = await createHttpApp();
    baseUrl = await app.getUrl();
    dataSource = app.get(DataSource);
    storage = app.get(StorageService);
    worker = app.get(JobWorkerService);
    cleanup = app.get(CleanupService);
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (label: string): Promise<{ cookie: string; id: string }> => {
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
    const body = (await response.json()) as { id: string };
    const setCookie = findAuthSetCookie(response);

    return {
      cookie: authCookieHeader(setCookie ?? ''),
      id: body.id,
    };
  };

  const postUiJob = async (cookie?: string): Promise<string> => {
    const headers = new Headers();
    if (cookie) {
      headers.set('Cookie', cookie);
    }

    const created = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers,
      body: jobForm(),
    });
    const body = (await created.json()) as JobCreatedBody;

    return body.id;
  };

  const completeUiJob = async (cookie?: string): Promise<string> => {
    const id = await postUiJob(cookie);
    await worker.processJobById(id);
    return id;
  };

  const getUiJob = async (id: string, cookie?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/jobs/${id}`, {
      headers: cookie ? { Cookie: cookie } : undefined,
    });

  const listUiFiles = async (cookie: string): Promise<Response> =>
    fetch(`${baseUrl}/api/files`, { headers: { Cookie: cookie } });

  const patchMe = async (cookie: string, body: Record<string, unknown>): Promise<Response> =>
    fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });

  const setJobCreatedAt = async (id: string, createdAt: Date): Promise<void> => {
    await dataSource.getRepository(ConversionJob).update({ id }, { createdAt });
  };

  const setJobFinishedAt = async (id: string, finishedAt: Date): Promise<void> => {
    await dataSource.getRepository(ConversionJob).update({ id }, { finishedAt });
  };

  const storageHas = async (key: string): Promise<boolean> => {
    try {
      await storage.read(key);
      return true;
    } catch {
      return false;
    }
  };

  it('deletes abandoned and failed uploads older than 1 hour and keeps younger ones', async () => {
    const staleQueuedId = await postUiJob();
    const staleFailedId = await postUiJob();
    const freshQueuedId = await postUiJob();
    const freshFailedId = await postUiJob();
    await dataSource
      .getRepository(ConversionJob)
      .update({ id: staleFailedId }, { status: 'failed', errorCode: 'conversion_failed' });
    await dataSource
      .getRepository(ConversionJob)
      .update({ id: freshFailedId }, { status: 'failed', errorCode: 'conversion_failed' });
    await setJobCreatedAt(staleQueuedId, hoursAgo(TWO_HOURS_MS));
    await setJobCreatedAt(staleFailedId, hoursAgo(TWO_HOURS_MS));

    await cleanup.run();

    expect(await storageHas(uploadStorageKey(staleQueuedId))).toBe(false);
    expect(await storageHas(uploadStorageKey(staleFailedId))).toBe(false);
    expect(await storageHas(uploadStorageKey(freshQueuedId))).toBe(true);
    expect(await storageHas(uploadStorageKey(freshFailedId))).toBe(true);
  });

  it('deletes a result older than 24 hours when it is not saved to the profile, and a download does not extend TTL', async () => {
    const jobId = await completeUiJob();
    await setJobFinishedAt(jobId, hoursAgo(TWENTY_FIVE_HOURS_MS));
    const polled = await getUiJob(jobId);
    const polledBody = (await polled.json()) as JobStatusBody;
    const downloadBefore = await fetch(absoluteUrl(baseUrl, polledBody.download_url ?? ''));

    await cleanup.run();

    const downloadAfter = await fetch(absoluteUrl(baseUrl, polledBody.download_url ?? ''));
    const downloadAfterBody = (await downloadAfter.json()) as ApiErrorBody;

    expect(downloadBefore.status).toBe(200);
    expect(await storageHas(resultStorageKey(jobId))).toBe(false);
    expect(downloadAfter.status).toBe(410);
    expect(downloadAfterBody.error.code).toBe('gone');
  });

  it('keeps a result younger than 24 hours', async () => {
    const jobId = await completeUiJob();
    await setJobFinishedAt(jobId, hoursAgo(TWENTY_THREE_HOURS_MS));

    await cleanup.run();

    const polled = await getUiJob(jobId);
    const polledBody = (await polled.json()) as JobStatusBody;
    const download = await fetch(absoluteUrl(baseUrl, polledBody.download_url ?? ''));

    expect(await storageHas(resultStorageKey(jobId))).toBe(true);
    expect(download.status).toBe(200);
  });

  it('keeps a StoredFile in the profile after the 24 hour result TTL', async () => {
    const owner = await register('cleanup-profile');
    await patchMe(owner.cookie, { save_conversions: true });
    const jobId = await completeUiJob(owner.cookie);
    const stored = await dataSource.getRepository(StoredFile).findOneBy({ jobId });
    await setJobFinishedAt(jobId, hoursAgo(TWENTY_FIVE_HOURS_MS));

    await cleanup.run();

    const listed = await listUiFiles(owner.cookie);
    const listedBody = (await listed.json()) as FileListBody;
    const download = await fetch(absoluteUrl(baseUrl, listedBody.files[0]?.download_url ?? ''), {
      headers: { Cookie: owner.cookie },
    });

    expect(stored).not.toBeNull();
    expect(await storageHas(profileStorageKey(owner.id, stored?.id ?? ''))).toBe(true);
    expect(listedBody.files).toHaveLength(1);
    expect(download.status).toBe(200);
  });

  it('deletes an orphan file on disk that has no live job or StoredFile', async () => {
    const orphanId = crypto.randomUUID();
    const key = uploadStorageKey(orphanId);
    await storage.write(key, JPEG_BYTES);

    await cleanup.run();

    expect(await storageHas(key)).toBe(false);
  });
});
