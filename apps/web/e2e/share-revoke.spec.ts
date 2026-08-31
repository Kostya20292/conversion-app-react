import { expect, test } from '@playwright/test';
import { registerAccount } from './helpers/auth';
import { convertJpegToPng } from './helpers/convert';

test.describe('Отзыв share-ссылки из ЛК', () => {
  test.describe.configure({ timeout: 90_000 });

  test('владелец отзывает ссылку в ЛК — получатель видит, что она недоступна', async ({ page }) => {
    await registerAccount(page);
    await convertJpegToPng(page);

    await page.getByRole('button', { name: /Поделиться/ }).click();
    const shareUrl = await page.getByRole('link', { name: /\/s\// }).getAttribute('href');
    expect(shareUrl).toBeTruthy();

    await page.getByRole('link', { name: 'ЛК' }).click();
    await expect(page).toHaveURL(/\/account/);

    await page
      .getByRole('region', { name: 'Активные ссылки' })
      .getByRole('button', { name: 'Отозвать' })
      .click();
    await expect(page.getByRole('heading', { name: 'Отозвать ссылку?' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Отозвать' }).click();
    await expect(
      page.getByRole('region', { name: 'Активные ссылки' }).getByText('Активных ссылок нет'),
    ).toBeVisible();

    const guestPage = await page.context().newPage();
    await guestPage.goto(shareUrl ?? '');
    await expect(
      guestPage.getByRole('heading', { name: 'Ссылка больше недоступна' }),
    ).toBeVisible();
  });
});
