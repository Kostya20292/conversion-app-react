import { type INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { StoredFile } from '@/files/stored-file.entity';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { ShareLink } from '@/shares/share-link.entity';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

type ApiErrorBody = { error: { code: string; message: string } };
type FileListBody = {
  files: { id: string; name: string }[];
  next_cursor: string | null;
};
type ShareListBody = {
  shares: { id: string }[];
  next_cursor: string | null;
};

const uniqueEmail = (label: string): string => `${label}.${crypto.randomUUID()}@example.com`;

const findAuthSetCookie = (response: Response): string | undefined =>
  response.headers.getSetCookie().find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`));

const authCookieHeader = (setCookie: string): string => setCookie.split(';', 1)[0] ?? '';

describe('cursor lists HTTP (ТЗ §4.5 / §7.3, database cursor не OFFSET)', () => {
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
  ): Promise<{ cookie: string; id: string; apiKey: string }> => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: 'Иван',
        email: uniqueEmail(label),
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

  const listUiFiles = async (
    cookie: string,
    query: { cursor?: string; limit?: string } = {},
  ): Promise<Response> => {
    const url = new URL(`${baseUrl}/api/files`);
    if (query.cursor !== undefined) {
      url.searchParams.set('cursor', query.cursor);
    }

    if (query.limit !== undefined) {
      url.searchParams.set('limit', query.limit);
    }

    return fetch(url, { headers: { Cookie: cookie } });
  };

  const listV1Files = async (
    apiKey: string,
    query: { cursor?: string; limit?: string } = {},
  ): Promise<Response> => {
    const url = new URL(`${baseUrl}/api/v1/files`);
    if (query.cursor !== undefined) {
      url.searchParams.set('cursor', query.cursor);
    }

    if (query.limit !== undefined) {
      url.searchParams.set('limit', query.limit);
    }

    return fetch(url, { headers: { 'X-API-Key': apiKey } });
  };

  const listUiShares = async (
    cookie: string,
    query: { cursor?: string; limit?: string } = {},
  ): Promise<Response> => {
    const url = new URL(`${baseUrl}/api/shares`);
    if (query.cursor !== undefined) {
      url.searchParams.set('cursor', query.cursor);
    }

    if (query.limit !== undefined) {
      url.searchParams.set('limit', query.limit);
    }

    return fetch(url, { headers: { Cookie: cookie } });
  };

  const listV1Shares = async (
    apiKey: string,
    query: { cursor?: string; limit?: string } = {},
  ): Promise<Response> => {
    const url = new URL(`${baseUrl}/api/v1/shares`);
    if (query.cursor !== undefined) {
      url.searchParams.set('cursor', query.cursor);
    }

    if (query.limit !== undefined) {
      url.searchParams.set('limit', query.limit);
    }

    return fetch(url, { headers: { 'X-API-Key': apiKey } });
  };

  const seedFiles = async (userId: string, count: number): Promise<string[]> => {
    const ids = Array.from({ length: count }, () => crypto.randomUUID());
    await dataSource.getRepository(StoredFile).save(
      ids.map((id, index) => ({
        id,
        userId,
        jobId: null,
        name: `file-${String(index).padStart(2, '0')}.png`,
        storageKey: `profile/${userId}/${id}`,
        size: 10,
        source: 'ui' as const,
      })),
    );

    for (const [index, id] of ids.entries()) {
      await dataSource.query('UPDATE stored_file SET created_at = $1 WHERE id = $2', [
        new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
        id,
      ]);
    }

    return ids;
  };

  const seedShares = async (userId: string, count: number): Promise<string[]> => {
    const jobId = crypto.randomUUID();
    await dataSource.getRepository(ConversionJob).save({
      id: jobId,
      userId,
      sourceFormat: 'jpg',
      targetFormat: 'png',
      status: 'completed',
      sourceOfRequest: 'ui',
      errorCode: null,
      sourceSize: 10,
      resultSize: 10,
      sourceStorageKey: `uploads/${jobId}`,
      sourceFileName: 'photo.jpg',
      resultStorageKey: `results/${jobId}`,
      finishedAt: new Date(),
    });

    const ids = Array.from({ length: count }, () => crypto.randomUUID());
    await dataSource.getRepository(ShareLink).save(
      ids.map((id) => ({
        id,
        token: crypto.randomUUID().replaceAll('-', ''),
        ownerUserId: userId,
        jobId,
        fileId: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      })),
    );

    for (const [index, id] of ids.entries()) {
      await dataSource.query('UPDATE share_link SET created_at = $1 WHERE id = $2', [
        new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
        id,
      ]);
    }

    return ids;
  };

  it('без limit отдаёт первую страницу из 20 файлов, newest first, и next_cursor на остаток', async () => {
    const owner = await register('files-page-default');
    const ids = await seedFiles(owner.id, DEFAULT_LIST_LIMIT + 1);
    const listed = await listUiFiles(owner.cookie);
    const body = (await listed.json()) as FileListBody;

    expect(listed.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['files', 'next_cursor']);
    expect(body.files).toHaveLength(DEFAULT_LIST_LIMIT);
    expect(body.files.map((file) => file.id)).toEqual(ids.slice(1).toReversed());
    expect(typeof body.next_cursor).toBe('string');
    expect(body.next_cursor).toBeTruthy();
  });

  it('следующая страница файлов по cursor не пересекается с первой и закрывает список', async () => {
    const owner = await register('files-page-next');
    const ids = await seedFiles(owner.id, DEFAULT_LIST_LIMIT + 1);
    const first = await listUiFiles(owner.cookie);
    const firstBody = (await first.json()) as FileListBody;
    const second = await listUiFiles(owner.cookie, { cursor: firstBody.next_cursor ?? '' });
    const secondBody = (await second.json()) as FileListBody;
    const firstIds = firstBody.files.map((file) => file.id);
    const secondIds = secondBody.files.map((file) => file.id);

    expect(second.status).toBe(200);
    expect(secondBody.files).toHaveLength(1);
    expect(secondIds).toEqual([ids[0]]);
    expect(firstIds).not.toContain(ids[0]);
    expect(new Set([...firstIds, ...secondIds]).size).toBe(DEFAULT_LIST_LIMIT + 1);
    expect(secondBody.next_cursor).toBeNull();
  });

  it('limit режет страницу файлов, а невалидные limit и cursor дают invalid_request', async () => {
    const owner = await register('files-page-limit');
    const ids = await seedFiles(owner.id, 3);
    const listed = await listUiFiles(owner.cookie, { limit: '2' });
    const body = (await listed.json()) as FileListBody;
    const overMax = await listUiFiles(owner.cookie, { limit: String(MAX_LIST_LIMIT + 1) });
    const zero = await listUiFiles(owner.cookie, { limit: '0' });
    const garbageCursor = await listUiFiles(owner.cookie, { cursor: 'not-a-cursor' });
    const overMaxBody = (await overMax.json()) as ApiErrorBody;
    const zeroBody = (await zero.json()) as ApiErrorBody;
    const garbageBody = (await garbageCursor.json()) as ApiErrorBody;

    expect(listed.status).toBe(200);
    expect(body.files).toHaveLength(2);
    expect(body.files.map((file) => file.id)).toEqual([ids[2], ids[1]]);
    expect(body.next_cursor).toBeTruthy();
    expect(overMax.status).toBe(400);
    expect(zero.status).toBe(400);
    expect(garbageCursor.status).toBe(400);
    expect(overMaxBody.error.code).toBe('invalid_request');
    expect(zeroBody.error.code).toBe('invalid_request');
    expect(garbageBody.error.code).toBe('invalid_request');
  });

  it('GET /api/v1/files отдаёт тот же конверт страницы по X-API-Key', async () => {
    const owner = await register('files-page-v1');
    await seedFiles(owner.id, 3);
    const listed = await listV1Files(owner.apiKey, { limit: '2' });
    const body = (await listed.json()) as FileListBody;

    expect(listed.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['files', 'next_cursor']);
    expect(body.files).toHaveLength(2);
    expect(body.next_cursor).toBeTruthy();
  });

  it('без limit отдаёт первую страницу из 20 share-ссылок, newest first, и next_cursor на остаток', async () => {
    const owner = await register('shares-page-default');
    const ids = await seedShares(owner.id, DEFAULT_LIST_LIMIT + 1);
    const listed = await listUiShares(owner.cookie);
    const body = (await listed.json()) as ShareListBody;

    expect(listed.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['next_cursor', 'shares']);
    expect(body.shares).toHaveLength(DEFAULT_LIST_LIMIT);
    expect(body.shares.map((share) => share.id)).toEqual(ids.slice(1).toReversed());
    expect(typeof body.next_cursor).toBe('string');
    expect(body.next_cursor).toBeTruthy();
  });

  it('следующая страница shares по cursor не пересекается с первой и закрывает список', async () => {
    const owner = await register('shares-page-next');
    const ids = await seedShares(owner.id, DEFAULT_LIST_LIMIT + 1);
    const first = await listUiShares(owner.cookie);
    const firstBody = (await first.json()) as ShareListBody;
    const second = await listUiShares(owner.cookie, { cursor: firstBody.next_cursor ?? '' });
    const secondBody = (await second.json()) as ShareListBody;
    const firstIds = firstBody.shares.map((share) => share.id);
    const secondIds = secondBody.shares.map((share) => share.id);

    expect(second.status).toBe(200);
    expect(secondBody.shares).toHaveLength(1);
    expect(secondIds).toEqual([ids[0]]);
    expect(firstIds).not.toContain(ids[0]);
    expect(new Set([...firstIds, ...secondIds]).size).toBe(DEFAULT_LIST_LIMIT + 1);
    expect(secondBody.next_cursor).toBeNull();
  });

  it('GET /api/v1/shares отдаёт тот же конверт страницы по X-API-Key', async () => {
    const owner = await register('shares-page-v1');
    await seedShares(owner.id, 3);
    const listed = await listV1Shares(owner.apiKey, { limit: '2' });
    const body = (await listed.json()) as ShareListBody;

    expect(listed.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['next_cursor', 'shares']);
    expect(body.shares).toHaveLength(2);
    expect(body.next_cursor).toBeTruthy();
  });
});
