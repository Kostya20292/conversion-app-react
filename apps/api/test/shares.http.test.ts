import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { profileStorageKey, uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { ShareLink } from '@/shares/share-link.entity';
import { JobWorkerService } from '@/worker/job-worker.service';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=',
  'base64',
);

type ApiErrorBody = { error: { code: string; message: string } };
type JobCreatedBody = { id: string; status: string };
type ShareCreatedBody = { token: string; url: string; expires_at: string };
type SharePublicBody = {
  name: string;
  format: string;
  size_bytes: number;
  expires_at: string;
  download_url: string;
};
type ShareListItem = { id: string; url: string; expires_at: string; file_name: string };
type ShareListBody = { shares: ShareListItem[] };

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

describe('shares HTTP (план §10, ТЗ §4.6 / §7.3 / §7.5 / §9.2 / UC-06)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let storage: StorageService;
  let worker: JobWorkerService;

  beforeAll(async () => {
    app = await createHttpApp();
    baseUrl = await app.getUrl();
    dataSource = app.get(DataSource);
    storage = app.get(StorageService);
    worker = app.get(JobWorkerService);
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

  const postV1Job = async (apiKey: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: jobForm(),
    });

  const completeUiJob = async (cookie?: string): Promise<string> => {
    const created = await postUiJob(cookie);
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    return createdBody.id;
  };

  const completeV1Job = async (apiKey: string): Promise<string> => {
    const created = await postV1Job(apiKey);
    const createdBody = (await created.json()) as JobCreatedBody;
    await worker.processJobById(createdBody.id);
    return createdBody.id;
  };

  const postUiShare = async (body: Record<string, unknown>, cookie?: string): Promise<Response> => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (cookie) {
      headers.set('Cookie', cookie);
    }

    return fetch(`${baseUrl}/api/shares`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  };

  const postV1Share = async (body: Record<string, unknown>, apiKey?: string): Promise<Response> => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (apiKey) {
      headers.set('X-API-Key', apiKey);
    }

    return fetch(`${baseUrl}/api/v1/shares`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  };

  const getUiShares = async (cookie?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/shares`, {
      headers: cookie ? { Cookie: cookie } : undefined,
    });

  const getV1Shares = async (apiKey?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/shares`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
    });

  const deleteUiShare = async (token: string, cookie?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/shares/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: cookie ? { Cookie: cookie } : undefined,
    });

  const deleteV1Share = async (token: string, apiKey?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/shares/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
    });

  const getPublicShare = async (token: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/public/s/${encodeURIComponent(token)}`);

  const downloadPublicShare = async (token: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/public/s/${encodeURIComponent(token)}/download`);

  const loadJob = async (id: string): Promise<ConversionJob | null> =>
    dataSource.getRepository(ConversionJob).findOneBy({ id });

  const loadShareByToken = async (token: string): Promise<ShareLink | null> =>
    dataSource.getRepository(ShareLink).findOneBy({ token });

  const detectExt = async (bytes: Uint8Array): Promise<string | undefined> => {
    const { fileTypeFromBuffer } = await import('file-type');
    return (await fileTypeFromBuffer(bytes))?.ext;
  };

  it('lets a guest create a share on a completed job with a 7-day URL and public download of the result', async () => {
    const jobId = await completeUiJob();
    const job = await loadJob(jobId);
    const created = await postUiShare({ job_id: jobId });
    const createdBody = (await created.json()) as ShareCreatedBody;
    const row = await loadShareByToken(createdBody.token);
    const second = await postUiShare({ job_id: jobId });
    const secondBody = (await second.json()) as ShareCreatedBody;
    const publicGet = await getPublicShare(createdBody.token);
    const publicBody = (await publicGet.json()) as SharePublicBody;
    const download = await downloadPublicShare(createdBody.token);
    const downloaded = Buffer.from(await download.arrayBuffer());

    expect(created.status).toBe(201);
    expect(createdBody.token).toMatch(TOKEN_PATTERN);
    expect(createdBody.url).toBe(`/s/${createdBody.token}`);
    expect(Object.keys(createdBody).sort()).toEqual(['expires_at', 'token', 'url']);
    expect(Date.parse(createdBody.expires_at) - Date.now()).toBeGreaterThan(SEVEN_DAYS_MS - 5_000);
    expect(Date.parse(createdBody.expires_at) - Date.now()).toBeLessThanOrEqual(SEVEN_DAYS_MS);
    expect(row?.ownerUserId).toBeNull();
    expect(row?.jobId).toBe(jobId);
    expect(row?.fileId).toBeNull();
    expect(row?.revokedAt).toBeNull();
    expect(second.status).toBe(201);
    expect(secondBody.token).not.toBe(createdBody.token);
    expect(publicGet.status).toBe(200);
    expect(publicBody.name.length).toBeGreaterThan(0);
    expect(publicBody.format).toBe('png');
    expect(publicBody.size_bytes).toBe(job?.resultSize);
    expect(publicBody.expires_at).toBe(createdBody.expires_at);
    expect(publicBody.download_url).toBe(`/api/v1/public/s/${createdBody.token}/download`);
    expect(Object.keys(publicBody).sort()).toEqual([
      'download_url',
      'expires_at',
      'format',
      'name',
      'size_bytes',
    ]);
    expect(publicBody).not.toHaveProperty('owner_user_id');
    expect(publicBody).not.toHaveProperty('email');
    expect(publicBody).not.toHaveProperty('display_name');
    expect(download.status).toBe(200);
    expect(download.headers.get('content-type')).toMatch(/image\/png/);
    expect(await detectExt(downloaded)).toBe('png');
    expect(downloaded.equals(JPEG_BYTES)).toBe(false);
  });

  it('rejects a share of a queued or failed job as invalid_request', async () => {
    const queued = await postUiJob();
    const queuedBody = (await queued.json()) as JobCreatedBody;
    const failedId = crypto.randomUUID();
    const sourceStorageKey = uploadStorageKey(failedId);
    await storage.write(sourceStorageKey, Buffer.from('this-is-not-a-valid-jpeg'));
    await dataSource.getRepository(ConversionJob).save({
      id: failedId,
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
    await worker.processJobById(failedId);

    const queuedShare = await postUiShare({ job_id: queuedBody.id });
    const failedShare = await postUiShare({ job_id: failedId });
    const queuedError = (await queuedShare.json()) as ApiErrorBody;
    const failedError = (await failedShare.json()) as ApiErrorBody;

    expect(queuedShare.status).toBe(400);
    expect(failedShare.status).toBe(400);
    expect(queuedError.error.code).toBe('invalid_request');
    expect(failedError.error.code).toBe('invalid_request');
  });

  it('hides another user job from share create as not_found, same as a missing job_id', async () => {
    const owner = await register('share-hide-owner');
    const stranger = await register('share-hide-stranger');
    const jobId = await completeUiJob(owner.cookie);
    const missingId = crypto.randomUUID();

    const ownerShare = await postUiShare({ job_id: jobId }, owner.cookie);
    const guestShare = await postUiShare({ job_id: jobId });
    const strangerShare = await postUiShare({ job_id: jobId }, stranger.cookie);
    const missingShare = await postUiShare({ job_id: missingId });
    const ownerBody = (await ownerShare.json()) as ShareCreatedBody;
    const guestBody = (await guestShare.json()) as ApiErrorBody;
    const strangerBody = (await strangerShare.json()) as ApiErrorBody;
    const missingBody = (await missingShare.json()) as ApiErrorBody;

    expect(ownerShare.status).toBe(201);
    expect(ownerBody.url).toBe(`/s/${ownerBody.token}`);
    expect(guestShare.status).toBe(404);
    expect(strangerShare.status).toBe(404);
    expect(missingShare.status).toBe(404);
    expect(guestBody.error.code).toBe('not_found');
    expect(guestBody).toEqual(strangerBody);
    expect(guestBody).toEqual(missingBody);
  });

  it('rejects create without exactly one of job_id or file_id as invalid_request', async () => {
    const jobId = await completeUiJob();
    const empty = await postUiShare({});
    const both = await postUiShare({ job_id: jobId, file_id: crypto.randomUUID() });
    const emptyBody = (await empty.json()) as ApiErrorBody;
    const bothBody = (await both.json()) as ApiErrorBody;

    expect(empty.status).toBe(400);
    expect(both.status).toBe(400);
    expect(emptyBody.error.code).toBe('invalid_request');
    expect(bothBody.error.code).toBe('invalid_request');
  });

  it('lists only the owner active shares and does not let a guest see the list', async () => {
    const owner = await register('share-list-owner');
    const stranger = await register('share-list-stranger');
    const jobId = await completeUiJob(owner.cookie);
    const created = await postUiShare({ job_id: jobId }, owner.cookie);
    const createdBody = (await created.json()) as ShareCreatedBody;
    const guestList = await getUiShares();
    const ownerList = await getUiShares(owner.cookie);
    const strangerList = await getUiShares(stranger.cookie);
    const guestBody = (await guestList.json()) as ApiErrorBody;
    const ownerBody = (await ownerList.json()) as ShareListBody;
    const strangerBody = (await strangerList.json()) as ShareListBody;

    expect(guestList.status).toBe(401);
    expect(guestBody.error.code).toBe('unauthorized');
    expect(ownerList.status).toBe(200);
    expect(ownerBody.shares).toHaveLength(1);
    expect(ownerBody.shares[0]?.id).toMatch(UUID_PATTERN);
    expect(ownerBody.shares[0]?.url).toBe(createdBody.url);
    expect(ownerBody.shares[0]?.expires_at).toBe(createdBody.expires_at);
    expect(ownerBody.shares[0]?.file_name.length).toBeGreaterThan(0);
    expect(Object.keys(ownerBody.shares[0] ?? {}).sort()).toEqual([
      'expires_at',
      'file_name',
      'id',
      'url',
    ]);
    expect(strangerList.status).toBe(200);
    expect(strangerBody.shares).toEqual([]);
  });

  it('lets the owner revoke a share and then returns gone for public get and download', async () => {
    const owner = await register('share-revoke-owner');
    const stranger = await register('share-revoke-stranger');
    const jobId = await completeUiJob(owner.cookie);
    const created = await postUiShare({ job_id: jobId }, owner.cookie);
    const createdBody = (await created.json()) as ShareCreatedBody;
    const missingToken = crypto.randomUUID().replaceAll('-', '');

    const guestDelete = await deleteUiShare(createdBody.token);
    const strangerDelete = await deleteUiShare(createdBody.token, stranger.cookie);
    const missingDelete = await deleteUiShare(missingToken, owner.cookie);
    const ownerDelete = await deleteUiShare(createdBody.token, owner.cookie);
    const publicGet = await getPublicShare(createdBody.token);
    const download = await downloadPublicShare(createdBody.token);
    const ownerList = await getUiShares(owner.cookie);
    const guestDeleteBody = (await guestDelete.json()) as ApiErrorBody;
    const strangerDeleteBody = (await strangerDelete.json()) as ApiErrorBody;
    const missingDeleteBody = (await missingDelete.json()) as ApiErrorBody;
    const publicBody = (await publicGet.json()) as ApiErrorBody;
    const downloadBody = (await download.json()) as ApiErrorBody;
    const ownerListBody = (await ownerList.json()) as ShareListBody;

    expect(guestDelete.status).toBe(401);
    expect(guestDeleteBody.error.code).toBe('unauthorized');
    expect(strangerDelete.status).toBe(404);
    expect(missingDelete.status).toBe(404);
    expect(strangerDeleteBody.error.code).toBe('not_found');
    expect(strangerDeleteBody).toEqual(missingDeleteBody);
    expect(ownerDelete.status).toBe(204);
    expect(publicGet.status).toBe(410);
    expect(download.status).toBe(410);
    expect(publicBody.error.code).toBe('gone');
    expect(downloadBody.error.code).toBe('gone');
    expect(publicBody).toEqual(downloadBody);
    expect(ownerListBody.shares).toEqual([]);
  });

  it('returns gone for an expired share with the same error body as a revoked share, without owner details', async () => {
    const owner = await register('share-expiry-owner');
    const jobId = await completeUiJob(owner.cookie);
    const toExpire = await postUiShare({ job_id: jobId }, owner.cookie);
    const toRevoke = await postUiShare({ job_id: jobId }, owner.cookie);
    const expireBody = (await toExpire.json()) as ShareCreatedBody;
    const revokeBody = (await toRevoke.json()) as ShareCreatedBody;
    await dataSource
      .getRepository(ShareLink)
      .update({ token: expireBody.token }, { expiresAt: new Date(Date.now() - 1_000) });
    await deleteUiShare(revokeBody.token, owner.cookie);

    const expiredGet = await getPublicShare(expireBody.token);
    const revokedGet = await getPublicShare(revokeBody.token);
    const unknownGet = await getPublicShare('missing-share-token');
    const expiredDownload = await downloadPublicShare(expireBody.token);
    const ownerList = await getUiShares(owner.cookie);
    const expiredBody = (await expiredGet.json()) as ApiErrorBody;
    const revokedError = (await revokedGet.json()) as ApiErrorBody;
    const unknownBody = (await unknownGet.json()) as ApiErrorBody;
    const expiredDownloadBody = (await expiredDownload.json()) as ApiErrorBody;
    const ownerListBody = (await ownerList.json()) as ShareListBody;

    expect(expiredGet.status).toBe(410);
    expect(revokedGet.status).toBe(410);
    expect(expiredDownload.status).toBe(410);
    expect(expiredBody.error.code).toBe('gone');
    expect(expiredBody).toEqual(revokedError);
    expect(expiredBody).toEqual(expiredDownloadBody);
    expect(expiredBody).not.toHaveProperty('owner_user_id');
    expect(unknownGet.status).toBe(404);
    expect(unknownBody.error.code).toBe('not_found');
    expect(ownerListBody.shares).toEqual([]);
  });

  it('lets an API key create, list and revoke a share on the owner job, and rejects v1 shares without a key', async () => {
    const owner = await register('share-v1-owner');
    const stranger = await register('share-v1-stranger');
    const jobId = await completeV1Job(owner.apiKey);
    const unauthCreate = await postV1Share({ job_id: jobId });
    const unauthList = await getV1Shares();
    const created = await postV1Share({ job_id: jobId }, owner.apiKey);
    const createdBody = (await created.json()) as ShareCreatedBody;
    const strangerCreate = await postV1Share({ job_id: jobId }, stranger.apiKey);
    const ownerList = await getV1Shares(owner.apiKey);
    const strangerList = await getV1Shares(stranger.apiKey);
    const unauthDelete = await deleteV1Share(createdBody.token);
    const publicGet = await getPublicShare(createdBody.token);
    const ownerDelete = await deleteV1Share(createdBody.token, owner.apiKey);
    const afterRevoke = await getPublicShare(createdBody.token);
    const unauthCreateBody = (await unauthCreate.json()) as ApiErrorBody;
    const unauthListBody = (await unauthList.json()) as ApiErrorBody;
    const strangerCreateBody = (await strangerCreate.json()) as ApiErrorBody;
    const ownerListBody = (await ownerList.json()) as ShareListBody;
    const strangerListBody = (await strangerList.json()) as ShareListBody;
    const unauthDeleteBody = (await unauthDelete.json()) as ApiErrorBody;
    const publicBody = (await publicGet.json()) as SharePublicBody;
    const afterRevokeBody = (await afterRevoke.json()) as ApiErrorBody;

    expect(unauthCreate.status).toBe(401);
    expect(unauthList.status).toBe(401);
    expect(unauthDelete.status).toBe(401);
    expect(unauthCreateBody.error.code).toBe('unauthorized');
    expect(unauthListBody.error.code).toBe('unauthorized');
    expect(unauthDeleteBody.error.code).toBe('unauthorized');
    expect(created.status).toBe(201);
    expect(createdBody.url).toBe(`/s/${createdBody.token}`);
    expect(strangerCreate.status).toBe(404);
    expect(strangerCreateBody.error.code).toBe('not_found');
    expect(ownerList.status).toBe(200);
    expect(ownerListBody.shares).toHaveLength(1);
    expect(ownerListBody.shares[0]?.url).toBe(createdBody.url);
    expect(strangerListBody.shares).toEqual([]);
    expect(publicGet.status).toBe(200);
    expect(publicBody.format).toBe('png');
    expect(ownerDelete.status).toBe(204);
    expect(afterRevoke.status).toBe(410);
    expect(afterRevokeBody.error.code).toBe('gone');
  });

  it('lets the owner share a StoredFile by file_id and hides a stranger file as not_found', async () => {
    const owner = await register('share-file-owner');
    const stranger = await register('share-file-stranger');
    const jobId = await completeUiJob(owner.cookie);
    const job = await loadJob(jobId);
    const resultBytes =
      job?.resultStorageKey !== undefined && job.resultStorageKey !== null
        ? await storage.read(job.resultStorageKey)
        : Buffer.alloc(0);
    const fileId = crypto.randomUUID();
    await storage.write(profileStorageKey(owner.id, fileId), resultBytes);
    await dataSource.getRepository(StoredFile).save({
      id: fileId,
      userId: owner.id,
      jobId,
      name: 'photo.png',
      storageKey: profileStorageKey(owner.id, fileId),
      size: resultBytes.byteLength,
      source: 'ui',
    });
    const missingId = crypto.randomUUID();

    const ownerShare = await postUiShare({ file_id: fileId }, owner.cookie);
    const guestShare = await postUiShare({ file_id: fileId });
    const strangerShare = await postUiShare({ file_id: fileId }, stranger.cookie);
    const missingShare = await postUiShare({ file_id: missingId }, owner.cookie);
    const ownerBody = (await ownerShare.json()) as ShareCreatedBody;
    const guestBody = (await guestShare.json()) as ApiErrorBody;
    const strangerBody = (await strangerShare.json()) as ApiErrorBody;
    const missingBody = (await missingShare.json()) as ApiErrorBody;
    const publicGet = await getPublicShare(ownerBody.token);
    const publicBody = (await publicGet.json()) as SharePublicBody;
    const download = await downloadPublicShare(ownerBody.token);
    const downloaded = Buffer.from(await download.arrayBuffer());

    expect(ownerShare.status).toBe(201);
    expect(guestShare.status).toBe(404);
    expect(strangerShare.status).toBe(404);
    expect(missingShare.status).toBe(404);
    expect(guestBody.error.code).toBe('not_found');
    expect(guestBody).toEqual(strangerBody);
    expect(guestBody).toEqual(missingBody);
    expect(publicGet.status).toBe(200);
    expect(publicBody.name).toBe('photo.png');
    expect(publicBody.format).toBe('png');
    expect(publicBody.size_bytes).toBe(resultBytes.byteLength);
    expect(download.status).toBe(200);
    expect(await detectExt(downloaded)).toBe('png');
  });
});
