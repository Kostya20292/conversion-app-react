import { expect, type Page } from '@playwright/test';
import { createJpegFile } from './files';

export const convertJpegToPng = async (
  page: Page,
  file: ReturnType<typeof createJpegFile> = createJpegFile(),
): Promise<void> => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'JPG → PNG' }).click();
  await page.getByLabel('Выбрать файл для конвертации').setInputFiles(file);
  await page.getByRole('button', { name: 'Конвертировать' }).click();
  await expect(page.getByRole('button', { name: /Скачать/ })).toBeVisible({
    timeout: 60_000,
  });
};
