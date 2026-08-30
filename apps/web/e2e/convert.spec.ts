import { expect, test } from '@playwright/test';
import { createDocxFile, createJpegFile } from './helpers/files';

test.describe('Конвертация', () => {
  test.describe.configure({ timeout: 90_000 });

  test('гость выбирает один DOCX и может нажать «Конвертировать»', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Convertly — конвертация файлов онлайн');
    await expect(page.getByRole('button', { name: 'Конвертировать' })).toBeDisabled();

    await page.getByRole('radio', { name: 'DOCX → PDF' }).click();
    await page.getByLabel('Выбрать файл для конвертации').setInputFiles(createDocxFile());

    await expect(page.getByRole('button', { name: 'Конвертировать' })).toBeEnabled();
  });

  test('гость конвертирует один файл и скачивает результат', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'JPG → PNG' }).click();
    await page.getByLabel('Выбрать файл для конвертации').setInputFiles(createJpegFile());
    await page.getByRole('button', { name: 'Конвертировать' }).click();

    await expect(page.getByRole('button', { name: /Скачать/ })).toBeVisible({
      timeout: 60_000,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Скачать/ }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.png$/);
  });
});
