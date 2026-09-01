import { type INestApplication, Logger } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DataSource } from 'typeorm';
import { AUTH_COOKIE_NAME } from '@/common/auth-cookie';
import { uploadStorageKey } from '@/file-store/storage-key';
import { StorageService } from '@/file-store/storage.service';
import { ConversionJob } from '@/jobs/conversion-job.entity';
import { JobWorkerService } from '@/worker/job-worker.service';
import { createHttpApp } from './create-http-app';

const VALID_PASSWORD = 'Abcdefg1';

const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/9k=',
  'base64',
);

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

const collectLoggerLines = (): { lines: string[]; restore: () => void } => {
  const lines: string[] = [];
  const push = (message: unknown): void => {
    if (typeof message === 'string') {
      lines.push(message);
    }
  };
  const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(push);
  const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(push);

  return {
    lines,
    restore: () => {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
};

describe('логи воркера (ТЗ §10: job id, user id, статус, без PII файла)', () => {
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

  const register = async (label: string): Promise<{ cookie: string; id: string }> => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: 'Иван',
        email: uniqueEmail(label),
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
    const createdBody = (await created.json()) as JobCreatedBody;
    return createdBody.id;
  };

  it('гостевая задача пишет job id, user guest и статусы processing → completed, без имени файла', async () => {
    const jobId = await postUiJob();
    const logger = collectLoggerLines();

    try {
      await worker.processJobById(jobId);
      const jobLines = logger.lines.filter((line) => line.startsWith(`job ${jobId} `));

      expect(jobLines).toEqual([
        `job ${jobId} user guest processing`,
        `job ${jobId} user guest completed`,
      ]);
      expect(logger.lines.join('\n')).not.toMatch(/photo\.jpg/i);
    } finally {
      logger.restore();
    }
  });

  it('задача пользователя пишет тот же user id, что у владельца', async () => {
    const owner = await register('worker-log-user');
    const jobId = await postUiJob(owner.cookie);
    const logger = collectLoggerLines();

    try {
      await worker.processJobById(jobId);
      const jobLines = logger.lines.filter((line) => line.startsWith(`job ${jobId} `));

      expect(jobLines).toEqual([
        `job ${jobId} user ${owner.id} processing`,
        `job ${jobId} user ${owner.id} completed`,
      ]);
    } finally {
      logger.restore();
    }
  });

  it('ошибка движка пишет failed и код, без тела файла', async () => {
    const owner = await register('worker-log-fail');
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
    const logger = collectLoggerLines();

    try {
      await worker.processJobById(failedId);
      const jobLines = logger.lines.filter((line) => line.startsWith(`job ${failedId} `));

      expect(jobLines).toEqual([
        `job ${failedId} user ${owner.id} processing`,
        `job ${failedId} user ${owner.id} failed conversion_failed`,
      ]);
      expect(logger.lines.join('\n')).not.toContain('this-is-not-a-valid-jpeg');
    } finally {
      logger.restore();
    }
  });
});
