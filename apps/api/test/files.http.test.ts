import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { DOWNLOAD_TOKEN_PURPOSE } from '@/common/signed-download-token';
import { profileStorageKey, resultStorageKey, uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { JobWorkerService } from '@/worker/job-worker.service';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/9k=',
  'base64',
);

type ApiErrorBody = { error: { code: string; message: string } };
type JobCreatedBody = { id: string; status: string };
type JobStatusBody = {
  id: string;
  status: string;
  saved_to_profile?: boolean;
  download_url?: string;
};
type ShareCreatedBody = { token: string; url: string; expires_at: string };
type FileListItem = {
  id: string;
  name: string;
  format: string;
  size_bytes: number;
  created_at: string;
  source: 'ui' | 'api';
  download_url: string;
};
type FileListBody = { files: FileListItem[] };

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

describe('StoredFile HTTP (план §9, ТЗ §4.5 / §7.3 / §8 / UC-03)', () => {
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

  const patchMe = async (cookie: string, body: Record<string, unknown>): Promise<Response> =>
    fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });

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

  const getV1Job = async (id: string, apiKey: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/jobs/${id}`, {
      headers: { 'X-API-Key': apiKey },
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

  const listUiFiles = async (cookie?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/files`, {
      headers: cookie ? { Cookie: cookie } : undefined,
    });

  const listV1Files = async (apiKey?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/files`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
    });

  const deleteUiFile = async (id: string, cookie?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/files/${id}`, {
      method: 'DELETE',
      headers: cookie ? { Cookie: cookie } : undefined,
    });

  const deleteV1File = async (id: string, apiKey?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/files/${id}`, {
      method: 'DELETE',
      headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
    });

  const downloadUiFile = async (
    id: string,
    options?: { cookie?: string; token?: string },
  ): Promise<Response> => {
    const url = new URL(`${baseUrl}/api/files/${id}/download`);
    if (options?.token) {
      url.searchParams.set('token', options.token);
    }

    return fetch(url, {
      headers: options?.cookie ? { Cookie: options.cookie } : undefined,
    });
  };

  const downloadV1File = async (id: string, apiKey?: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/files/${id}/download`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
    });

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

  const getPublicShare = async (token: string): Promise<Response> =>
    fetch(`${baseUrl}/api/v1/public/s/${encodeURIComponent(token)}`);

  const loadJob = async (id: string): Promise<ConversionJob | null> =>
    dataSource.getRepository(ConversionJob).findOneBy({ id });

  const loadFilesForUser = async (userId: string): Promise<StoredFile[]> =>
    dataSource.getRepository(StoredFile).find({ where: { userId } });

  const detectExt = async (bytes: Uint8Array): Promise<string | undefined> => {
    const { fileTypeFromBuffer } = await import('file-type');
    return (await fileTypeFromBuffer(bytes))?.ext;
  };

  it('does not create a StoredFile for a guest or for a user with save_conversions off', async () => {
    const user = await register('files-save-off');
    const guestJobId = await completeUiJob();
    const userJobId = await completeUiJob(user.cookie);
    const guestPolled = await getUiJob(guestJobId);
    const userPolled = await getUiJob(userJobId, user.cookie);
    const guestBody = (await guestPolled.json()) as JobStatusBody;
    const userBody = (await userPolled.json()) as JobStatusBody;
    const guestFiles = await dataSource
      .getRepository(StoredFile)
      .find({ where: { jobId: guestJobId } });
    const userFiles = await loadFilesForUser(user.id);
    const listed = await listUiFiles(user.cookie);
    const listedBody = (await listed.json()) as FileListBody;

    expect(guestBody.saved_to_profile).toBe(false);
    expect(userBody.saved_to_profile).toBe(false);
    expect(guestFiles).toEqual([]);
    expect(userFiles).toEqual([]);
    expect(listed.status).toBe(200);
    expect(listedBody.files).toEqual([]);
  });

  it('saves a UI conversion to the profile when save_conversions is on and lists it for the owner', async () => {
    const owner = await register('files-save-ui');
    await patchMe(owner.cookie, { save_conversions: true });
    const jobId = await completeUiJob(owner.cookie);
    const job = await loadJob(jobId);
    const polled = await getUiJob(jobId, owner.cookie);
    const polledBody = (await polled.json()) as JobStatusBody;
    const listed = await listUiFiles(owner.cookie);
    const listedBody = (await listed.json()) as FileListBody;
    const file = listedBody.files[0];
    const stored = file
      ? await dataSource.getRepository(StoredFile).findOneBy({ id: file.id })
      : null;
    const profileBytes =
      file !== undefined
        ? await storage.read(profileStorageKey(owner.id, file.id))
        : Buffer.alloc(0);
    const download = await fetch(absoluteUrl(baseUrl, file?.download_url ?? ''));
    const downloaded = Buffer.from(await download.arrayBuffer());

    expect(polledBody.status).toBe('completed');
    expect(polledBody.saved_to_profile).toBe(true);
    expect(listed.status).toBe(200);
    expect(listedBody.files).toHaveLength(1);
    expect(file?.id).toMatch(UUID_PATTERN);
    expect(file?.name.length).toBeGreaterThan(0);
    expect(file?.format).toBe('png');
    expect(file?.size_bytes).toBe(job?.resultSize);
    expect(Date.parse(file?.created_at ?? '')).not.toBeNaN();
    expect(file?.source).toBe('ui');
    expect(file?.download_url).toMatch(new RegExp(`^/api/files/${file?.id}/download\\?token=`));
    expect(Object.keys(file ?? {}).sort()).toEqual([
      'created_at',
      'download_url',
      'format',
      'id',
      'name',
      'size_bytes',
      'source',
    ]);
    expect(stored?.jobId).toBe(jobId);
    expect(stored?.storageKey).toBe(profileStorageKey(owner.id, file?.id ?? ''));
    expect(await detectExt(profileBytes)).toBe('png');
    expect(download.status).toBe(200);
    expect(await detectExt(downloaded)).toBe('png');
    expect(await storage.read(resultStorageKey(jobId))).toEqual(profileBytes);
  });

  it('saves an API conversion to the profile with source api and lists it on both channels', async () => {
    const owner = await register('files-save-api');
    await patchMe(owner.cookie, { save_conversions: true });
    const jobId = await completeV1Job(owner.apiKey);
    const polled = await getV1Job(jobId, owner.apiKey);
    const polledBody = (await polled.json()) as JobStatusBody;
    const uiList = await listUiFiles(owner.cookie);
    const v1List = await listV1Files(owner.apiKey);
    const uiBody = (await uiList.json()) as FileListBody;
    const v1Body = (await v1List.json()) as FileListBody;
    const file = v1Body.files[0];
    const v1Download = await downloadV1File(file?.id ?? '', owner.apiKey);

    expect(polledBody.saved_to_profile).toBe(true);
    expect(uiList.status).toBe(200);
    expect(v1List.status).toBe(200);
    expect(uiBody.files).toHaveLength(1);
    expect(v1Body.files).toHaveLength(1);
    expect(file?.source).toBe('api');
    expect(file?.format).toBe('png');
    expect(file?.download_url).toBe(`/api/v1/files/${file?.id}/download`);
    expect(uiBody.files[0]?.id).toBe(file?.id);
    expect(v1Download.status).toBe(200);
    expect(await detectExt(Buffer.from(await v1Download.arrayBuffer()))).toBe('png');
  });

  it('does not create a StoredFile when conversion fails even if save_conversions is on', async () => {
    const owner = await register('files-failed');
    await patchMe(owner.cookie, { save_conversions: true });
    const failedId = crypto.randomUUID();
    const sourceStorageKey = uploadStorageKey(failedId);
    await storage.write(sourceStorageKey, Buffer.from('this-is-not-a-valid-jpeg'));
    await dataSource.getRepository(ConversionJob).save({
      id: failedId,
      userId: owner.id,
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
    const polled = await getUiJob(failedId, owner.cookie);
    const polledBody = (await polled.json()) as JobStatusBody;
    const files = await loadFilesForUser(owner.id);
    const listed = await listUiFiles(owner.cookie);
    const listedBody = (await listed.json()) as FileListBody;

    expect(polledBody.status).toBe('failed');
    expect(polledBody.saved_to_profile).toBeUndefined();
    expect(files).toEqual([]);
    expect(listedBody.files).toEqual([]);
  });

  it('keeps already stored files and their shares after save_conversions is turned off, and does not save new jobs', async () => {
    const owner = await register('files-toggle-off');
    await patchMe(owner.cookie, { save_conversions: true });
    const savedJobId = await completeUiJob(owner.cookie);
    const listedBefore = await listUiFiles(owner.cookie);
    const beforeBody = (await listedBefore.json()) as FileListBody;
    const fileId = beforeBody.files[0]?.id ?? '';
    const share = await postUiShare({ file_id: fileId }, owner.cookie);
    const shareBody = (await share.json()) as ShareCreatedBody;
    await patchMe(owner.cookie, { save_conversions: false });
    const unsavedJobId = await completeUiJob(owner.cookie);
    const unsavedPolled = await getUiJob(unsavedJobId, owner.cookie);
    const unsavedBody = (await unsavedPolled.json()) as JobStatusBody;
    const listedAfter = await listUiFiles(owner.cookie);
    const afterBody = (await listedAfter.json()) as FileListBody;
    const publicGet = await getPublicShare(shareBody.token);
    const stored = await dataSource.getRepository(StoredFile).findOneBy({ id: fileId });

    expect(beforeBody.files).toHaveLength(1);
    expect(unsavedBody.saved_to_profile).toBe(false);
    expect(afterBody.files).toHaveLength(1);
    expect(afterBody.files[0]?.id).toBe(fileId);
    expect(afterBody.files[0]?.id).not.toBe(unsavedJobId);
    expect(stored?.jobId).toBe(savedJobId);
    expect(share.status).toBe(201);
    expect(publicGet.status).toBe(200);
  });

  it('lists only the owner files and rejects a guest or missing API key as unauthorized', async () => {
    const owner = await register('files-list-owner');
    const stranger = await register('files-list-stranger');
    await patchMe(owner.cookie, { save_conversions: true });
    await completeUiJob(owner.cookie);
    const guestList = await listUiFiles();
    const ownerList = await listUiFiles(owner.cookie);
    const strangerList = await listUiFiles(stranger.cookie);
    const unauthV1 = await listV1Files();
    const ownerV1 = await listV1Files(owner.apiKey);
    const strangerV1 = await listV1Files(stranger.apiKey);
    const guestBody = (await guestList.json()) as ApiErrorBody;
    const ownerBody = (await ownerList.json()) as FileListBody;
    const strangerBody = (await strangerList.json()) as FileListBody;
    const unauthBody = (await unauthV1.json()) as ApiErrorBody;
    const ownerV1Body = (await ownerV1.json()) as FileListBody;
    const strangerV1Body = (await strangerV1.json()) as FileListBody;

    expect(guestList.status).toBe(401);
    expect(guestBody.error.code).toBe('unauthorized');
    expect(unauthV1.status).toBe(401);
    expect(unauthBody.error.code).toBe('unauthorized');
    expect(ownerList.status).toBe(200);
    expect(ownerBody.files).toHaveLength(1);
    expect(strangerList.status).toBe(200);
    expect(strangerBody.files).toEqual([]);
    expect(ownerV1Body.files).toHaveLength(1);
    expect(ownerV1Body.files[0]?.id).toBe(ownerBody.files[0]?.id);
    expect(strangerV1Body.files).toEqual([]);
  });

  it('lets the owner download a StoredFile by cookie or signed URL and hides it from a stranger as not_found', async () => {
    const owner = await register('files-download-owner');
    const stranger = await register('files-download-stranger');
    await patchMe(owner.cookie, { save_conversions: true });
    await completeUiJob(owner.cookie);
    const listed = await listUiFiles(owner.cookie);
    const listedBody = (await listed.json()) as FileListBody;
    const fileId = listedBody.files[0]?.id ?? '';
    const signed = await fetch(absoluteUrl(baseUrl, listedBody.files[0]?.download_url ?? ''));
    const byCookie = await downloadUiFile(fileId, { cookie: owner.cookie });
    const strangerDownload = await downloadUiFile(fileId, { cookie: stranger.cookie });
    const missingId = crypto.randomUUID();
    const missingDownload = await downloadUiFile(missingId, { cookie: owner.cookie });
    const guestDownload = await downloadUiFile(fileId);
    const expired = jwt.sign({
      purpose: DOWNLOAD_TOKEN_PURPOSE,
      fileId,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const expiredDownload = await downloadUiFile(fileId, { token: expired });
    const strangerBody = (await strangerDownload.json()) as ApiErrorBody;
    const missingBody = (await missingDownload.json()) as ApiErrorBody;
    const guestBody = (await guestDownload.json()) as ApiErrorBody;
    const expiredBody = (await expiredDownload.json()) as ApiErrorBody;

    expect(signed.status).toBe(200);
    expect(await detectExt(Buffer.from(await signed.arrayBuffer()))).toBe('png');
    expect(byCookie.status).toBe(200);
    expect(await detectExt(Buffer.from(await byCookie.arrayBuffer()))).toBe('png');
    expect(Date.parse(listedBody.files[0]?.created_at ?? '')).not.toBeNaN();
    expect(guestDownload.status).toBe(404);
    expect(guestBody.error.code).toBe('not_found');
    expect(strangerDownload.status).toBe(404);
    expect(missingDownload.status).toBe(404);
    expect(strangerBody.error.code).toBe('not_found');
    expect(strangerBody).toEqual(missingBody);
    expect(expiredDownload.status).toBe(410);
    expect(expiredBody.error.code).toBe('gone');
  });

  it('lets the owner delete a StoredFile from disk and DB and revokes related shares as gone', async () => {
    const owner = await register('files-delete-owner');
    const stranger = await register('files-delete-stranger');
    await patchMe(owner.cookie, { save_conversions: true });
    await completeUiJob(owner.cookie);
    const listed = await listUiFiles(owner.cookie);
    const listedBody = (await listed.json()) as FileListBody;
    const fileId = listedBody.files[0]?.id ?? '';
    const share = await postUiShare({ file_id: fileId }, owner.cookie);
    const shareBody = (await share.json()) as ShareCreatedBody;
    const guestDelete = await deleteUiFile(fileId);
    const strangerDelete = await deleteUiFile(fileId, stranger.cookie);
    const missingDelete = await deleteUiFile(crypto.randomUUID(), owner.cookie);
    const ownerDelete = await deleteUiFile(fileId, owner.cookie);
    const afterList = await listUiFiles(owner.cookie);
    const afterBody = (await afterList.json()) as FileListBody;
    const publicGet = await getPublicShare(shareBody.token);
    const stored = await dataSource.getRepository(StoredFile).findOneBy({ id: fileId });
    const guestBody = (await guestDelete.json()) as ApiErrorBody;
    const strangerBody = (await strangerDelete.json()) as ApiErrorBody;
    const missingBody = (await missingDelete.json()) as ApiErrorBody;
    const publicBody = (await publicGet.json()) as ApiErrorBody;

    expect(guestDelete.status).toBe(401);
    expect(guestBody.error.code).toBe('unauthorized');
    expect(strangerDelete.status).toBe(404);
    expect(missingDelete.status).toBe(404);
    expect(strangerBody.error.code).toBe('not_found');
    expect(strangerBody).toEqual(missingBody);
    expect(ownerDelete.status).toBe(204);
    expect(afterBody.files).toEqual([]);
    expect(stored).toBeNull();
    await expect(storage.read(profileStorageKey(owner.id, fileId))).rejects.toThrow();
    expect(publicGet.status).toBe(410);
    expect(publicBody.error.code).toBe('gone');
  });

  it('lets an API key list, download and delete the owner file, and rejects v1 files without a key', async () => {
    const owner = await register('files-v1-owner');
    const stranger = await register('files-v1-stranger');
    await patchMe(owner.cookie, { save_conversions: true });
    await completeV1Job(owner.apiKey);
    const unauthList = await listV1Files();
    const ownerList = await listV1Files(owner.apiKey);
    const ownerBody = (await ownerList.json()) as FileListBody;
    const fileId = ownerBody.files[0]?.id ?? '';
    const unauthDownload = await downloadV1File(fileId);
    const strangerDownload = await downloadV1File(fileId, stranger.apiKey);
    const ownerDownload = await downloadV1File(fileId, owner.apiKey);
    const unauthDelete = await deleteV1File(fileId);
    const strangerDelete = await deleteV1File(fileId, stranger.apiKey);
    const ownerDelete = await deleteV1File(fileId, owner.apiKey);
    const afterList = await listV1Files(owner.apiKey);
    const afterBody = (await afterList.json()) as FileListBody;
    const unauthListBody = (await unauthList.json()) as ApiErrorBody;
    const unauthDownloadBody = (await unauthDownload.json()) as ApiErrorBody;
    const strangerDownloadBody = (await strangerDownload.json()) as ApiErrorBody;
    const unauthDeleteBody = (await unauthDelete.json()) as ApiErrorBody;
    const strangerDeleteBody = (await strangerDelete.json()) as ApiErrorBody;

    expect(unauthList.status).toBe(401);
    expect(unauthDownload.status).toBe(401);
    expect(unauthDelete.status).toBe(401);
    expect(unauthListBody.error.code).toBe('unauthorized');
    expect(unauthDownloadBody.error.code).toBe('unauthorized');
    expect(unauthDeleteBody.error.code).toBe('unauthorized');
    expect(ownerList.status).toBe(200);
    expect(ownerBody.files).toHaveLength(1);
    expect(ownerDownload.status).toBe(200);
    expect(strangerDownload.status).toBe(404);
    expect(strangerDownloadBody.error.code).toBe('not_found');
    expect(strangerDelete.status).toBe(404);
    expect(strangerDeleteBody.error.code).toBe('not_found');
    expect(ownerDelete.status).toBe(204);
    expect(afterBody.files).toEqual([]);
  });
});
