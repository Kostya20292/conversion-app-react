import { expect, test } from '@playwright/test';
import { registerAccount } from './helpers/auth';
import { convertJpegToPng } from './helpers/convert';
import { createJpegFile } from './helpers/files';

test.describe('Сохранение в профиле', () => {
  test.describe.configure({ timeout: 90_000 });

  test('включённое сохранение кладёт сконвертированный файл в ЛК', async ({ page }) => {
    await registerAccount(page);

    const saveToggle = page.getByRole('switch', { name: 'Сохранять конвертации в профиле' });
    await saveToggle.check();
    await expect(saveToggle).toBeChecked();
    await expect(saveToggle).toBeEnabled();

    await convertJpegToPng(page);
    await page.goto('/account');

    const files = page.getByRole('region', { name: 'Сохранённые файлы' });
    await expect(files.getByText('photo.png')).toBeVisible();
    await expect(files.getByText('UI', { exact: true })).toBeVisible();
  });

  test('выключение сохранения не удаляет старые файлы и не пишет новые', async ({ page }) => {
    await registerAccount(page);

    const saveToggle = page.getByRole('switch', { name: 'Сохранять конвертации в профиле' });
    await saveToggle.check();
    await expect(saveToggle).toBeEnabled();

    await convertJpegToPng(page);
    await page.goto('/account');
    await expect(
      page.getByRole('region', { name: 'Сохранённые файлы' }).getByText('photo.png'),
    ).toBeVisible();

    await saveToggle.uncheck();
    await expect(saveToggle).not.toBeChecked();
    await expect(saveToggle).toBeEnabled();

    await convertJpegToPng(page, { ...createJpegFile(), name: 'second.jpg' });
    await page.goto('/account');

    const files = page.getByRole('region', { name: 'Сохранённые файлы' });
    await expect(files.getByText('photo.png')).toBeVisible();
    await expect(files.getByText('second.png')).toHaveCount(0);
  });
});
