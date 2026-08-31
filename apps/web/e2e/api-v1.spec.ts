import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { registerAccount } from './helpers/auth';
import { createJpegFile } from './helpers/files';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test.describe('Публичный API /api/v1', () => {
  test.describe.configure({ timeout: 90_000 });

  test('ключ из ЛК конвертирует файл через X-API-Key без cookie-сессии', async ({
    page,
    request,
  }) => {
    await registerAccount(page);
    await page.getByRole('button', { name: 'Показать API-ключ' }).click();
    const apiKey = (await page.getByRole('code').innerText()).trim();
    expect(apiKey).toMatch(/^cv_live_/);

    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();

    const jpeg = createJpegFile();
    const created = await request.post('/api/v1/jobs', {
      headers: { 'X-API-Key': apiKey },
      multipart: {
        file: {
          name: jpeg.name,
          mimeType: jpeg.mimeType,
          buffer: jpeg.buffer,
        },
        target_format: 'png',
      },
    });
    const createdBody = (await created.json()) as { id: string; status: string };

    expect(created.status()).toBe(202);
    expect(createdBody.status).toBe('queued');

    await expect
      .poll(
        async () => {
          const polled = await request.get(`/api/v1/jobs/${createdBody.id}`, {
            headers: { 'X-API-Key': apiKey },
          });
          const body = (await polled.json()) as { status: string };
          return body.status;
        },
        { timeout: 60_000, intervals: [2_000] },
      )
      .toBe('completed');

    const statusResponse = await request.get(`/api/v1/jobs/${createdBody.id}`, {
      headers: { 'X-API-Key': apiKey },
    });
    const statusBody = (await statusResponse.json()) as {
      source_format: string;
      target_format: string;
      saved_to_profile?: boolean;
      download_url?: string;
    };

    expect(statusBody.source_format).toBe('jpg');
    expect(statusBody.target_format).toBe('png');
    expect(statusBody.saved_to_profile).toBe(false);
    expect(statusBody.download_url).toBe(`/api/v1/jobs/${createdBody.id}/download`);

    const download = await request.get(`/api/v1/jobs/${createdBody.id}/download`, {
      headers: { 'X-API-Key': apiKey },
    });
    const bytes = Buffer.from(await download.body());

    expect(download.status()).toBe(200);
    expect(download.headers()['content-type']).toMatch(/image\/png/);
    expect(bytes.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  });
});
