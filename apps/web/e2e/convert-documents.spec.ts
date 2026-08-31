import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createDocxFile, createPdfFile } from './helpers/files';

test.describe('Конвертация документов', () => {
  test.describe.configure({ timeout: 90_000 });

  test('гость конвертирует DOCX в PDF и скачивает результат', async ({ page }) => {
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
    const filePath = await download.path();
    const bytes = await readFile(String(filePath));

    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('гость конвертирует PDF в DOCX и скачивает результат', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'PDF → DOCX' }).click();
    await page.getByLabel('Выбрать файл для конвертации').setInputFiles(createPdfFile());
    await page.getByRole('button', { name: 'Конвертировать' }).click();

    await expect(page.getByRole('button', { name: /Скачать/ })).toBeVisible({
      timeout: 60_000,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Скачать/ }).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    const bytes = await readFile(String(filePath));

    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.docx$/);
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  });
});
