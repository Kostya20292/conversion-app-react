import { expect, test } from '@playwright/test';
import { createJpegFile } from './helpers/files';

test.describe('Share-ссылка', () => {
  test.describe.configure({ timeout: 90_000 });

  test('истёкшая ссылка больше недоступна', async ({ page }) => {
    await page.goto('/s/expired');

    await expect(page.getByRole('heading', { name: 'Ссылка больше недоступна' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Сконвертировать свой файл' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  test('получатель открывает ссылку без входа и скачивает файл', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'JPG → PNG' }).click();
    await page.getByLabel('Выбрать файл для конвертации').setInputFiles(createJpegFile());
    await page.getByRole('button', { name: 'Конвертировать' }).click();
    await expect(page.getByRole('button', { name: /Скачать/ })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole('button', { name: /Поделиться/ }).click();
    const shareUrl = await page.getByRole('link', { name: /\/s\// }).getAttribute('href');
    expect(shareUrl).toBeTruthy();

    const guestPage = await page.context().newPage();
    await guestPage.goto(shareUrl ?? '');
    await expect(guestPage.getByText('Вход не нужен')).toBeVisible();

    const downloadPromise = guestPage.waitForEvent('download');
    await guestPage.getByRole('button', { name: /Скачать/ }).click();
    await downloadPromise;
  });
});
