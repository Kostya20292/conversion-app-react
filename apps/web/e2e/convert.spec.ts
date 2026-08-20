import { expect, test } from '@playwright/test';
import { createDocxFile } from './helpers/files';

/**
 * После Nest отдельно (не этот файл):
 * unit `error.code` → RU; MIME по magic bytes; хэш API-ключа в `apps/api`.
 */

test.describe('Конвертация', () => {
  test('гость выбирает один DOCX и может нажать «Конвертировать»', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Convertly — конвертация файлов онлайн');
    await expect(page.getByRole('button', { name: 'Конвертировать' })).toBeDisabled();

    await page.getByRole('radio', { name: 'DOCX → PDF' }).click();
    await page.getByLabel('Выбрать файл для конвертации').setInputFiles(createDocxFile());

    await expect(page.getByRole('button', { name: 'Конвертировать' })).toBeEnabled();
  });

  test.fixme('после Nest: гость конвертирует один DOCX в PDF и скачивает результат', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'DOCX → PDF' }).click();
    await page.getByLabel('Выбрать файл для конвертации').setInputFiles(createDocxFile());
    await page.getByRole('button', { name: 'Конвертировать' }).click();

    await expect(page.getByRole('button', { name: /Скачать/ })).toBeVisible({
      timeout: 60_000,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Скачать/ }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/);
  });
});
